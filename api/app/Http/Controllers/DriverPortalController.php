<?php

namespace App\Http\Controllers;

use App\MultiPickup\Models\RiderCapacity;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Models\Vehicle;
use Fleetbase\Models\Company;
use Fleetbase\Models\CompanyUser;
use Fleetbase\Models\Role;
use Fleetbase\Models\Setting;
use Fleetbase\Models\User;
use Fleetbase\Models\VerificationCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class DriverPortalController extends Controller
{
    public function context(string $publicId): JsonResponse
    {
        $portal = $this->resolvePortalContext($publicId);

        return response()->json([
            'portal' => [
                'public_id' => $publicId,
                'company' => [
                    'uuid' => $portal['company']->uuid,
                    'public_id' => $portal['company']->public_id,
                    'name' => $portal['company']->name,
                    'phone' => $portal['company']->phone,
                ],
                'driver' => $portal['driver'] ? [
                    'uuid' => $portal['driver']->uuid,
                    'public_id' => $portal['driver']->public_id,
                    'name' => $portal['driver']->name,
                    'phone' => $portal['driver']->phone,
                ] : null,
                'onboard_settings' => $this->driverOnboardSettings($portal['company']),
            ],
        ]);
    }

    public function requestCode(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'public_id' => 'required|string|max:120',
            'identity' => 'required|string|max:190',
        ]);

        $portal = $this->resolvePortalContext($payload['public_id']);
        $driver = $this->resolvePortalDriver($portal, $payload['identity']);

        if (!$driver) {
            return response()->json(['error' => 'No driver found with that identity for this portal.'], 404);
        }

        $user = $driver->user;
        VerificationCode::where('subject_uuid', $user->uuid)->where('for', 'driver_portal_login')->delete();

        $verification = VerificationCode::generateFor($user, 'driver_portal_login', false);
        $verification->expires_at = now()->addMinutes(10);
        $verification->meta = [
            'company_uuid' => $driver->company_uuid,
            'driver_uuid' => $driver->uuid,
            'portal_public_id' => $payload['public_id'],
        ];
        $verification->save();

        return response()->json([
            'ok' => true,
            'delivery_method' => app()->environment('production') ? 'sms' : 'preview',
            'expires_at' => $verification->expires_at?->toIso8601String(),
            'preview_code' => app()->environment('production') ? null : (string) $verification->code,
            'driver' => [
                'public_id' => $driver->public_id,
                'name' => $driver->name,
            ],
        ]);
    }

    public function apply(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'public_id' => 'required|string|max:120',
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190',
            'phone' => 'required|string|max:40',
            'drivers_license_number' => 'nullable|string|max:120',
            'notes' => 'nullable|string|max:500',
        ]);

        $portal = $this->resolvePortalContext($payload['public_id']);

        if ($portal['driver']) {
            return response()->json(['error' => 'This link is scoped to an existing rider. Use the fleet join link to apply as a new driver.'], 422);
        }

        $company = $portal['company'];
        $user = User::where('email', $payload['email'])->orWhere('phone', $this->normalizePhone($payload['phone']))->first();

        if (!$user) {
            $user = new User();
            $user->uuid = (string) Str::uuid();
            $user->password = Str::password(16);
        }

        $user->name = $payload['name'];
        $user->email = $payload['email'];
        $user->phone = $payload['phone'];
        $user->company_uuid = $company->uuid;
        $user->status = 'active';
        $user->save();
        $user->setType('driver');

        $companyUser = CompanyUser::firstOrCreate(
            [
                'company_uuid' => $company->uuid,
                'user_uuid' => $user->uuid,
            ],
            [
                'uuid' => (string) Str::uuid(),
                'status' => 'pending',
            ]
        );

        $companyUser->status = 'pending';
        $companyUser->save();

        $role = $this->resolveDriverRole($company);
        if ($role) {
            $companyUser->assignSingleRole($role->name);
        }

        $driver = Driver::firstOrCreate(
            [
                'company_uuid' => $company->uuid,
                'user_uuid' => $user->uuid,
            ],
            [
                'uuid' => (string) Str::uuid(),
                'slug' => $user->slug ?: Str::slug($user->name . '-' . Str::random(4)),
            ]
        );

        $driver->slug = $driver->slug ?: ($user->slug ?: Str::slug($user->name . '-' . Str::random(4)));
        $driver->status = 'pending_approval';
        $driver->online = false;
        $driver->drivers_license_number = $payload['drivers_license_number'] ?? $driver->drivers_license_number;
        $driverMeta = is_array($driver->meta) ? $driver->meta : [];
        $driverMeta['portal_application'] = array_merge(
            data_get($driverMeta, 'portal_application', []),
            [
                'applied_at' => now()->toIso8601String(),
                'notes' => $payload['notes'] ?? null,
                'source' => 'driver-portal',
            ]
        );
        $driver->meta = $driverMeta;
        $driver->save();

        return response()->json([
            'ok' => true,
            'message' => 'Application received. Dispatch can review and approve this rider before full access is unlocked.',
            'driver' => [
                'public_id' => $driver->public_id,
                'name' => $driver->name,
                'status' => $driver->status,
            ],
        ]);
    }

    public function verifyCode(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'public_id' => 'required|string|max:120',
            'identity' => 'required|string|max:190',
            'code' => 'required|string|max:12',
        ]);

        $portal = $this->resolvePortalContext($payload['public_id']);
        $driver = $this->resolvePortalDriver($portal, $payload['identity']);

        if (!$driver) {
            return response()->json(['error' => 'No driver found with that identity for this portal.'], 404);
        }

        $user = $driver->user;
        $verification = VerificationCode::where('subject_uuid', $user->uuid)
            ->where('for', 'driver_portal_login')
            ->where('code', $payload['code'])
            ->first();

        $isExpired = !$verification || ($verification->expires_at && Carbon::parse($verification->expires_at)->isPast());

        if ($isExpired) {
            return response()->json(['error' => 'Invalid or expired verification code.'], 422);
        }

        $user->company_uuid = $driver->company_uuid;
        $user->save();

        $token = $user->createToken($driver->uuid);
        $verification->delete();

        return response()->json([
            'ok' => true,
            'token' => $token->plainTextToken,
            'driver' => $this->serializeDriverSnapshot($driver->fresh(['user', 'vehicle', 'currentOrder.payload'])),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $driver = $this->resolveAuthenticatedDriver($request);

        if (!$driver) {
            return response()->json(['error' => 'Driver profile not found for the authenticated user.'], 404);
        }

        return response()->json([
            'driver' => $this->serializeDriverSnapshot($driver),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $driver = $this->resolveAuthenticatedDriver($request);

        if (!$driver) {
            return response()->json(['error' => 'Driver profile not found for the authenticated user.'], 404);
        }

        $payload = $request->validate([
            'public_id' => 'nullable|string|max:120',
            'name' => 'nullable|string|max:120',
            'phone' => 'nullable|string|max:40',
            'email' => 'nullable|email|max:190',
            'drivers_license_number' => 'nullable|string|max:120',
        ]);

        $user = $driver->user;
        if ($user) {
            foreach (['name', 'phone', 'email'] as $field) {
                if (array_key_exists($field, $payload)) {
                    $user->{$field} = $payload[$field];
                }
            }
            $user->save();
        }

        if (array_key_exists('drivers_license_number', $payload)) {
            $driver->drivers_license_number = $payload['drivers_license_number'];
        }

        $driver->save();

        return response()->json([
            'ok' => true,
            'driver' => $this->serializeDriverSnapshot($driver->fresh(['user', 'vehicle', 'currentOrder.payload'])),
        ]);
    }

    public function updatePayoutProfile(Request $request): JsonResponse
    {
        $driver = $this->resolveAuthenticatedDriver($request);

        if (!$driver) {
            return response()->json(['error' => 'Driver profile not found for the authenticated user.'], 404);
        }

        $payload = $request->validate([
            'public_id' => 'nullable|string|max:120',
            'method' => 'nullable|string|max:60',
            'account_name' => 'required|string|max:120',
            'payout_email' => 'nullable|email|max:190',
            'account_number' => 'required|string|max:60',
            'country_code' => 'required|string|size:2',
            'bank_id' => 'nullable|string|max:40',
            'bank_code' => 'required|string|max:40',
            'bank_name' => 'required|string|max:120',
            'provider_type' => 'nullable|string|max:60',
            'branch_code' => 'nullable|string|max:80',
            'branch_name' => 'nullable|string|max:120',
            'swift_code' => 'nullable|string|max:40',
            'routing_number' => 'nullable|string|max:40',
        ]);

        $country = strtoupper((string) $payload['country_code']);
        $method = $this->resolvePayoutMethod($payload['method'] ?? null, $payload['provider_type'] ?? null);

        if ($method !== 'mobile_money' && $this->countryRequiresBranch($country) && blank($payload['branch_code'] ?? null)) {
            return response()->json(['error' => 'A bank branch is required for payout profiles in this country.'], 422);
        }

        if ($method !== 'mobile_money' && $this->countryRequiresRoutingNumber($country) && blank($payload['routing_number'] ?? null)) {
            return response()->json(['error' => 'A routing number is required for payout profiles in this country.'], 422);
        }

        if ($method !== 'mobile_money' && $this->countryRequiresSwift($country) && blank($payload['swift_code'] ?? null)) {
            return response()->json(['error' => 'A SWIFT code is required for payout profiles in this country.'], 422);
        }

        $driverMeta = is_array($driver->meta) ? $driver->meta : [];
        $driverMeta['payout_profile'] = [
            'method' => $method,
            'account_name' => trim((string) $payload['account_name']),
            'payout_email' => $payload['payout_email'] ?? $driver->email,
            'account_number' => trim((string) $payload['account_number']),
            'country_code' => $country,
            'country' => $country,
            'bank_id' => $payload['bank_id'] ?? null,
            'bank_code' => trim((string) $payload['bank_code']),
            'account_bank' => trim((string) $payload['bank_code']),
            'bank_name' => trim((string) $payload['bank_name']),
            'provider_type' => $payload['provider_type'] ?? null,
            'branch_code' => $payload['branch_code'] ?? null,
            'branch_name' => $payload['branch_name'] ?? null,
            'swift_code' => $payload['swift_code'] ?? null,
            'routing_number' => $payload['routing_number'] ?? null,
            'business_name' => trim((string) $payload['account_name']),
            'business_email' => $payload['payout_email'] ?? $driver->email,
            'business_mobile' => $driver->phone,
            'business_contact' => $driver->name,
            'business_contact_mobile' => $driver->phone,
            'sync_status' => 'pending_medusa_sync',
            'updated_at' => now()->toIso8601String(),
            'medusa_recipient_id' => data_get($driverMeta, 'payout_profile.medusa_recipient_id'),
        ];
        $driver->meta = $driverMeta;
        $driver->save();

        return response()->json([
            'ok' => true,
            'driver' => $this->serializeDriverSnapshot($driver->fresh(['user', 'vehicle', 'currentOrder.payload'])),
        ]);
    }

    public function payoutOptions(Request $request): JsonResponse
    {
        $driver = $this->resolveAuthenticatedDriver($request);

        if (!$driver) {
            return response()->json(['error' => 'Driver profile not found for the authenticated user.'], 404);
        }

        $payload = $request->validate([
            'country' => 'required|string|size:2',
        ]);

        $country = strtoupper((string) $payload['country']);
        $secret = (string) env('FLUTTERWAVE_SECRET_KEY');
        $baseUrl = rtrim((string) env('FLUTTERWAVE_BASE_URL', 'https://api.flutterwave.com/v3'), '/');

        if (blank($secret)) {
            return response()->json(['error' => 'Flutterwave secret key is not configured yet.'], 422);
        }

        $cacheKey = sprintf('flutterwave:banks:%s', $country);
        $banks = Cache::get($cacheKey);

        if (!$banks) {
            $response = Http::withToken($secret)
                ->acceptJson()
                ->get(sprintf('%s/banks/%s', $baseUrl, $country), [
                    'include_provider_type' => 1,
                ]);

            if ($response->failed()) {
                return response()->json([
                    'error' => 'Unable to fetch Flutterwave payout institutions for that country.',
                    'details' => $response->json('message'),
                ], 422);
            }

            $banks = collect($response->json('data', []))
                ->map(fn (array $bank) => [
                    'id' => data_get($bank, 'id'),
                    'code' => (string) data_get($bank, 'code'),
                    'name' => (string) data_get($bank, 'name'),
                    'provider_type' => data_get($bank, 'provider_type', 'bank'),
                ])
                ->sortBy('name')
                ->values()
                ->all();

            Cache::put($cacheKey, $banks, now()->addHours(12));
        }

        return response()->json([
            'country' => $country,
            'institutions' => $banks,
            'requirements' => $this->payoutRequirementsForCountry($country),
        ]);
    }

    public function payoutBranches(Request $request): JsonResponse
    {
        $driver = $this->resolveAuthenticatedDriver($request);

        if (!$driver) {
            return response()->json(['error' => 'Driver profile not found for the authenticated user.'], 404);
        }

        $payload = $request->validate([
            'country' => 'required|string|size:2',
            'bank_id' => 'required|string|max:40',
        ]);

        $country = strtoupper((string) $payload['country']);
        $secret = (string) env('FLUTTERWAVE_SECRET_KEY');
        $baseUrl = rtrim((string) env('FLUTTERWAVE_BASE_URL', 'https://api.flutterwave.com/v3'), '/');

        if (blank($secret)) {
            return response()->json(['error' => 'Flutterwave secret key is not configured yet.'], 422);
        }

        if (!$this->countryRequiresBranch($country)) {
            return response()->json([
                'country' => $country,
                'branches' => [],
            ]);
        }

        $cacheKey = sprintf('flutterwave:branches:%s:%s', $country, $payload['bank_id']);
        $branches = Cache::get($cacheKey);

        if (!$branches) {
            $response = Http::withToken($secret)
                ->acceptJson()
                ->get(sprintf('%s/banks/%s/branches', $baseUrl, $payload['bank_id']));

            if ($response->failed()) {
                return response()->json([
                    'error' => 'Unable to fetch Flutterwave bank branches for that institution.',
                    'details' => $response->json('message'),
                ], 422);
            }

            $branches = collect($response->json('data', []))
                ->map(fn (array $branch) => [
                    'id' => data_get($branch, 'id'),
                    'code' => (string) data_get($branch, 'branch_code', data_get($branch, 'code')),
                    'name' => (string) data_get($branch, 'branch_name', data_get($branch, 'name')),
                ])
                ->values()
                ->all();

            Cache::put($cacheKey, $branches, now()->addHours(12));
        }

        return response()->json([
            'country' => $country,
            'branches' => $branches,
        ]);
    }

    public function toggleOnline(Request $request): JsonResponse
    {
        $driver = $this->resolveAuthenticatedDriver($request);

        if (!$driver) {
            return response()->json(['error' => 'Driver profile not found for the authenticated user.'], 404);
        }

        if (!$this->driverIsApproved($driver)) {
            return response()->json(['error' => 'This rider is still pending approval and cannot go online yet.'], 422);
        }

        $payload = $request->validate([
            'public_id' => 'nullable|string|max:120',
            'online' => 'nullable|boolean',
        ]);

        $driver->online = array_key_exists('online', $payload) ? (bool) $payload['online'] : !$driver->online;
        $driver->saveQuietly();

        if ($driver->vehicle) {
            $driver->vehicle->online = $driver->online;
            $driver->vehicle->saveQuietly();
        }

        return response()->json([
            'ok' => true,
            'driver' => $this->serializeDriverSnapshot($driver->fresh(['user', 'vehicle', 'currentOrder.payload'])),
        ]);
    }

    public function updateVehicle(Request $request): JsonResponse
    {
        $driver = $this->resolveAuthenticatedDriver($request);

        if (!$driver) {
            return response()->json(['error' => 'Driver profile not found for the authenticated user.'], 404);
        }

        $payload = $request->validate([
            'public_id' => 'nullable|string|max:120',
            'name' => 'nullable|string|max:120',
            'make' => 'nullable|string|max:80',
            'model' => 'nullable|string|max:80',
            'year' => 'nullable|integer|min:1900|max:2100',
            'plate_number' => 'nullable|string|max:40',
            'color' => 'nullable|string|max:40',
            'type' => 'nullable|string|max:80',
            'notes' => 'nullable|string|max:500',
            'replace_pending' => 'nullable|boolean',
        ]);

        [$activeVehicle, $pendingVehicle] = $this->splitDriverVehicles($driver);
        $replacePending = (bool) ($payload['replace_pending'] ?? false);

        if ($replacePending && $pendingVehicle) {
            $pendingVehicle->delete();
            $pendingVehicle = null;
        }

        $vehicle = $pendingVehicle;

        if (!$vehicle) {
            $vehicle = new Vehicle();
            $vehicle->company_uuid = $driver->company_uuid;
            $vehicle->status = 'pending_review';
            $vehicle->online = false;
        }

        foreach (['make', 'model', 'year', 'plate_number', 'color', 'type', 'notes'] as $field) {
            if (array_key_exists($field, $payload)) {
                $vehicle->{$field} = $payload[$field];
            }
        }

        $vehicle->name = $payload['name'] ?? $vehicle->name ?? trim(implode(' ', array_filter([
            $payload['year'] ?? $vehicle->year,
            $payload['make'] ?? $vehicle->make,
            $payload['model'] ?? $vehicle->model,
            $payload['plate_number'] ?? $vehicle->plate_number,
        ]))) ?: ($driver->name . ' vehicle');

        $vehicleMeta = is_array($vehicle->meta) ? $vehicle->meta : [];
        $vehicleMeta['portal_application'] = array_merge(
            data_get($vehicleMeta, 'portal_application', []),
            [
                'submitted_by_driver_uuid' => $driver->uuid,
                'submitted_at' => now()->toIso8601String(),
                'requested_change' => filled($activeVehicle?->uuid),
            ]
        );
        $vehicle->meta = $vehicleMeta;
        $vehicle->save();

        $driverMeta = is_array($driver->meta) ? $driver->meta : [];
        $driverMeta['pending_vehicle_uuid'] = $vehicle->uuid;
        $driver->meta = $driverMeta;
        $driver->save();

        return response()->json([
            'ok' => true,
            'driver' => $this->serializeDriverSnapshot($driver->fresh(['user', 'vehicle', 'currentOrder.payload'])),
        ]);
    }

    protected function resolvePortalContext(string $publicId): array
    {
        $company = Company::where('public_id', $publicId)->first();
        if ($company) {
            return ['company' => $company, 'driver' => null];
        }

        $driver = Driver::with('user')->where('public_id', $publicId)->firstOrFail();
        $company = Company::where('uuid', $driver->company_uuid)->firstOrFail();

        return ['company' => $company, 'driver' => $driver];
    }

    protected function resolvePortalDriver(array $portal, string $identity): ?Driver
    {
        $query = Driver::with(['user', 'vehicle', 'currentOrder.payload'])
            ->where('company_uuid', $portal['company']->uuid)
            ->whereNull('deleted_at');

        if ($portal['driver']) {
            $query->where('uuid', $portal['driver']->uuid);
        }

        $normalizedPhone = $this->normalizePhone($identity);

        return $query->whereHas('user', function ($userQuery) use ($identity, $normalizedPhone) {
            $userQuery->where('email', $identity)->orWhere('phone', $normalizedPhone);
        })->first();
    }

    protected function resolveAuthenticatedDriver(Request $request): ?Driver
    {
        $user = $request->user();
        if (!$user instanceof User) {
            return null;
        }

        $publicId = $request->input('public_id', $request->query('public_id'));
        $portal = $publicId ? $this->resolvePortalContext($publicId) : null;

        $driverQuery = Driver::with(['user', 'vehicle', 'currentOrder.payload'])
            ->where('user_uuid', $user->uuid)
            ->whereNull('deleted_at');

        if ($portal) {
            $driverQuery->where('company_uuid', $portal['company']->uuid);
        } elseif ($user->company_uuid) {
            $driverQuery->where('company_uuid', $user->company_uuid);
        }

        $driver = $driverQuery->first();

        if (!$driver) {
            $driver = Driver::with(['user', 'vehicle', 'currentOrder.payload'])
                ->where('user_uuid', $user->uuid)
                ->whereNull('deleted_at')
                ->first();
        }

        return $driver;
    }

    protected function serializeDriverSnapshot(Driver $driver): array
    {
        $driver->loadMissing(['user', 'vehicle', 'currentOrder.payload']);
        $currentOrder = $driver->getCurrentOrder();
        $activeOrders = $driver->orders()
            ->whereNotIn('status', ['completed', 'cancelled', 'canceled', 'failed'])
            ->orderByDesc('created_at')
            ->limit(6)
            ->get();
        $deliveredOrders = $driver->orders()
            ->where('status', 'completed')
            ->orderByDesc('updated_at')
            ->limit(20)
            ->get();
        $allDeliveredOrders = $driver->orders()
            ->where('status', 'completed')
            ->get();
        $payoutBatches = $this->payoutBatchesForDriver($driver->uuid);
        $batchedOrderUuids = $this->batchedOrderUuids($payoutBatches);
        $unpaidDeliveredOrders = $allDeliveredOrders->reject(fn (Order $order) => in_array($order->uuid, $batchedOrderUuids, true))->values();
        $payoutProfile = $this->serializePayoutProfile(data_get($driver->meta, 'payout_profile', []));

        $freeSlots = RiderCapacity::freeSlots($driver->uuid);
        $maxPackages = (int) config('commission.max_packages_per_rider', 3);
        $activePackages = max(0, $maxPackages - $freeSlots);
        $isApproved = $this->driverIsApproved($driver);
        $applicationMeta = data_get($driver->meta, 'portal_application', []);
        [$activeVehicle, $pendingVehicle] = $this->splitDriverVehicles($driver);

        return [
            'uuid' => $driver->uuid,
            'public_id' => $driver->public_id,
            'name' => $driver->name,
            'email' => $driver->email,
            'phone' => $driver->phone,
            'status' => $driver->status,
            'approval_status' => $isApproved ? 'approved' : 'pending_approval',
            'is_approved' => $isApproved,
            'online' => (bool) $driver->online,
            'avatar_url' => $driver->avatar_url,
            'photo_url' => $driver->photo_url,
            'drivers_license_number' => $driver->drivers_license_number,
            'application' => [
                'applied_at' => data_get($applicationMeta, 'applied_at'),
                'approved_at' => data_get($applicationMeta, 'approved_at'),
                'notes' => data_get($applicationMeta, 'notes'),
            ],
            'vehicle' => $activeVehicle ? [
                'uuid' => $activeVehicle->uuid,
                'public_id' => $activeVehicle->public_id,
                'name' => $activeVehicle->name,
                'label' => trim(implode(' ', array_filter([
                    $activeVehicle->year,
                    $activeVehicle->make,
                    $activeVehicle->model,
                    $activeVehicle->plate_number,
                ]))),
                'plate_number' => $activeVehicle->plate_number,
                'make' => $activeVehicle->make,
                'model' => $activeVehicle->model,
                'year' => $activeVehicle->year,
                'color' => $activeVehicle->color,
                'type' => $activeVehicle->type,
                'notes' => $activeVehicle->notes,
                'status' => $activeVehicle->status,
            ] : null,
            'pending_vehicle' => $pendingVehicle ? [
                'uuid' => $pendingVehicle->uuid,
                'public_id' => $pendingVehicle->public_id,
                'name' => $pendingVehicle->name,
                'label' => trim(implode(' ', array_filter([
                    $pendingVehicle->year,
                    $pendingVehicle->make,
                    $pendingVehicle->model,
                    $pendingVehicle->plate_number,
                ]))),
                'plate_number' => $pendingVehicle->plate_number,
                'make' => $pendingVehicle->make,
                'model' => $pendingVehicle->model,
                'year' => $pendingVehicle->year,
                'color' => $pendingVehicle->color,
                'type' => $pendingVehicle->type,
                'notes' => $pendingVehicle->notes,
                'status' => $pendingVehicle->status,
                'submitted_at' => data_get($pendingVehicle->meta, 'portal_application.submitted_at'),
            ] : null,
            'capacity' => [
                'max' => $maxPackages,
                'active' => $activePackages,
                'free_slots' => $freeSlots,
            ],
            'checklist' => [
                [
                    'key' => 'phone',
                    'label' => 'Phone number on file',
                    'complete' => filled($driver->phone),
                ],
                [
                    'key' => 'license',
                    'label' => 'Driver license added',
                    'complete' => filled($driver->drivers_license_number),
                ],
                [
                    'key' => 'vehicle',
                    'label' => 'Approved vehicle assigned',
                    'complete' => filled($activeVehicle?->uuid),
                ],
                [
                    'key' => 'approval',
                    'label' => 'Dispatch approval completed',
                    'complete' => $isApproved,
                ],
            ],
            'current_order' => $isApproved && $currentOrder ? $this->serializeOrder($currentOrder) : null,
            'active_orders' => $isApproved ? $activeOrders->map(fn (Order $order) => $this->serializeOrder($order))->all() : [],
            'delivered_orders' => $isApproved ? $deliveredOrders->map(fn (Order $order) => $this->serializeDeliveredOrder($order, $payoutBatches))->all() : [],
            'earnings' => $isApproved ? $this->serializeDriverEarnings($allDeliveredOrders, $unpaidDeliveredOrders, $payoutBatches) : null,
            'payout_profile' => $payoutProfile,
            'payout_batches' => $isApproved ? $this->serializePayoutBatches($payoutBatches) : [],
        ];
    }

    protected function splitDriverVehicles(Driver $driver): array
    {
        $driver->loadMissing('vehicle');

        $activeVehicle = $driver->vehicle;
        $pendingVehicle = null;
        $pendingVehicleUuid = data_get($driver->meta, 'pending_vehicle_uuid');

        if (filled($pendingVehicleUuid)) {
            $pendingVehicle = Vehicle::where('company_uuid', $driver->company_uuid)
                ->where('uuid', $pendingVehicleUuid)
                ->whereNull('deleted_at')
                ->first();
        }

        if ($pendingVehicle && $pendingVehicle->status !== 'pending_review') {
            $pendingVehicle = null;
        }

        if ($activeVehicle && $activeVehicle->status === 'pending_review') {
            $pendingVehicle = $pendingVehicle ?: $activeVehicle;
            $activeVehicle = null;
        }

        if ($activeVehicle && $pendingVehicle && $activeVehicle->uuid === $pendingVehicle->uuid) {
            $activeVehicle = null;
        }

        return [$activeVehicle, $pendingVehicle];
    }

    protected function serializeOrder(Order $order): array
    {
        $order->loadMissing(['payload', 'customer']);
        $payload = $order->payload;
        $orderMeta = is_array($order->meta) ? $order->meta : [];
        $customer = data_get($orderMeta, 'customer', []);
        $pickup = data_get($orderMeta, 'pickup', []);
        $dropoff = data_get($orderMeta, 'dropoff', []);

        return [
            'uuid' => $order->uuid,
            'public_id' => $order->public_id,
            'status' => $order->status,
            'stage' => $this->serializeOrderStage($order),
            'customer_name' => data_get($order, 'customer.name') ?? data_get($customer, 'name'),
            'customer_phone' => data_get($order, 'customer.phone') ?? data_get($customer, 'phone'),
            'pickup_name' => data_get($payload, 'pickup_name') ?? data_get($pickup, 'name') ?? data_get($pickup, 'address_line_1'),
            'pickup_address' => data_get($pickup, 'address_line_1'),
            'pickup_city' => data_get($pickup, 'city'),
            'dropoff_name' => data_get($payload, 'dropoff_name') ?? data_get($dropoff, 'name') ?? data_get($dropoff, 'address_line_1'),
            'dropoff_address' => data_get($dropoff, 'address_line_1'),
            'dropoff_city' => data_get($dropoff, 'city'),
            'notes' => $order->notes,
            'tracking_url' => $this->trackingBaseUrl() . '/track?' . http_build_query([
                'order_id' => $order->public_id,
                'display_id' => $order->public_id,
                'merchant' => 'Merchant',
            ]),
            'created_at' => $this->toIso8601String($order->created_at),
            'updated_at' => $this->toIso8601String($order->updated_at),
        ];
    }

    protected function serializeDeliveredOrder(Order $order, $payoutBatches): array
    {
        $serialized = $this->serializeOrder($order);
        $orderMeta = is_array($order->meta) ? $order->meta : [];
        $deliveryAmount = $this->deliveryAmountForOrder($orderMeta);
        $driverEarnings = $this->driverEarningsForAmount($deliveryAmount);
        $payoutBatch = $this->payoutBatchForOrder($order->uuid, $payoutBatches);

        return array_merge($serialized, [
            'delivered_at' => $this->toIso8601String($order->updated_at),
            'delivery_amount' => $deliveryAmount,
            'driver_earnings' => $driverEarnings,
            'payout_status' => $payoutBatch ? (string) $payoutBatch->status : 'unpaid',
        ]);
    }

    protected function serializeDriverEarnings($deliveredOrders, $unpaidDeliveredOrders, $payoutBatches): array
    {
        $payoutDay = strtolower((string) config('commission.payout_day', 'thursday'));
        $cycleStart = $this->currentPayoutCycleStart($payoutDay);
        $nextPayoutAt = $this->nextPayoutCycleStart($payoutDay, $cycleStart);

        $lifetimeTotal = 0;
        $currentCycleTotal = 0;
        $currentCycleCount = 0;
        $queuedPayoutTotal = 0;

        foreach ($deliveredOrders as $order) {
            $orderMeta = is_array($order->meta) ? $order->meta : [];
            $driverEarnings = $this->driverEarningsForAmount($this->deliveryAmountForOrder($orderMeta));
            $lifetimeTotal += $driverEarnings;
        }

        foreach ($unpaidDeliveredOrders as $order) {
            $orderMeta = is_array($order->meta) ? $order->meta : [];
            $driverEarnings = $this->driverEarningsForAmount($this->deliveryAmountForOrder($orderMeta));
            $deliveredAt = Carbon::parse($order->updated_at);
            if ($deliveredAt->greaterThanOrEqualTo($cycleStart)) {
                $currentCycleTotal += $driverEarnings;
                $currentCycleCount++;
            }
        }

        foreach ($payoutBatches as $batch) {
            if (in_array((string) $batch->status, ['queued', 'processing'], true)) {
                $queuedPayoutTotal += (int) $batch->gross_earnings;
            }
        }

        return [
            'currency_code' => 'UGX',
            'lifetime_total' => $lifetimeTotal,
            'current_cycle_unpaid' => $currentCycleTotal,
            'current_cycle_count' => $currentCycleCount,
            'queued_payout_total' => $queuedPayoutTotal,
            'payout_schedule' => (string) config('commission.payout_schedule', 'weekly'),
            'payout_day' => ucfirst($payoutDay),
            'cycle_started_at' => $cycleStart->toIso8601String(),
            'next_payout_at' => $nextPayoutAt->toIso8601String(),
        ];
    }

    protected function serializeOrderStage(Order $order): array
    {
        $stageKey = match (strtolower((string) $order->status)) {
            'completed' => 'delivered',
            'started' => 'on_the_way',
            'dispatched' => 'pickup_in_progress',
            default => 'driver_assigned',
        };

        $stageLabel = match ($stageKey) {
            'delivered' => 'Delivered',
            'on_the_way' => 'On the way',
            'pickup_in_progress' => 'Picking up order',
            default => 'Driver assigned',
        };

        return [
            'key' => $stageKey,
            'label' => $stageLabel,
        ];
    }

    protected function deliveryAmountForOrder(array $orderMeta): int
    {
        return (int) data_get($orderMeta, 'delivery_amount', data_get($orderMeta, 'quote_amount', 0));
    }

    protected function driverEarningsForAmount(int $deliveryAmount): int
    {
        $percentage = (float) config('commission.driver_earnings_percentage', 80);

        return (int) round($deliveryAmount * ($percentage / 100));
    }

    protected function currentPayoutCycleStart(string $payoutDay): Carbon
    {
        $today = now()->startOfDay();
        $cycleStart = $today->copy()->startOfWeek();

        for ($offset = 0; $offset < 7; $offset++) {
            $candidate = $today->copy()->subDays($offset)->startOfDay();
            if (strtolower($candidate->englishDayOfWeek) === $payoutDay) {
                $cycleStart = $candidate;
                break;
            }
        }

        return $cycleStart;
    }

    protected function nextPayoutCycleStart(string $payoutDay, Carbon $currentCycleStart): Carbon
    {
        $next = $currentCycleStart->copy()->addDay()->startOfDay();

        for ($offset = 0; $offset < 7; $offset++) {
            $candidate = $next->copy()->addDays($offset)->startOfDay();
            if (strtolower($candidate->englishDayOfWeek) === $payoutDay) {
                return $candidate;
            }
        }

        return $currentCycleStart->copy()->addWeek();
    }

    protected function payoutBatchesForDriver(string $driverUuid)
    {
        return DB::table('driver_payout_batches')
            ->where('driver_uuid', $driverUuid)
            ->orderByDesc('created_at')
            ->get();
    }

    protected function batchedOrderUuids($payoutBatches): array
    {
        return collect($payoutBatches)
            ->flatMap(function ($batch) {
                $meta = $this->decodeJsonArray($batch->meta ?? null);
                return data_get($meta, 'order_uuids', []);
            })
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    protected function payoutBatchForOrder(string $orderUuid, $payoutBatches)
    {
        return collect($payoutBatches)->first(function ($batch) use ($orderUuid) {
            $meta = $this->decodeJsonArray($batch->meta ?? null);
            return in_array($orderUuid, data_get($meta, 'order_uuids', []), true);
        });
    }

    protected function serializePayoutProfile(array $profile): ?array
    {
        if (blank(data_get($profile, 'account_name')) && blank(data_get($profile, 'bank_code'))) {
            return null;
        }

        return [
            'method' => data_get($profile, 'method'),
            'account_name' => data_get($profile, 'account_name'),
            'payout_email' => data_get($profile, 'payout_email'),
            'account_number' => data_get($profile, 'account_number'),
            'country' => data_get($profile, 'country', data_get($profile, 'country_code')),
            'account_bank' => data_get($profile, 'account_bank', data_get($profile, 'bank_code')),
            'bank_id' => data_get($profile, 'bank_id'),
            'bank_name' => data_get($profile, 'bank_name'),
            'bank_code' => data_get($profile, 'bank_code'),
            'provider_type' => data_get($profile, 'provider_type'),
            'branch_code' => data_get($profile, 'branch_code'),
            'branch_name' => data_get($profile, 'branch_name'),
            'swift_code' => data_get($profile, 'swift_code'),
            'routing_number' => data_get($profile, 'routing_number'),
            'country_code' => data_get($profile, 'country_code'),
            'business_name' => data_get($profile, 'business_name'),
            'business_email' => data_get($profile, 'business_email'),
            'business_mobile' => data_get($profile, 'business_mobile'),
            'business_contact' => data_get($profile, 'business_contact'),
            'business_contact_mobile' => data_get($profile, 'business_contact_mobile'),
            'sync_status' => data_get($profile, 'sync_status', 'pending_medusa_sync'),
            'updated_at' => data_get($profile, 'updated_at'),
            'medusa_recipient_id' => data_get($profile, 'medusa_recipient_id'),
        ];
    }

    protected function resolvePayoutMethod(?string $method, ?string $providerType): string
    {
        if (filled($method)) {
            return (string) $method;
        }

        return $this->providerTypeIndicatesMobileMoney($providerType) ? 'mobile_money' : 'bank_transfer';
    }

    protected function payoutRequirementsForCountry(string $country): array
    {
        return [
            'requires_branch' => $this->countryRequiresBranch($country),
            'requires_swift_code' => $this->countryRequiresSwift($country),
            'requires_routing_number' => $this->countryRequiresRoutingNumber($country),
        ];
    }

    protected function countryRequiresBranch(string $country): bool
    {
        return in_array(strtoupper($country), ['GH', 'TZ', 'RW', 'UG'], true);
    }

    protected function countryRequiresRoutingNumber(string $country): bool
    {
        return strtoupper($country) === 'US';
    }

    protected function countryRequiresSwift(string $country): bool
    {
        $country = strtoupper($country);

        return $country === 'US' || in_array($country, [
            'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR',
            'GB', 'GI', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV',
            'MC', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
        ], true);
    }

    protected function providerTypeIndicatesMobileMoney(?string $providerType): bool
    {
        if (blank($providerType)) {
            return false;
        }

        $normalized = strtolower((string) $providerType);

        return str_contains($normalized, 'mobile') || str_contains($normalized, 'wallet');
    }

    protected function serializePayoutBatches($payoutBatches): array
    {
        return collect($payoutBatches)->take(8)->map(function ($batch) {
            $meta = $this->decodeJsonArray($batch->meta ?? null);

            return [
                'uuid' => $batch->uuid,
                'status' => $batch->status,
                'gross_earnings' => (int) $batch->gross_earnings,
                'order_count' => (int) $batch->order_count,
                'currency_code' => $batch->currency_code,
                'scheduled_for' => $this->toIso8601String($batch->scheduled_for),
                'transferred_at' => $this->toIso8601String($batch->transferred_at),
                'medusa_sync_status' => data_get($meta, 'medusa_sync_status'),
            ];
        })->all();
    }

    protected function decodeJsonArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value) && $value !== '') {
            return json_decode($value, true) ?: [];
        }

        return [];
    }

    protected function driverOnboardSettings(Company $company): array
    {
        $settings = Setting::where('key', 'fleet-ops.driver-onboard-settings.' . $company->uuid)->value('value');

        return is_array($settings) ? $settings : [];
    }

    protected function normalizePhone(string $value): string
    {
        $phone = preg_replace('/\s+/', '', $value);

        if (!Str::startsWith($phone, '+')) {
            $phone = '+' . $phone;
        }

        return $phone;
    }

    protected function resolveDriverRole(Company $company): ?Role
    {
        return Role::query()
            ->where('company_uuid', $company->uuid)
            ->where(function ($query) {
                $query->where('name', 'driver')->orWhere('name', 'Driver');
            })
            ->orderBy('id')
            ->first();
    }

    protected function driverIsApproved(Driver $driver): bool
    {
        return in_array((string) $driver->status, ['active', 'approved'], true);
    }

    protected function toIso8601String(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof Carbon) {
            return $value->toIso8601String();
        }

        return Carbon::parse($value)->toIso8601String();
    }

    protected function trackingBaseUrl(): string
    {
        $request = request();
        if ($request) {
            $schemeAndHost = $request->getSchemeAndHttpHost();
            if (filled($schemeAndHost)) {
                return rtrim($schemeAndHost, '/');
            }
        }

        return rtrim((string) config('app.url'), '/');
    }
}
