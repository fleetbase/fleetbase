<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\Exceptions\FleetbaseRequestValidationException;
use Fleetbase\FleetOps\Exports\DriverExport;
use Fleetbase\FleetOps\Http\Controllers\Api\v1\DriverController as ApiDriverController;
use Fleetbase\FleetOps\Http\Controllers\FleetOpsController;
use Fleetbase\FleetOps\Http\Requests\Internal\AssignOrderRequest;
use Fleetbase\FleetOps\Http\Requests\Internal\CreateDriverRequest;
use Fleetbase\FleetOps\Http\Requests\Internal\UpdateDriverRequest;
use Fleetbase\FleetOps\Imports\DriverImport;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Requests\ExportRequest;
use Fleetbase\Http\Requests\ImportRequest;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\Models\Invite;
use Fleetbase\Models\User;
use Fleetbase\Models\VerificationCode;
use Fleetbase\Support\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class DriverController extends FleetOpsController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'driver';

    /**
     * Creates a record with request payload.
     *
     * @return \Illuminate\Http\Response
     */
    public function createRecord(Request $request)
    {
        $input = $request->input('driver');

        // create validation request
        $createDriverRequest = CreateDriverRequest::createFrom($request);
        $rules               = $createDriverRequest->rules();

        // manually validate request
        $validator = Validator::make($input, $rules);

        if ($validator->fails()) {
            // here if the user exists already
            // within organization: offer to create driver record
            // outside organization: invite to join organization AS DRIVER
            if ($validator->errors()->hasAny(['phone', 'email'])) {
                // get existing user
                $existingUser = null;

                // if values provided for user lookup
                if (!empty($input['phone']) || !empty($input['email'])) {
                    $existingUserQuery = User::query();

                    if (!empty($input['phone']) && is_string($input['phone'])) {
                        $existingUserQuery->orWhere(function ($q) use ($input) {
                            $q->where('phone', $input['phone'])->whereNotNull('phone');
                        });
                    }

                    if (!empty($input['email']) && is_string($input['email'])) {
                        $existingUserQuery->orWhere(function ($q) use ($input) {
                            $q->where('email', $input['email'])->whereNotNull('email');
                        });
                    }

                    $existingUser = $existingUserQuery->first();
                }

                if ($existingUser) {
                    // if exists in organization create driver profile for user
                    $isOrganizationMember = $existingUser->companies()->where('companies.uuid', session('company'))->exists();

                    // Check if driver profile also already exists
                    $existingDriverProfile = Driver::where(['company_uuid' => session('company'), 'user_uuid' => $existingUser->uuid])->first();
                    if ($existingDriverProfile) {
                        return ['driver' => new $this->resource($existingDriverProfile)];
                    }

                    // create driver profile for user
                    $input = collect($input)
                        ->except(['name', 'password', 'email', 'phone', 'meta', 'avatar_uuid', 'photo_uuid', 'status'])
                        ->filter()
                        ->toArray();

                    // Get current session company
                    $company               = Auth::getCompany();
                    $input['company_uuid'] = session('company', $company->uuid);
                    $input['user_uuid']    = $existingUser->uuid;
                    $input['slug']         = $existingUser->slug;

                    // If no location provided set
                    if (empty($input['location'])) {
                        $input['location'] = new Point(0, 0);
                    }

                    // create the profile
                    $driverProfile = Driver::create($input);

                    // If not already a member of the company assign them to the company and send the user an invite
                    if (!$isOrganizationMember && $company) {
                        $existingUser->assignCompany($company);
                    }

                    return ['driver' => new $this->resource($driverProfile)];
                }
            }

            // check from validator object if phone or email is not unique
            return $createDriverRequest->responseWithErrors($validator);
        }

        try {
            $record = $this->model->createRecordFromRequest(
                $request,
                function (&$request, &$input) {
                    $input = collect($input);

                    // Get current session company
                    $company                   = Auth::getCompany();
                    if (!$company) {
                        throw new \Exception('Unable to create driver.');
                    }

                    if ($input->has('user_uuid')) {
                        $user = User::where('uuid', $input->get('user_uuid'))->first();
                        if ($user && $input->has('photo_uuid')) {
                            $user->update(['avatar_uuid' => $input->get('photo_uuid')]);
                        }
                    } else {
                        $userInput = $input
                            ->only(['name', 'password', 'email', 'phone', 'status', 'avatar_uuid'])
                            ->filter()
                            ->toArray();

                        // handle `photo_uuid`
                        if (isset($input['photo_uuid']) && Str::isUuid($input['photo_uuid'])) {
                            $userInput['avatar_uuid'] = $input['photo_uuid'];
                        }

                        // Make sure password is set
                        if (empty($userInput['password'])) {
                            $userInput['password'] = Str::random(14);
                        }

                        // Set user company
                        $userInput['company_uuid'] = session('company', $company->uuid);

                        // Apply user infos
                        $userInput = User::applyUserInfoFromRequest($request, $userInput);

                        // Create user account
                        $user = User::create($userInput);

                        // Set the user type to driver
                        $user->setType('driver');
                    }

                    // if exists in organization create driver profile for user
                    $isOrganizationMember = $user->companies()->where('companies.uuid', session('company'))->exists();

                    // Prepare input
                    $input = $input
                            ->except(['name', 'password', 'email', 'phone', 'meta', 'avatar_uuid', 'photo_uuid', 'status'])
                            ->filter()
                            ->toArray();

                    // Assign user to company and send invite
                    if (!$isOrganizationMember && $company) {
                        $user->assignCompany($company);
                    }

                    // Set user type as driver and set role to driver
                    if ($user->type === 'driver') {
                        $user->assignSingleRole('Driver');
                    }

                    $input['user_uuid'] = $user->uuid;
                    $input['slug']      = $user->slug;

                    // If no location provided set
                    if (empty($input['location'])) {
                        $input['location'] = new Point(0, 0);
                    }
                },
                function ($request, &$driver) {
                    $driver->load(['user']);
                }
            );

            return ['driver' => new $this->resource($record)];
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }

    /**
     * Updates a record with request payload.
     *
     * @return \Illuminate\Http\Response
     */
    public function updateRecord(Request $request, string $id)
    {
        // get input data
        $input = $request->input('driver');
        
        // create validation request
        $updateDriverRequest = UpdateDriverRequest::createFrom($request);
        $rules = $updateDriverRequest->rules();

        // manually validate request
        $validator = Validator::make($input, $rules);
        if ($validator->fails()) {
            return $updateDriverRequest->responseWithErrors($validator);
        }

        try {
            // Find the current driver and its vehicle
            $driver = $this->model->find($id);
            $currentVehicleUuid = $driver->vehicle_uuid ?? null;
            $inputVehicleUuid = $input['vehicle_uuid'] ?? null;

            // ✅ If vehicle is being changed
            if ($inputVehicleUuid && ($currentVehicleUuid !== $inputVehicleUuid)) {

                // ✅ Check if the current vehicle has any active orders
                if ($currentVehicleUuid) {
                    $hasActiveOrdersOnCurrentVehicle = Order::where('vehicle_assigned_uuid', $currentVehicleUuid)
                        ->whereNotIn('status', ['completed', 'cancelled'])
                        ->whereNull('deleted_at')
                        ->exists();
                    
                    if ($hasActiveOrdersOnCurrentVehicle) {
                        return response()->error(
                            __('messages.current_vehicle_has_active_orders')
                        );
                    }
                }

                // ✅ Check if the new vehicle is already assigned to another driver
                $assignedDriver = Driver::where('vehicle_uuid', $inputVehicleUuid)
                    ->where('id', '!=', $id)
                    ->whereNull('deleted_at')
                    ->first();

                if ($assignedDriver) {
                    // ✅ Check if the assigned vehicle has any active orders
                    $hasActiveOrdersOnAssignedVehicle = Order::where('vehicle_assigned_uuid', $inputVehicleUuid)
                        ->whereNotIn('status', ['completed', 'cancelled'])
                        ->whereNull('deleted_at')
                        ->exists();

                    // ✅ If vehicle has active orders, block the transfer
                    if ($hasActiveOrdersOnAssignedVehicle) {
                        return response()->error(
                            __('messages.vehicle_has_active_orders')
                        );
                    }
                    else{
                        DB::table('drivers')
                        ->where('uuid', $assignedDriver->uuid)
                        ->update(['vehicle_uuid' => null]);
                    }

                    // ✅ If the vehicle has NO active orders, automatically unassign the old driver
                    // $assignedDriver->forceFill(['vehicle_uuid' => null])->save();
                }
            }

            // ✅ If no current vehicle and input vehicle has active orders, block the assignment
            if (!$currentVehicleUuid && $inputVehicleUuid) {
                $hasActiveOrdersOnInputVehicle = Order::where('vehicle_assigned_uuid', $inputVehicleUuid)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->whereNull('deleted_at')
                    ->exists();

                if ($hasActiveOrdersOnInputVehicle) {
                    return response()->error(
                        __('messages.vehicle_has_active_orders')
                    );
                }
            }

            // ✅ Update the driver record
            $record = $this->model->updateRecordFromRequest(
                $request,
                $id,
                function (&$request, &$driver, &$input) {
                    $driver->load(['user'])->guard(['user_uuid']);
                    $input     = collect($input);
                    $userInput = $input->only(['name', 'password', 'email', 'phone', 'avatar_uuid'])->toArray();

                    // Handle photo_uuid to avatar_uuid
                    if (isset($input['photo_uuid']) && Str::isUuid($input['photo_uuid'])) {
                        $userInput['avatar_uuid'] = $input['photo_uuid'];
                    }

                    // Update driver user details
                    $driverUser = $driver->getUser();
                    if ($driverUser) {
                        $driverUser->update($userInput);
                        $input['slug'] = $driverUser->slug;
                    }

                    // Flush cache
                    $driver->flushAttributesCache();
                },
                function ($request, &$driver) {
                    $driver->load(['user']);
                    if ($driver->user) {
                        $driver->user->setHidden(['driver']);
                    }

                    $driver->setHidden(['user']);
                }
            );

            return ['driver' => new $this->resource($record)];
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }


    /**
     * Get all status options for an driver.
     *
     * @return \Illuminate\Http\Response
     */
    public function statuses()
    {
        $statuses = DB::table('drivers')
            ->select('status')
            ->where('company_uuid', session('company'))
            ->distinct()
            ->get()
            ->pluck('status')
            ->filter()
            ->values();

        return response()->json($statuses);
    }

    /**
     * Get all avatar options for an vehicle.
     *
     * @return \Illuminate\Http\Response
     */
    public function avatars()
    {
        $options = Driver::getAvatarOptions();

        return response()->json($options);
    }

    /**
     * Export the drivers to excel or csv.
     *
     * @return \Illuminate\Http\Response
     */
    public static function export(ExportRequest $request)
    {
        $format       = $request->input('format', 'xlsx');
        $selections   = $request->array('selections');
        $fileName     = trim(Str::slug('drivers-' . date('Y-m-d-H:i')) . '.' . $format);

        return Excel::download(new DriverExport($selections), $fileName);
    }

    /**
     * Assigns a driver to a specified order.
     *
     * @param Fleetbase\FleetOps\Http\Requests\Internal\AssignOrderRequest $request
     *
     * @return \Illuminate\Http\Response $response
     */
    public function assignOrder(AssignOrderRequest $request)
    {
        $driver = Driver::where('public_id', $request->driver)->first();
        $order  = Order::where('public_id', $request->order)->first();

        if ($order->hasDriverAssigned) {
            return response()->error('A driver is already assigned to this order.');
        }

        if ($order->isDriver($driver)) {
            return response()->error('The driver is already assigned to this order.');
        }

        $order->assignDriver($driver);

        return response()->json([
            'status'  => 'ok',
            'message' => 'Driver assigned',
        ]);
    }

    /**
     * Update drivers geolocation data.
     *
     * @return \Illuminate\Http\Response
     */
    public function track(string $id, Request $request)
    {
        return app(ApiDriverController::class)->track($id, $request);
    }

    /**
     * Query for Storefront Customer orders.
     *
     * @return \Fleetbase\Http\Resources\Storefront\Customer
     */
    public function registerDevice(Request $request)
    {
        return app(ApiDriverController::class)->registerDevice($request);
    }

    /**
     * Authenticates customer using login credentials and returns with auth token.
     *
     * @return \Fleetbase\Http\Resources\Storefront\Customer
     */
    public function login(Request $request)
    {
        return app(ApiDriverController::class)->login($request);
    }

    /**
     * Attempts authentication with phone number via SMS verification.
     *
     * @return \Illuminate\Http\Response
     */
    public function loginWithPhone()
    {
        $phone = static::phone();

        // Check if user exists
        $user = User::where('phone', $phone)->whereNull('deleted_at')->withoutGlobalScopes()->first();

        if (!$user) {
            return response()->error('No driver with this phone # found.');
        }

        // Generate verification token
        VerificationCode::generateSmsVerificationFor($user, 'driver_login', [
            'messageCallback' => function ($verification) {
                return 'Your ' . config('app.name') . ' verification code is ' . $verification->code;
            },
        ]);

        return response()->json(['status' => 'OK']);
    }

    /**
     * Verifys SMS code and sends auth token with driver resource.
     *
     * @return \Fleetbase\Http\Resources\FleetOps\Driver
     */
    public function verifyCode(Request $request)
    {
        $identity = Utils::isEmail($request->identity) ? $request->identity : static::phone($request->identity);
        $code     = $request->input('code');
        $for      = $request->input('for', 'driver_login');
        $attrs    = $request->input(['name', 'phone', 'email']);

        if ($for === 'create_driver') {
            return app(ApiDriverController::class)->create($request);
        }

        // Check if user exists
        $user = User::where('phone', $identity)->orWhere('email', $identity)->first();
        if (!$user) {
            return response()->error('Unable to verify code.');
        }

        // Find and verify code
        $verificationCode = VerificationCode::where(['subject_uuid' => $user->uuid, 'code' => $code, 'for' => $for])->exists();
        if (!$verificationCode && $code !== config('fleetops.navigator.bypass_verification_code')) {
            return response()->error('Invalid verification code!');
        }

        // Get driver record
        $driver = Driver::where('user_uuid', $user->uuid)->whereNull('deleted_at')->withoutGlobalScopes()->first();
        if (!$driver) {
            return response()->error('No driver/agent record found for login.');
        }

        // Generate auth token
        try {
            $token = $user->createToken($driver->uuid);
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        }

        $driver->token = $token->plainTextToken;

        return new $this->resource($driver);
    }

    /**
     * Patches phone number with international code.
     */
    public static function phone(?string $phone = null): string
    {
        if ($phone === null) {
            $phone = request()->input('phone');
        }

        if (!Str::startsWith($phone, '+')) {
            $phone = '+' . $phone;
        }

        return $phone;
    }

    /**
     * Process import files (excel,csv) into Fleetbase order data.
     *
     * @return \Illuminate\Http\Response
     */
    public function import(ImportRequest $request)
    {
        $disk           = $request->input('disk', config('filesystems.default'));
        $files          = $request->resolveFilesFromIds();

        foreach ($files as $file) {
            try {
                Excel::import(new DriverImport(), $file->path, $disk);
            } catch (\Throwable $e) {
                return response()->error('Invalid file, unable to proccess.');
            }
        }

        return response()->json(['status' => 'ok', 'message' => 'Import completed']);
    }
}
