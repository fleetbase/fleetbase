<?php

namespace App\Http\Controllers;

use App\MultiPickup\Models\RiderCapacity;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Support\LiveCacheService;
use Fleetbase\FleetOps\Models\Vehicle;
use Fleetbase\Models\Company;
use Fleetbase\Models\CompanyUser;
use Fleetbase\Models\Role;
use Fleetbase\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OpsDashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);

        $orderBaseQuery = DB::table('orders')
            ->where('company_uuid', $company->uuid)
            ->whereNull('deleted_at');

        $driverBaseQuery = DB::table('drivers')
            ->where('company_uuid', $company->uuid)
            ->whereNull('deleted_at');

        $vehicleBaseQuery = DB::table('vehicles')
            ->where('company_uuid', $company->uuid)
            ->whereNull('deleted_at');

        $teamRows = $this->teamRows($company->uuid);
        $driverUuids = (clone $driverBaseQuery)->pluck('uuid')->all();
        $driversAtCapacity = collect($driverUuids)->filter(fn (string $driverUuid) => !RiderCapacity::hasCapacity($driverUuid))->count();

        $summary = [
            'orders' => [
                'total' => (clone $orderBaseQuery)->count(),
                'active' => (clone $orderBaseQuery)->whereNotIn('status', ['completed', 'cancelled', 'canceled', 'failed'])->count(),
                'unassigned' => (clone $orderBaseQuery)->whereNull('driver_assigned_uuid')->count(),
                'completed' => (clone $orderBaseQuery)->where('status', 'completed')->count(),
            ],
            'drivers' => [
                'total' => (clone $driverBaseQuery)->count(),
                'active' => (clone $driverBaseQuery)->where('status', 'active')->count(),
                'pending_approval' => (clone $driverBaseQuery)->where('status', 'pending_approval')->count(),
                'online' => (clone $driverBaseQuery)->where('online', 1)->count(),
                'at_capacity' => $driversAtCapacity,
            ],
            'vehicles' => [
                'total' => (clone $vehicleBaseQuery)->count(),
                'assigned' => (clone $driverBaseQuery)->whereNotNull('vehicle_uuid')->count(),
                'unassigned' => (clone $vehicleBaseQuery)->count() - (clone $driverBaseQuery)->whereNotNull('vehicle_uuid')->count(),
                'in_service' => (clone $vehicleBaseQuery)->whereNotIn('status', ['inactive', 'archived', 'out_of_service'])->count(),
            ],
            'team' => [
                'total' => count($teamRows),
                'administrators' => collect($teamRows)->filter(fn (array $row) => $this->roleKeyForName($row['role_name']) === 'administrator')->count(),
                'dispatchers' => collect($teamRows)->filter(fn (array $row) => $this->roleKeyForName($row['role_name']) === 'dispatcher')->count(),
                'driver_managers' => collect($teamRows)->filter(fn (array $row) => $this->roleKeyForName($row['role_name']) === 'driver_manager')->count(),
            ],
        ];

        $alerts = [
            [
                'tone' => 'warning',
                'label' => 'Orders needing assignment',
                'count' => $summary['orders']['unassigned'],
                'route' => 'console.ops.orders',
            ],
            [
                'tone' => 'warning',
                'label' => 'Drivers at capacity',
                'count' => $summary['drivers']['at_capacity'],
                'route' => 'console.ops.drivers',
            ],
            [
                'tone' => 'info',
                'label' => 'Driver applications awaiting approval',
                'count' => $summary['drivers']['pending_approval'],
                'route' => 'console.ops.drivers',
            ],
            [
                'tone' => 'info',
                'label' => 'Vehicles unassigned',
                'count' => $summary['vehicles']['unassigned'],
                'route' => 'console.ops.vehicles',
            ],
        ];

        $recentOrders = $this->ordersQuery($company->uuid)
            ->limit(5)
            ->get()
            ->map(fn (object $row) => $this->serializeOrderRow($row))
            ->all();

        $liveDeliveries = $this->ordersQuery($company->uuid)
            ->whereIn('o.status', ['dispatched', 'started'])
            ->limit(8)
            ->get()
            ->map(fn (object $row) => $this->serializeOrderRow($row))
            ->all();

        return response()->json([
            'summary' => $summary,
            'alerts' => $alerts,
            'recent_orders' => $recentOrders,
            'live_deliveries' => $liveDeliveries,
            'company' => [
                'uuid' => $company->uuid,
                'name' => $company->name,
            ],
        ]);
    }

    public function listOrders(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $status = $request->query('status');
        $search = trim((string) $request->query('search', ''));
        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(100, max(1, (int) $request->query('per_page', 20)));

        $query = $this->ordersQuery($company->uuid);

        if ($status) {
            $query->where('o.status', $status);
        }

        if ($search !== '') {
            $query->where(function ($subquery) use ($search) {
                $subquery->where('o.public_id', 'like', '%' . $search . '%')
                    ->orWhere('o.notes', 'like', '%' . $search . '%')
                    ->orWhere('u.name', 'like', '%' . $search . '%');
            });
        }

        $total = (clone $query)->count();
        $rows = $query->offset(($page - 1) * $perPage)->limit($perPage)->get();

        return response()->json([
            'orders' => $rows->map(fn (object $row) => $this->serializeOrderRow($row))->all(),
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
            ],
            'drivers' => $this->listAssignableDrivers($company->uuid),
        ]);
    }

    public function showOrder(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $order = $this->findOrderRow($company->uuid, $id);

        if (!$order) {
            return response()->json(['error' => 'Order not found.'], 404);
        }

        return response()->json([
            'order' => $this->serializeOrderRow($order),
        ]);
    }

    public function createOrder(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $actor = $this->resolveActor($request, $company);

        $payload = $request->validate([
            'customer_name' => 'required|string|max:120',
            'customer_phone' => 'nullable|string|max:40',
            'customer_email' => 'nullable|email',
            'pickup.address_line_1' => 'required|string|max:255',
            'pickup.city' => 'required|string|max:120',
            'pickup.country_code' => 'required|string|size:2',
            'pickup.latitude' => 'nullable|numeric',
            'pickup.longitude' => 'nullable|numeric',
            'dropoff.address_line_1' => 'required|string|max:255',
            'dropoff.city' => 'required|string|max:120',
            'dropoff.country_code' => 'required|string|size:2',
            'dropoff.latitude' => 'nullable|numeric',
            'dropoff.longitude' => 'nullable|numeric',
            'notes' => 'nullable|string|max:500',
            'driver_uuid' => 'nullable|string',
        ]);

        $driver = filled($payload['driver_uuid'] ?? null)
            ? $this->findDriver($company->uuid, (string) $payload['driver_uuid'])
            : null;

        if ($driver && !RiderCapacity::hasCapacity($driver->uuid)) {
            return response()->json([
                'error' => 'Selected driver is already at maximum capacity.',
            ], 422);
        }

        $status = $driver ? 'dispatched' : 'created';

        $order = new Order();
        $order->company_uuid = $company->uuid;
        $order->created_by_uuid = $actor->uuid;
        $order->updated_by_uuid = $actor->uuid;
        $order->driver_assigned_uuid = $driver?->uuid;
        $order->vehicle_assigned_uuid = $driver?->vehicle_uuid;
        $order->dispatched = !is_null($driver);
        $order->dispatched_at = $driver ? now() : null;
        $order->type = 'delivery';
        $order->status = $status;
        $order->notes = $payload['notes'] ?? null;
        $order->meta = [
            'source' => 'ops-dashboard',
            'customer' => [
                'name' => $payload['customer_name'],
                'phone' => $payload['customer_phone'] ?? null,
                'email' => $payload['customer_email'] ?? null,
            ],
            'pickup' => $payload['pickup'],
            'dropoff' => $payload['dropoff'],
        ];
        $order->save();

        if ($driver) {
            $driver->current_job_uuid = $order->uuid;
            $driver->save();
            RiderCapacity::addPackage($driver->uuid, $order->uuid);
        }

        return response()->json([
            'ok' => true,
            'order' => $this->serializeOrderRow($this->findOrderRow($company->uuid, $order->uuid)),
        ]);
    }

    public function assignDriver(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $actor = $this->resolveActor($request, $company);
        $order = $this->findOrder($company->uuid, $id);

        if (!$order) {
            return response()->json(['error' => 'Order not found.'], 404);
        }

        $payload = $request->validate([
            'driver_uuid' => 'nullable|string',
        ]);

        $nextDriver = filled($payload['driver_uuid'] ?? null)
            ? $this->findDriver($company->uuid, (string) $payload['driver_uuid'])
            : null;

        if (($nextDriver?->uuid ?? null) !== $order->driver_assigned_uuid && $nextDriver && !RiderCapacity::hasCapacity($nextDriver->uuid)) {
            return response()->json([
                'error' => 'Selected driver is already at maximum capacity.',
            ], 422);
        }

        DB::transaction(function () use ($order, $nextDriver, $actor) {
            if ($order->driver_assigned_uuid && $order->driver_assigned_uuid !== $nextDriver?->uuid) {
                RiderCapacity::removePackage($order->driver_assigned_uuid, $order->uuid);

                $previousDriver = Driver::where('uuid', $order->driver_assigned_uuid)->first();
                if ($previousDriver && $previousDriver->current_job_uuid === $order->uuid) {
                    $previousDriver->current_job_uuid = null;
                    $previousDriver->save();
                }
            }

            $order->driver_assigned_uuid = $nextDriver?->uuid;
            $order->vehicle_assigned_uuid = $nextDriver?->vehicle_uuid;
            $order->updated_by_uuid = $actor->uuid;
            $order->dispatched = !is_null($nextDriver);
            $order->dispatched_at = $nextDriver ? ($order->dispatched_at ?: now()) : null;
            $order->status = $nextDriver ? 'dispatched' : 'created';
            $this->saveOrderWithoutAssignmentNotification($order);

            if ($nextDriver) {
                $nextDriver->current_job_uuid = $order->uuid;
                $nextDriver->save();
                RiderCapacity::addPackage($nextDriver->uuid, $order->uuid);
            }
        });

        return response()->json([
            'ok' => true,
            'order' => $this->serializeOrderRow($this->findOrderRow($company->uuid, $order->uuid)),
        ]);
    }

    public function updateOrderStatus(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $actor = $this->resolveActor($request, $company);
        $order = $this->findOrder($company->uuid, $id);

        if (!$order) {
            return response()->json(['error' => 'Order not found.'], 404);
        }

        $payload = $request->validate([
            'status' => 'required|string|max:40',
        ]);

        $status = strtolower($payload['status']);
        $order->status = $status;
        $order->updated_by_uuid = $actor->uuid;

        if (in_array($status, ['dispatched', 'started'], true)) {
            $order->dispatched = true;
            $order->dispatched_at = $order->dispatched_at ?: now();
        }

        if ($status === 'started') {
            $order->started = true;
            $order->started_at = $order->started_at ?: now();
        }

        if (in_array($status, ['completed', 'cancelled', 'canceled', 'failed'], true) && $order->driver_assigned_uuid) {
            RiderCapacity::removePackage($order->driver_assigned_uuid, $order->uuid);

            $driver = Driver::where('uuid', $order->driver_assigned_uuid)->first();
            if ($driver && $driver->current_job_uuid === $order->uuid) {
                $driver->current_job_uuid = null;
                $driver->save();
            }
        }

        $order->save();

        return response()->json([
            'ok' => true,
            'order' => $this->serializeOrderRow($this->findOrderRow($company->uuid, $order->uuid)),
        ]);
    }

    public function advanceOrderStage(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $order = $this->findOrder($company->uuid, $id);

        if (!$order) {
            return response()->json(['error' => 'Order not found.'], 404);
        }

        $nextStatus = match (strtolower((string) $order->status)) {
            'created' => 'dispatched',
            'dispatched' => 'started',
            'started' => 'completed',
            default => null,
        };

        if (!$nextStatus) {
            return response()->json(['error' => 'This order is already at its final simulated stage.'], 422);
        }

        if ($nextStatus === 'dispatched' && blank($order->driver_assigned_uuid)) {
            return response()->json(['error' => 'Assign a driver before simulating pickup progress.'], 422);
        }

        $stageRequest = new Request(['status' => $nextStatus]);
        $stageRequest->setUserResolver(fn () => $request->user());

        return $this->updateOrderStatus($stageRequest, $id);
    }

    public function listDrivers(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);

        $rows = DB::table('drivers as d')
            ->leftJoin('users as u', 'u.uuid', '=', 'd.user_uuid')
            ->leftJoin('vehicles as v', 'v.uuid', '=', 'd.vehicle_uuid')
            ->where('d.company_uuid', $company->uuid)
            ->whereNull('d.deleted_at')
            ->select([
                'd.uuid',
                'd.public_id',
                'd.user_uuid',
                'd.vehicle_uuid',
                'd.current_job_uuid',
                'd.status',
                'd.online',
                'd.drivers_license_number',
                'd.meta',
                'd.created_at',
                'u.name',
                'u.email',
                'u.phone',
                'v.public_id as vehicle_public_id',
                'v.make as vehicle_make',
                'v.model as vehicle_model',
                'v.plate_number as vehicle_plate_number',
            ])
            ->orderByDesc('d.created_at')
            ->get();

        return response()->json([
            'drivers' => $rows->map(fn (object $row) => $this->serializeDriverRow($row))->all(),
            'vehicles' => $this->listVehiclesForLookup($company->uuid),
            'role_presets' => $this->rolePresetsForCompany($company),
            'portal' => [
                'company_public_id' => $company->public_id,
                'onboarding_url' => rtrim((string) config('app.console_url', config('app.url')), '/') . '/join/fleet/' . $company->public_id,
            ],
        ]);
    }

    public function showDriver(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $driver = $this->findDriverRow($company->uuid, $id);

        if (!$driver) {
            return response()->json(['error' => 'Driver not found.'], 404);
        }

        return response()->json([
            'driver' => $this->serializeDriverRow($driver),
        ]);
    }

    public function createDriver(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $payload = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190',
            'phone' => 'required|string|max:40',
            'status' => 'nullable|string|max:40',
            'role_key' => 'nullable|string|max:40',
            'vehicle_uuid' => 'nullable|string',
        ]);

        $role = $this->resolveRoleFromInput($company, $payload, 'driver');
        $user = User::where('email', $payload['email'])->first();

        if (!$user) {
            $user = new User();
            $user->uuid = (string) Str::uuid();
            $user->password = Str::password(16);
        }

        $user->name = $payload['name'];
        $user->email = $payload['email'];
        $user->phone = $payload['phone'];
        $user->company_uuid = $company->uuid;
        $user->status = $payload['status'] ?? 'active';
        $user->save();
        $user->setType('driver');

        $companyUser = CompanyUser::firstOrCreate(
            [
                'company_uuid' => $company->uuid,
                'user_uuid' => $user->uuid,
            ],
            [
                'uuid' => (string) Str::uuid(),
                'status' => $payload['status'] ?? 'active',
            ]
        );
        $companyUser->status = $payload['status'] ?? 'active';
        $companyUser->save();
        $companyUser->assignSingleRole($role->name);

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
        $driver->status = $payload['status'] ?? 'active';
        $driver->online = $driver->online ?? false;
        $driver->save();

        if (filled($payload['vehicle_uuid'] ?? null)) {
            $vehicle = $this->findVehicle($company->uuid, (string) $payload['vehicle_uuid']);
            if ($vehicle) {
                $driver->assignVehicle($vehicle);
            }
        }

        return response()->json([
            'ok' => true,
            'driver' => $this->serializeDriverRow($this->findDriverRow($company->uuid, $driver->uuid)),
        ]);
    }

    public function updateDriver(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $driver = $this->findDriver($company->uuid, $id);

        if (!$driver) {
            return response()->json(['error' => 'Driver not found.'], 404);
        }

        $payload = $request->validate([
            'name' => 'nullable|string|max:120',
            'email' => 'nullable|email|max:190',
            'phone' => 'nullable|string|max:40',
            'status' => 'nullable|string|max:40',
            'online' => 'nullable|boolean',
        ]);

        $user = $driver->user;
        if ($user) {
            $user->name = $payload['name'] ?? $user->name;
            $user->email = $payload['email'] ?? $user->email;
            $user->phone = $payload['phone'] ?? $user->phone;
            if (filled($payload['status'] ?? null)) {
                $user->status = $payload['status'];
            }
            $user->save();
        }

        if (filled($payload['status'] ?? null)) {
            $driver->status = $payload['status'];
        }

        if (array_key_exists('online', $payload)) {
            $driver->online = (bool) $payload['online'];
        }

        $driver->save();

        if (filled($payload['status'] ?? null)) {
            $companyUser = CompanyUser::where('company_uuid', $company->uuid)
                ->where('user_uuid', $driver->user_uuid)
                ->first();

            if ($companyUser) {
                $companyUser->status = in_array($payload['status'], ['active', 'approved'], true) ? 'active' : $payload['status'];
                $companyUser->save();
            }

            $driverMeta = is_array($driver->meta) ? $driver->meta : [];
            if (in_array($payload['status'], ['active', 'approved'], true)) {
                $driverMeta['portal_application'] = array_merge(
                    data_get($driverMeta, 'portal_application', []),
                    ['approved_at' => data_get($driverMeta, 'portal_application.approved_at') ?: now()->toIso8601String()]
                );
                $driver->meta = $driverMeta;
                $driver->save();
            }
        }

        return response()->json([
            'ok' => true,
            'driver' => $this->serializeDriverRow($this->findDriverRow($company->uuid, $driver->uuid)),
        ]);
    }

    public function setDriverAvailability(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $driver = $this->findDriver($company->uuid, $id);

        if (!$driver) {
            return response()->json(['error' => 'Driver not found.'], 404);
        }

        if ((string) $driver->status === 'pending_approval') {
            return response()->json(['error' => 'Approve this rider before changing live availability.'], 422);
        }

        $payload = $request->validate([
            'online' => 'required|boolean',
            'status' => 'nullable|string|max:40',
        ]);

        $driver->online = (bool) $payload['online'];
        if (filled($payload['status'] ?? null)) {
            $driver->status = $payload['status'];
        }
        $driver->save();

        return response()->json([
            'ok' => true,
            'driver' => $this->serializeDriverRow($this->findDriverRow($company->uuid, $driver->uuid)),
        ]);
    }

    public function assignVehicle(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $driver = $this->findDriver($company->uuid, $id);

        if (!$driver) {
            return response()->json(['error' => 'Driver not found.'], 404);
        }

        $payload = $request->validate([
            'vehicle_uuid' => 'nullable|string',
        ]);

        if (blank($payload['vehicle_uuid'] ?? null)) {
            $driver->vehicle_uuid = null;
            $driver->save();
        } else {
            $vehicle = $this->findVehicle($company->uuid, (string) $payload['vehicle_uuid']);
            if (!$vehicle) {
                return response()->json(['error' => 'Vehicle not found.'], 404);
            }

            $driver->assignVehicle($vehicle);
            $driver = $driver->fresh();
        }

        $driverMeta = is_array($driver->meta) ? $driver->meta : [];
        if (data_get($driverMeta, 'pending_vehicle_uuid') === ($payload['vehicle_uuid'] ?? null)) {
            unset($driverMeta['pending_vehicle_uuid']);
            $driver->meta = $driverMeta;
            $driver->save();
        }

        return response()->json([
            'ok' => true,
            'driver' => $this->serializeDriverRow($this->findDriverRow($company->uuid, $driver->uuid)),
        ]);
    }

    public function approveDriver(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $driver = $this->findDriver($company->uuid, $id);

        if (!$driver) {
            return response()->json(['error' => 'Driver not found.'], 404);
        }

        $driver->status = 'active';
        $driver->online = false;
        $driverMeta = is_array($driver->meta) ? $driver->meta : [];
        $driverMeta['portal_application'] = array_merge(
            data_get($driverMeta, 'portal_application', []),
            ['approved_at' => now()->toIso8601String()]
        );
        $driver->meta = $driverMeta;
        $driver->save();

        $companyUser = CompanyUser::where('company_uuid', $company->uuid)
            ->where('user_uuid', $driver->user_uuid)
            ->first();

        if ($companyUser) {
            $companyUser->status = 'active';
            $companyUser->save();
        }

        if ($driver->user) {
            $driver->user->status = 'active';
            $driver->user->save();
        }

        return response()->json([
            'ok' => true,
            'driver' => $this->serializeDriverRow($this->findDriverRow($company->uuid, $driver->uuid)),
        ]);
    }

    public function rejectDriver(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $driver = $this->findDriver($company->uuid, $id);

        if (!$driver) {
            return response()->json(['error' => 'Driver not found.'], 404);
        }

        $driver->status = 'rejected';
        $driver->online = false;
        $driver->save();

        $companyUser = CompanyUser::where('company_uuid', $company->uuid)
            ->where('user_uuid', $driver->user_uuid)
            ->first();

        if ($companyUser) {
            $companyUser->status = 'inactive';
            $companyUser->save();
        }

        if ($driver->user) {
            $driver->user->status = 'inactive';
            $driver->user->save();
        }

        return response()->json([
            'ok' => true,
            'driver' => $this->serializeDriverRow($this->findDriverRow($company->uuid, $driver->uuid)),
        ]);
    }

    public function listVehicles(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);

        $rows = DB::table('vehicles as v')
            ->leftJoin('drivers as d', 'd.vehicle_uuid', '=', 'v.uuid')
            ->leftJoin('users as u', 'u.uuid', '=', 'd.user_uuid')
            ->where('v.company_uuid', $company->uuid)
            ->whereNull('v.deleted_at')
            ->select([
                'v.uuid',
                'v.public_id',
                'v.name',
                'v.make',
                'v.model',
                'v.year',
                'v.plate_number',
                'v.status',
                'v.online',
                'v.meta',
                'v.created_at',
                'd.uuid as driver_uuid',
                'u.name as driver_name',
            ])
            ->orderByDesc('v.created_at')
            ->get();

        return response()->json([
            'vehicles' => $rows->map(fn (object $row) => $this->serializeVehicleRow($row))->all(),
        ]);
    }

    public function showVehicle(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $vehicle = $this->findVehicleRow($company->uuid, $id);

        if (!$vehicle) {
            return response()->json(['error' => 'Vehicle not found.'], 404);
        }

        return response()->json([
            'vehicle' => $this->serializeVehicleRow($vehicle),
        ]);
    }

    public function createVehicle(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $payload = $request->validate([
            'name' => 'required|string|max:120',
            'make' => 'nullable|string|max:80',
            'model' => 'nullable|string|max:80',
            'year' => 'nullable|integer|min:1900|max:2100',
            'plate_number' => 'nullable|string|max:40',
            'status' => 'nullable|string|max:40',
        ]);

        $vehicle = new Vehicle();
        $vehicle->company_uuid = $company->uuid;
        $vehicle->name = $payload['name'];
        $vehicle->make = $payload['make'] ?? null;
        $vehicle->model = $payload['model'] ?? null;
        $vehicle->year = $payload['year'] ?? null;
        $vehicle->plate_number = $payload['plate_number'] ?? null;
        $vehicle->status = $payload['status'] ?? 'active';
        $vehicle->online = false;
        $vehicle->save();

        return response()->json([
            'ok' => true,
            'vehicle' => $this->serializeVehicleRow($this->findVehicleRow($company->uuid, $vehicle->uuid)),
        ]);
    }

    public function updateVehicle(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $vehicle = $this->findVehicle($company->uuid, $id);

        if (!$vehicle) {
            return response()->json(['error' => 'Vehicle not found.'], 404);
        }

        $payload = $request->validate([
            'name' => 'nullable|string|max:120',
            'make' => 'nullable|string|max:80',
            'model' => 'nullable|string|max:80',
            'year' => 'nullable|integer|min:1900|max:2100',
            'plate_number' => 'nullable|string|max:40',
            'status' => 'nullable|string|max:40',
            'online' => 'nullable|boolean',
        ]);

        foreach (['name', 'make', 'model', 'year', 'plate_number', 'status'] as $field) {
            if (array_key_exists($field, $payload)) {
                $vehicle->{$field} = $payload[$field];
            }
        }

        if (array_key_exists('online', $payload)) {
            $vehicle->online = (bool) $payload['online'];
        }

        $vehicle->save();
        $this->syncSubmittedVehicleReview($company->uuid, $vehicle);

        return response()->json([
            'ok' => true,
            'vehicle' => $this->serializeVehicleRow($this->findVehicleRow($company->uuid, $vehicle->uuid)),
        ]);
    }

    public function listTeam(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);

        return response()->json([
            'team' => $this->teamRows($company->uuid),
            'role_presets' => $this->rolePresetsForCompany($company),
        ]);
    }

    public function createTeamMember(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $payload = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190',
            'phone' => 'nullable|string|max:40',
            'status' => 'nullable|string|max:40',
            'role_key' => 'nullable|string|max:40',
            'role_name' => 'nullable|string|max:120',
        ]);

        $role = $this->resolveRoleFromInput($company, $payload, 'dispatcher');
        $user = User::where('email', $payload['email'])->first();

        if (!$user) {
            $user = new User();
            $user->uuid = (string) Str::uuid();
            $user->password = Str::password(16);
        }

        $user->name = $payload['name'];
        $user->email = $payload['email'];
        $user->phone = $payload['phone'] ?? null;
        $user->company_uuid = $company->uuid;
        $user->status = $payload['status'] ?? 'active';
        $user->save();
        $user->setType('admin');

        $companyUser = CompanyUser::firstOrCreate(
            [
                'company_uuid' => $company->uuid,
                'user_uuid' => $user->uuid,
            ],
            [
                'uuid' => (string) Str::uuid(),
                'status' => $payload['status'] ?? 'active',
            ]
        );
        $companyUser->status = $payload['status'] ?? 'active';
        $companyUser->save();
        $companyUser->assignSingleRole($role->name);

        return response()->json([
            'ok' => true,
            'member' => $this->teamRowForCompanyUser($companyUser->uuid),
        ]);
    }

    public function rolePresets(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);

        return response()->json([
            'roles' => $this->rolePresetsForCompany($company),
        ]);
    }

    public function assignTeamRole(Request $request, string $id): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $companyUser = CompanyUser::where('company_uuid', $company->uuid)
            ->where('uuid', $id)
            ->first();

        if (!$companyUser) {
            return response()->json(['error' => 'Team member not found.'], 404);
        }

        $payload = $request->validate([
            'role_key' => 'nullable|string|max:40',
            'role_name' => 'nullable|string|max:120',
            'role_id' => 'nullable|string|max:120',
        ]);

        $role = $this->resolveRoleFromInput($company, $payload, 'dispatcher');
        $companyUser->assignSingleRole($role->name);

        return response()->json([
            'ok' => true,
            'member' => $this->teamRowForCompanyUser($companyUser->uuid),
        ]);
    }

    public function getSettings(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $settings = data_get($company->meta, 'ops_dashboard', []);

        return response()->json([
            'settings' => array_merge([
                'company_name' => $company->name,
                'support_phone' => $company->phone,
                'default_dispatch_mode' => 'manual',
                'auto_assign_new_orders' => false,
                'show_advanced_permissions' => false,
            ], is_array($settings) ? $settings : []),
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $payload = $request->validate([
            'support_phone' => 'nullable|string|max:40',
            'support_email' => 'nullable|email',
            'default_dispatch_mode' => 'nullable|string|max:40',
            'auto_assign_new_orders' => 'nullable|boolean',
            'show_advanced_permissions' => 'nullable|boolean',
            'service_notes' => 'nullable|string|max:500',
        ]);

        $meta = is_array($company->meta) ? $company->meta : [];
        $meta['ops_dashboard'] = array_merge(data_get($meta, 'ops_dashboard', []), $payload);
        $company->meta = $meta;

        if (filled($payload['support_phone'] ?? null)) {
            $company->phone = $payload['support_phone'];
        }

        $company->save();

        return response()->json([
            'ok' => true,
            'settings' => $meta['ops_dashboard'],
        ]);
    }

    protected function resolveCompany(Request $request): Company
    {
        $user = $request->user();
        $companyUuid = $user?->company_uuid ?: config('commission.logistics_default_company_uuid');

        $company = null;
        if (filled($companyUuid)) {
            $company = Company::where('uuid', $companyUuid)->first();
        }

        return $company ?: Company::query()->orderByDesc('created_at')->firstOrFail();
    }

    protected function resolveActor(Request $request, Company $company): User
    {
        return $request->user() ?: User::where('uuid', $company->owner_uuid)->firstOrFail();
    }

    protected function ordersQuery(string $companyUuid)
    {
        return DB::table('orders as o')
            ->leftJoin('drivers as d', 'd.uuid', '=', 'o.driver_assigned_uuid')
            ->leftJoin('users as u', 'u.uuid', '=', 'd.user_uuid')
            ->where('o.company_uuid', $companyUuid)
            ->whereNull('o.deleted_at')
            ->select([
                'o.uuid',
                'o.public_id',
                'o.status',
                'o.dispatched',
                'o.dispatched_at',
                'o.started',
                'o.started_at',
                'o.notes',
                'o.meta',
                'o.created_at',
                'o.updated_at',
                'd.uuid as driver_uuid',
                'u.name as driver_name',
                'u.phone as driver_phone',
            ])
            ->orderByDesc('o.created_at');
    }

    protected function findOrderRow(string $companyUuid, string $id): ?object
    {
        return $this->ordersQuery($companyUuid)
            ->where(function ($query) use ($id) {
                $query->where('o.uuid', $id)->orWhere('o.public_id', $id);
            })
            ->first();
    }

    protected function findOrder(string $companyUuid, string $id): ?Order
    {
        return Order::where('company_uuid', $companyUuid)
            ->where(function ($query) use ($id) {
                $query->where('uuid', $id)->orWhere('public_id', $id);
            })
            ->first();
    }

    protected function findDriver(string $companyUuid, string $id): ?Driver
    {
        return Driver::where('company_uuid', $companyUuid)
            ->where(function ($query) use ($id) {
                $query->where('uuid', $id)->orWhere('public_id', $id);
            })
            ->first();
    }

    protected function findVehicle(string $companyUuid, string $id): ?Vehicle
    {
        return Vehicle::where('company_uuid', $companyUuid)
            ->where(function ($query) use ($id) {
                $query->where('uuid', $id)->orWhere('public_id', $id);
            })
            ->first();
    }

    protected function findDriverRow(string $companyUuid, string $id): ?object
    {
        return DB::table('drivers as d')
            ->leftJoin('users as u', 'u.uuid', '=', 'd.user_uuid')
            ->leftJoin('vehicles as v', 'v.uuid', '=', 'd.vehicle_uuid')
            ->where('d.company_uuid', $companyUuid)
            ->whereNull('d.deleted_at')
            ->where(function ($query) use ($id) {
                $query->where('d.uuid', $id)->orWhere('d.public_id', $id);
            })
            ->select([
                'd.uuid',
                'd.public_id',
                'd.user_uuid',
                'd.vehicle_uuid',
                'd.current_job_uuid',
                'd.status',
                'd.online',
                'd.drivers_license_number',
                'd.meta',
                'd.created_at',
                'u.name',
                'u.email',
                'u.phone',
                'v.public_id as vehicle_public_id',
                'v.make as vehicle_make',
                'v.model as vehicle_model',
                'v.plate_number as vehicle_plate_number',
            ])
            ->first();
    }

    protected function findVehicleRow(string $companyUuid, string $id): ?object
    {
        return DB::table('vehicles as v')
            ->leftJoin('drivers as d', 'd.vehicle_uuid', '=', 'v.uuid')
            ->leftJoin('users as u', 'u.uuid', '=', 'd.user_uuid')
            ->where('v.company_uuid', $companyUuid)
            ->whereNull('v.deleted_at')
            ->where(function ($query) use ($id) {
                $query->where('v.uuid', $id)->orWhere('v.public_id', $id);
            })
            ->select([
                'v.uuid',
                'v.public_id',
                'v.name',
                'v.make',
                'v.model',
                'v.year',
                'v.plate_number',
                'v.status',
                'v.online',
                'v.meta',
                'v.created_at',
                'd.uuid as driver_uuid',
                'u.name as driver_name',
            ])
            ->first();
    }

    protected function serializeOrderRow(object $row): array
    {
        $meta = $this->parseMeta($row->meta ?? null);
        $customer = data_get($meta, 'customer', []);
        $dropoff = data_get($meta, 'dropoff', []);

        return [
            'uuid' => $row->uuid,
            'public_id' => $row->public_id,
            'status' => $row->status,
            'stage' => $this->serializeOrderStage($row->status),
            'customer_name' => data_get($customer, 'name'),
            'customer_phone' => data_get($customer, 'phone'),
            'dropoff_address' => data_get($dropoff, 'address_line_1'),
            'dropoff_city' => data_get($dropoff, 'city'),
            'driver' => [
                'uuid' => $row->driver_uuid,
                'name' => $row->driver_name,
                'phone' => $row->driver_phone,
            ],
            'tracking_url' => $this->buildTrackingUrl($row->public_id, data_get($meta, 'merchant_name', 'Merchant')),
            'notes' => $row->notes,
            'created_at' => $this->toIso8601String($row->created_at),
            'updated_at' => $this->toIso8601String($row->updated_at),
        ];
    }

    protected function serializeDriverRow(object $row): array
    {
        $meta = $this->parseMeta($row->meta ?? null);
        $application = data_get($meta, 'portal_application', []);
        $isApproved = in_array((string) $row->status, ['active', 'approved'], true);
        $pendingVehicle = $this->pendingVehicleSummary(data_get($meta, 'pending_vehicle_uuid'));

        return [
            'uuid' => $row->uuid,
            'public_id' => $row->public_id,
            'name' => $row->name,
            'email' => $row->email,
            'phone' => $row->phone,
            'status' => $row->status,
            'is_approved' => $isApproved,
            'online' => (bool) $row->online,
            'drivers_license_number' => $row->drivers_license_number,
            'current_job_uuid' => $row->current_job_uuid,
            'free_slots' => RiderCapacity::freeSlots($row->uuid),
            'application' => [
                'applied_at' => data_get($application, 'applied_at'),
                'approved_at' => data_get($application, 'approved_at'),
                'notes' => data_get($application, 'notes'),
            ],
            'vehicle' => [
                'uuid' => $row->vehicle_uuid,
                'public_id' => $row->vehicle_public_id,
                'label' => trim(implode(' ', array_filter([$row->vehicle_make, $row->vehicle_model, $row->vehicle_plate_number]))),
            ],
            'pending_vehicle' => $pendingVehicle,
            'created_at' => $this->toIso8601String($row->created_at),
        ];
    }

    protected function serializeVehicleRow(object $row): array
    {
        $meta = $this->parseMeta($row->meta ?? null);
        $submittedByDriverUuid = data_get($meta, 'portal_application.submitted_by_driver_uuid');

        return [
            'uuid' => $row->uuid,
            'public_id' => $row->public_id,
            'name' => $row->name,
            'make' => $row->make,
            'model' => $row->model,
            'year' => $row->year,
            'plate_number' => $row->plate_number,
            'status' => $row->status,
            'online' => (bool) ($row->online ?? false),
            'driver' => [
                'uuid' => $row->driver_uuid,
                'name' => $row->driver_name,
            ],
            'portal_submission' => [
                'submitted_by_driver_uuid' => $submittedByDriverUuid,
                'submitted_by_driver_name' => $this->driverNameForUuid($submittedByDriverUuid),
                'submitted_at' => data_get($meta, 'portal_application.submitted_at'),
                'requested_change' => (bool) data_get($meta, 'portal_application.requested_change'),
            ],
            'created_at' => $this->toIso8601String($row->created_at),
        ];
    }

    protected function teamRows(string $companyUuid): array
    {
        return DB::table('company_users as cu')
            ->leftJoin('users as u', 'u.uuid', '=', 'cu.user_uuid')
            ->leftJoin('model_has_roles as mhr', 'mhr.model_uuid', '=', 'cu.uuid')
            ->leftJoin('roles as r', 'r.id', '=', 'mhr.role_id')
            ->where('cu.company_uuid', $companyUuid)
            ->select([
                'cu.uuid',
                'cu.status as membership_status',
                'u.uuid as user_uuid',
                'u.name',
                'u.email',
                'u.phone',
                'u.status as user_status',
                'r.id as role_id',
                'r.name as role_name',
            ])
            ->orderBy('u.name')
            ->get()
            ->map(function (object $row) {
                return [
                    'uuid' => $row->uuid,
                    'user_uuid' => $row->user_uuid,
                    'name' => $row->name,
                    'email' => $row->email,
                    'phone' => $row->phone,
                    'status' => $row->membership_status ?: $row->user_status,
                    'role_id' => $row->role_id,
                    'role_name' => $row->role_name,
                    'role_key' => $this->roleKeyForName($row->role_name),
                ];
            })
            ->all();
    }

    protected function teamRowForCompanyUser(string $companyUserUuid): ?array
    {
        $row = DB::table('company_users as cu')
            ->leftJoin('users as u', 'u.uuid', '=', 'cu.user_uuid')
            ->leftJoin('model_has_roles as mhr', 'mhr.model_uuid', '=', 'cu.uuid')
            ->leftJoin('roles as r', 'r.id', '=', 'mhr.role_id')
            ->where('cu.uuid', $companyUserUuid)
            ->select([
                'cu.uuid',
                'cu.status as membership_status',
                'u.uuid as user_uuid',
                'u.name',
                'u.email',
                'u.phone',
                'u.status as user_status',
                'r.id as role_id',
                'r.name as role_name',
            ])
            ->first();

        if (!$row) {
            return null;
        }

        return [
            'uuid' => $row->uuid,
            'user_uuid' => $row->user_uuid,
            'name' => $row->name,
            'email' => $row->email,
            'phone' => $row->phone,
            'status' => $row->membership_status ?: $row->user_status,
            'role_id' => $row->role_id,
            'role_name' => $row->role_name,
            'role_key' => $this->roleKeyForName($row->role_name),
        ];
    }

    protected function rolePresetsForCompany(Company $company): array
    {
        return collect($this->rolePresetMap())->map(function (array $preset, string $key) use ($company) {
            $role = $this->findRoleForPreset($company, $key);

            return [
                'key' => $key,
                'label' => $preset['label'],
                'role_id' => $role?->id,
                'role_name' => $role?->name,
            ];
        })->values()->all();
    }

    protected function resolveRoleFromInput(Company $company, array $payload, string $defaultKey): Role
    {
        if (filled($payload['role_id'] ?? null)) {
            $role = Role::where('id', $payload['role_id'])->first();
            if ($role) {
                return $role;
            }
        }

        if (filled($payload['role_name'] ?? null)) {
            $role = Role::where('name', $payload['role_name'])
                ->where(function ($query) use ($company) {
                    $query->whereNull('company_uuid')->orWhere('company_uuid', $company->uuid);
                })
                ->first();

            if ($role) {
                return $role;
            }

            return $this->createRole($company, (string) $payload['role_name']);
        }

        $presetKey = $payload['role_key'] ?? $defaultKey;
        $preset = $this->rolePresetMap()[$presetKey] ?? ['label' => 'Operator'];

        return $this->findRoleForPreset($company, $presetKey) ?: $this->createRole($company, $preset['label']);
    }

    protected function findRoleForPreset(Company $company, string $presetKey): ?Role
    {
        $preset = $this->rolePresetMap()[$presetKey] ?? null;

        if (!$preset) {
            return null;
        }

        foreach ($preset['matches'] as $roleName) {
            $role = Role::where('name', $roleName)
                ->where(function ($query) use ($company) {
                    $query->whereNull('company_uuid')->orWhere('company_uuid', $company->uuid);
                })
                ->first();

            if ($role) {
                return $role;
            }
        }

        return null;
    }

    protected function createRole(Company $company, string $name): Role
    {
        $existing = Role::where('name', $name)->where('company_uuid', $company->uuid)->first();
        if ($existing) {
            return $existing;
        }

        $role = new Role();
        $role->id = (string) Str::uuid();
        $role->name = $name;
        $role->guard_name = 'sanctum';
        $role->company_uuid = $company->uuid;
        $role->save();

        return $role;
    }

    protected function rolePresetMap(): array
    {
        return [
            'administrator' => [
                'label' => 'Administrator',
                'matches' => ['Administrator', 'Admin'],
            ],
            'dispatcher' => [
                'label' => 'Dispatcher',
                'matches' => ['Dispatcher', 'Operations'],
            ],
            'driver_manager' => [
                'label' => 'Driver Manager',
                'matches' => ['Driver Manager', 'Fleet Manager'],
            ],
            'support' => [
                'label' => 'Support',
                'matches' => ['Support'],
            ],
            'driver' => [
                'label' => 'Driver',
                'matches' => ['Driver'],
            ],
        ];
    }

    protected function roleKeyForName(?string $roleName): ?string
    {
        if (!$roleName) {
            return null;
        }

        $normalized = Str::lower($roleName);

        return match (true) {
            str_contains($normalized, 'administrator'), str_contains($normalized, 'admin') => 'administrator',
            str_contains($normalized, 'dispatcher'), str_contains($normalized, 'operation') => 'dispatcher',
            str_contains($normalized, 'driver manager'), str_contains($normalized, 'fleet manager') => 'driver_manager',
            str_contains($normalized, 'support') => 'support',
            str_contains($normalized, 'driver') => 'driver',
            default => null,
        };
    }

    protected function listVehiclesForLookup(string $companyUuid): array
    {
        return DB::table('vehicles')
            ->where('company_uuid', $companyUuid)
            ->whereNull('deleted_at')
            ->where('status', 'active')
            ->select(['uuid', 'public_id', 'make', 'model', 'plate_number'])
            ->orderBy('plate_number')
            ->get()
            ->map(fn (object $row) => [
                'uuid' => $row->uuid,
                'public_id' => $row->public_id,
                'label' => trim(implode(' ', array_filter([$row->make, $row->model, $row->plate_number]))),
            ])
            ->all();
    }

    protected function pendingVehicleSummary(?string $vehicleUuid): ?array
    {
        if (blank($vehicleUuid)) {
            return null;
        }

        $vehicle = Vehicle::where('uuid', $vehicleUuid)->whereNull('deleted_at')->first();
        if (!$vehicle || $vehicle->status !== 'pending_review') {
            return null;
        }

        return [
            'uuid' => $vehicle->uuid,
            'public_id' => $vehicle->public_id,
            'status' => $vehicle->status,
            'label' => trim(implode(' ', array_filter([$vehicle->make, $vehicle->model, $vehicle->plate_number]))),
        ];
    }

    protected function driverNameForUuid(?string $driverUuid): ?string
    {
        if (blank($driverUuid)) {
            return null;
        }

        return DB::table('drivers as d')
            ->leftJoin('users as u', 'u.uuid', '=', 'd.user_uuid')
            ->where('d.uuid', $driverUuid)
            ->value('u.name');
    }

    protected function syncSubmittedVehicleReview(string $companyUuid, Vehicle $vehicle): void
    {
        $submittedDriverUuid = data_get($vehicle->meta, 'portal_application.submitted_by_driver_uuid');
        if (blank($submittedDriverUuid)) {
            return;
        }

        $driver = Driver::where('company_uuid', $companyUuid)->where('uuid', $submittedDriverUuid)->first();
        if (!$driver) {
            return;
        }

        $driverMeta = is_array($driver->meta) ? $driver->meta : [];
        $pendingVehicleUuid = data_get($driverMeta, 'pending_vehicle_uuid');

        if ($vehicle->status === 'active') {
            $currentVehicle = $driver->vehicle;
            if ($currentVehicle && $currentVehicle->uuid !== $vehicle->uuid) {
                $currentVehicle->status = 'inactive';
                $currentVehicle->online = false;
                $currentVehicle->saveQuietly();
            }

            $driver->vehicle_uuid = $vehicle->uuid;
            unset($driverMeta['pending_vehicle_uuid']);
            $driverMeta['portal_application'] = array_merge(
                data_get($driverMeta, 'portal_application', []),
                ['vehicle_approved_at' => now()->toIso8601String()]
            );
            $driver->meta = $driverMeta;
            $driver->save();

            return;
        }

        if ($pendingVehicleUuid === $vehicle->uuid && $vehicle->status !== 'pending_review') {
            unset($driverMeta['pending_vehicle_uuid']);
            $driverMeta['portal_application'] = array_merge(
                data_get($driverMeta, 'portal_application', []),
                [
                    'vehicle_reviewed_at' => now()->toIso8601String(),
                    'vehicle_review_status' => $vehicle->status,
                ]
            );
            $driver->meta = $driverMeta;

            if ($driver->vehicle_uuid === $vehicle->uuid) {
                $driver->vehicle_uuid = null;
            }

            $driver->save();
        }
    }

    protected function listAssignableDrivers(string $companyUuid): array
    {
        return DB::table('drivers as d')
            ->leftJoin('users as u', 'u.uuid', '=', 'd.user_uuid')
            ->where('d.company_uuid', $companyUuid)
            ->whereNull('d.deleted_at')
            ->select(['d.uuid', 'd.public_id', 'u.name'])
            ->orderBy('u.name')
            ->get()
            ->map(fn (object $row) => [
                'uuid' => $row->uuid,
                'public_id' => $row->public_id,
                'name' => $row->name,
                'free_slots' => RiderCapacity::freeSlots($row->uuid),
            ])
            ->all();
    }

    protected function parseMeta(mixed $meta): array
    {
        if (is_array($meta)) {
            return $meta;
        }

        if (is_string($meta) && $meta !== '') {
            return json_decode($meta, true) ?: [];
        }

        return [];
    }

    protected function buildTrackingUrl(string $orderId, string $merchantName): string
    {
        return $this->trackingBaseUrl() . '/track?' . http_build_query([
            'order_id' => $orderId,
            'display_id' => $orderId,
            'merchant' => $merchantName,
        ]);
    }

    protected function serializeOrderStage(?string $status): array
    {
        $stageKey = match (strtolower((string) $status)) {
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

    protected function toIso8601String(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
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

    protected function saveOrderWithoutAssignmentNotification(Order $order): void
    {
        $order->saveQuietly();
        $order->setDriverLocationAsPickup();

        LiveCacheService::invalidateMultiple(['orders', 'routes', 'coordinates']);
        Cache::forget("order:{$order->uuid}:tracker");
    }
}
