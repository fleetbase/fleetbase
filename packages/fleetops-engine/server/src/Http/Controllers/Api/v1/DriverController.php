<?php

namespace Fleetbase\FleetOps\Http\Controllers\Api\v1;

use Fleetbase\FleetOps\Events\DriverLocationChanged;
use Fleetbase\FleetOps\Http\Requests\CreateDriverRequest;
use Fleetbase\FleetOps\Http\Requests\DriverSimulationRequest;
use Fleetbase\FleetOps\Http\Requests\UpdateDriverRequest;
use Fleetbase\FleetOps\Http\Resources\v1\DeletedResource;
use Fleetbase\FleetOps\Http\Resources\v1\Driver as DriverResource;
use Fleetbase\FleetOps\Jobs\SimulateDrivingRoute;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Support\OSRM;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Http\Requests\SwitchOrganizationRequest;
use Fleetbase\Http\Resources\Organization;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\Models\Company;
use Fleetbase\Models\CompanyUser;
use Fleetbase\Models\User;
use Fleetbase\Models\UserDevice;
use Fleetbase\Models\VerificationCode;
use Fleetbase\Support\Auth;
use Geocoder\Laravel\Facades\Geocoder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DriverController extends Controller
{
    /**
     * Creates a new Fleetbase Driver resource.
     *
     * @return \Fleetbase\Http\Resources\Driver
     */
    public function create(CreateDriverRequest $request)
    {
        // get request input
        $input = $request->except(['name', 'password', 'email', 'phone', 'location', 'altitude', 'heading', 'speed', 'meta']);

        // Add default status
        $input['status'] = 'active';

        // get user details for driver
        $userDetails                 = $request->only(['name', 'password', 'email', 'phone', 'timezone']);

        // Get current company session
        $company = $request->has('company') ? Auth::getCompanyFromRequest($request) : Auth::getCompany();

        // Debugging: Ensure company is retrieved correctly
        if (!$company) {
            return response()->apiError('Company not found.');
        }

        // Apply user infos
        $userDetails = User::applyUserInfoFromRequest($request, $userDetails);

        // create user account for driver
        $user = User::create($userDetails);

        // Assign company
        if ($company) {
            $user->assignCompany($company);
        } else {
            $user->deleteQuietly();

            return response()->apiError('Unable to assign driver to company.');
        }

        // Set user type
        $user->setUserType('driver');

        // assign driver role
        $user->assignSingleRole('Driver');

        // set user id
        $input['user_uuid']    = $user->uuid;
        $input['company_uuid'] = $company->uuid;  // Ensure correct company_uuid is set

        // vehicle assignment public_id -> uuid
        if ($request->has('vehicle')) {
            $input['vehicle_uuid'] = Utils::getUuid('vehicles', [
                'public_id'    => $request->input('vehicle'),
                'company_uuid' => $company->uuid,  // Use $company->uuid instead of session
            ]);
        }

        // vendor assignment public_id -> uuid
        if ($request->has('vendor')) {
            $input['vendor_uuid'] = Utils::getUuid('vendors', [
                'public_id'    => $request->input('vendor'),
                'company_uuid' => $company->uuid,  // Use $company->uuid instead of session
            ]);
        }

        // order|alias:job assignment public_id -> uuid
        if ($request->has('job')) {
            $input['current_job_uuid'] = Utils::getUuid('orders', [
                'public_id'    => $request->input('job'),
                'company_uuid' => $company->uuid,  // Use $company->uuid instead of session
            ]);
        }

        // set default online
        if (!isset($input['online'])) {
            $input['online'] = 0;
        }

        // latitude / longitude
        if ($request->has(['latitude', 'longitude'])) {
            $input['location'] = Utils::getPointFromCoordinates($request->only(['latitude', 'longitude']));
        }

        // create the driver
        $driver = Driver::create($input);

        // load user
        $driver = $driver->load(['user', 'vehicle', 'vendor', 'currentJob']);

        // response the driver resource
        return new DriverResource($driver);
    }

    /**
     * Updates a Fleetbase Driver resource.
     *
     * @param string                                       $id
     * @param \Fleetbase\Http\Requests\UpdateDriverRequest $request
     *
     * @return \Fleetbase\Http\Resources\Driver
     */
    public function update($id, UpdateDriverRequest $request)
    {
        // find for the driver
        try {
            $driver = Driver::findRecordOrFail($id, ['user']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Driver resource not found.',
                ],
                404
            );
        }

        // get request input
        $input = $request->except(['name', 'password', 'email', 'phone', 'location', 'altitude', 'heading', 'speed', 'meta']);

        // get user details for driver
        $userDetails = $request->only(['name', 'password', 'email', 'phone']);

        // update driver user details
        $driverUser = $driver->getUser();
        if ($driverUser) {
            $driverUser->update($userDetails);
        }

        // vehicle assignment public_id -> uuid
        if ($request->has('vehicle')) {
            $input['vehicle_uuid'] = Utils::getUuid('vehicles', [
                'public_id'    => $request->input('vehicle'),
                'company_uuid' => session('company'),
            ]);
        }

        // vendor assignment public_id -> uuid
        if ($request->has('vendor')) {
            $input['vendor_uuid'] = Utils::getUuid('vendors', [
                'public_id'    => $request->input('vendor'),
                'company_uuid' => session('company'),
            ]);
        }

        // order|alias:job assignment public_id -> uuid
        if ($request->has('job')) {
            $input['current_job_uuid'] = Utils::getUuid('orders', [
                'public_id'    => $request->input('job'),
                'company_uuid' => session('company'),
            ]);
        }

        // set default online
        if (!isset($input['online'])) {
            $input['online'] = 0;
        }

        // latitude / longitude
        if ($request->has(['latitude', 'longitude'])) {
            $input['location'] = Utils::getPointFromCoordinates($request->only(['latitude', 'longitude']));
        }

        // create the driver
        $driver->update($input);
        $driver->flushAttributesCache();

        // load user
        $driver = $driver->load(['user', 'vehicle', 'vendor', 'currentJob']);

        // response the driver resource
        return new DriverResource($driver);
    }

    /**
     * Query for Fleetbase Driver resources.
     *
     * @return \Fleetbase\Http\Resources\DriverCollection
     */
    public function query(Request $request)
    {
        $results = Driver::queryWithRequest(
            $request,
            function (&$query, $request) {
                if ($request->has('vendor')) {
                    $query->whereHas('vendor', function ($q) use ($request) {
                        $q->where('public_id', $request->input('vendor'));
                    });
                }
            }
        );

        return DriverResource::collection($results);
    }

    /**
     * Finds a single Fleetbase Driver resources.
     *
     * @param string $id
     *
     * @return \Fleetbase\Http\Resources\DriverCollection
     */
    public function find($id)
    {
        // find for the driver
        try {
            $driver = Driver::findRecordOrFail($id, ['user', 'vehicle', 'vendor', 'currentJob']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Driver resource not found.',
                ],
                404
            );
        }

        // response the driver resource
        return new DriverResource($driver);
    }

    /**
     * Deletes a Fleetbase Driver resources.
     *
     * @param string $id
     *
     * @return \Fleetbase\Http\Resources\DriverCollection
     */
    public function delete($id, Request $request)
    {
        // find for the driver
        try {
            $driver = Driver::findRecordOrFail($id, ['user', 'vehicle', 'vendor', 'currentJob']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Driver resource not found.',
                ],
                404
            );
        }

        // delete the driver
        $driver->delete();

        // response the driver resource
        return new DeletedResource($driver);
    }

    /**
     * Update drivers geolocation data.
     *
     * @return \Illuminate\Http\Response
     */
    public function track(string $id, Request $request)
    {
        $latitude  = $request->input('latitude');
        $longitude = $request->input('longitude');
        $altitude  = $request->input('altitude');
        $heading   = $request->input('heading');
        $speed     = $request->input('speed');

        try {
            $driver = Driver::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Driver resource not found.',
                ],
                404
            );
        }

        // check if driver needs a geocoded update to set city and country they are currently in
        $isGeocodable = Carbon::parse($driver->updated_at)->diffInMinutes(Carbon::now(), false) > 10 || empty($driver->country) || empty($driver->city);

        $driver->update([
            'location' => new Point($latitude, $longitude),
            'altitude' => $altitude,
            'heading'  => $heading,
            'speed'    => $speed,
        ]);

        if ($isGeocodable) {
            // attempt to geocode and fill country and city
            $geocoded = Geocoder::reverse($latitude, $longitude)->get()->first();

            if ($geocoded) {
                $driver->update([
                    'city'    => $geocoded->getLocality(),
                    'country' => $geocoded->getCountry()->getCode(),
                ]);
            }
        }

        broadcast(new DriverLocationChanged($driver));

        $driver->updatePosition();
        $driver->refresh();

        return new DriverResource($driver);
    }

    /**
     * Register device to the driver.
     *
     * @return \Illuminate\Http\Response
     */
    public function registerDevice(string $id, Request $request)
    {
        try {
            $driver = Driver::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Driver resource not found.',
                ],
                404
            );
        }

        $token    = $request->input('token');
        $platform = $request->or(['platform', 'os']);

        if (!$token) {
            return response()->apiError('Token is required to register device.');
        }

        if (!$platform) {
            return response()->apiError('Platform is required to register device.');
        }

        $device = UserDevice::firstOrCreate(
            [
                'token'    => $token,
                'platform' => $platform,
            ],
            [
                'user_uuid' => $driver->user_uuid,
                'platform'  => $platform,
                'token'     => $token,
                'status'    => 'active',
            ]
        );

        return response()->json([
            'device' => $device->public_id,
        ]);
    }

    /**
     * Authenticates customer using login credentials and returns with auth token.
     *
     * @return DriverResource
     */
    public function login(Request $request)
    {
        $identity = $request->input('identity');
        $password = $request->input('password');
        // $attrs    = $request->input(['name', 'phone', 'email']);

        // Get driver attempting to authenticate via phone
        $user = User::where(
            function ($query) use ($identity) {
                $query->where('phone', static::phone($identity));
                $query->owWhere('email', $identity);
            }
        )->whereHas('driver')->first();

        // Check password to authenticate driver
        if (!Hash::check($password, $user->password)) {
            return response()->apiError('Authentication failed using password provided.', 401);
        }

        // Get the user's company for this driver profile
        $company = static::getDriverCompanyFromUser($user);

        // Get driver record
        $driver = Driver::where(
            [
                'user_uuid'    => $user->uuid,
                'company_uuid' => $company->uuid,
            ]
        )->first();

        // generate auth token
        try {
            $token = $user->createToken($driver->uuid);
        } catch (\Exception $e) {
            return response()->apiError($e->getMessage());
        }

        $driver->token = $token->plainTextToken;

        return new DriverResource($driver);
    }

    /**
     * Attempts authentication with phone number via SMS verification.
     *
     * @return \Illuminate\Http\Response
     */
    public function loginWithPhone()
    {
        $phone = static::phone();

        // check if user exists
        $user = User::where('phone', $phone)->whereHas('driver')->whereNull('deleted_at')->withoutGlobalScopes()->first();
        if (!$user) {
            return response()->apiError('No driver with this phone # found.');
        }

        // Get the user's company for this driver profile
        $company = static::getDriverCompanyFromUser($user);

        // generate verification token
        try {
            VerificationCode::generateSmsVerificationFor($user, 'driver_login', [
                'messageCallback' => function ($verification) use ($company) {
                    return 'Your ' . data_get($company, 'name', config('app.name')) . ' verification code is ' . $verification->code;
                },
            ]);
        } catch (\Throwable $e) {
            if (app()->bound('sentry')) {
                app('sentry')->captureException($e);
            }

            return response()->apiError('Unable to send SMS Verification code.');
        }

        return response()->json(['status' => 'OK']);
    }

    /**
     * Verifys SMS code and sends auth token with customer resource.
     *
     * @return DriverResource
     */
    public function verifyCode(Request $request)
    {
        $identity = Utils::isEmail($request->identity) ? $request->identity : static::phone($request->identity);
        $code     = $request->input('code');
        $for      = $request->input('for', 'driver_login');
        $attrs    = $request->input(['name', 'phone', 'email']);

        if ($for === 'create_driver') {
            return $this->create($request);
        }

        // check if user exists
        $user = User::whereHas('driver')->where(function ($query) use ($identity) {
            $query->where('phone', $identity);
            $query->orWhere('email', $identity);
        })->first();

        if (!$user) {
            return response()->apiError('Unable to verify code.');
        }

        // find and verify code
        $verificationCode = VerificationCode::where(['subject_uuid' => $user->uuid, 'code' => $code, 'for' => $for])->exists();
        if (!$verificationCode && $code !== config('fleetops.navigator.bypass_verification_code')) {
            return response()->apiError('Invalid verification code!');
        }

        // Get the user's company for this driver profile
        $company = static::getDriverCompanyFromUser($user);

        // get driver record
        $driver = Driver::where(
            [
                'user_uuid'    => $user->uuid,
                'company_uuid' => $company->uuid,
            ]
        )->first();

        // generate auth token
        try {
            $token = $user->createToken($driver->uuid);
        } catch (\Exception $e) {
            return response()->apiError($e->getMessage());
        }

        try {
            DB::table('drivers')->where('uuid', $driver->uuid)->update(['auth_token' => $token->plainTextToken]);
            $driver->token = $token->plainTextToken;
        } catch (\Throwable $e) {
            if (app()->bound('sentry')) {
                app('sentry')->captureException($e);
            }

            return response()->apiError('Unable to authenticate driver.');
        }

        return new DriverResource($driver);
    }

    /**
     * Gets the current organization/company for the driver.
     *
     * @return Organization
     */
    public function currentOrganization(string $id, Request $request)
    {
        try {
            $driver = Driver::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->apiError('Driver resource not found.', 404);
        }

        // Get the driver user account
        $user = $driver->getUser();
        if (!$user) {
            return response()->apiError('Driver has not user account.');
        }

        // Get the user account company
        $company = Auth::getCompanySessionForUser($user);
        if (!$company) {
            return response()->apiError('No company found for this driver.');
        }

        return new Organization($company);
    }

    /**
     * List organizations that driver is apart of.
     *
     * @return Organization
     */
    public function listOrganizations(string $id, Request $request)
    {
        try {
            $driver = Driver::findRecordOrFail($id, ['user.companies']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Driver resource not found.',
                ],
                404
            );
        }

        $companies = Company::whereHas('users', function ($q) use ($driver) {
            $q->where('users.uuid', $driver->user_uuid);
        })->get();

        return Organization::collection($companies);
    }

    /**
     * Allow driver to switch organization.
     *
     * @return Organization
     */
    public function switchOrganization(string $id, SwitchOrganizationRequest $request)
    {
        $nextOrganization = $request->input('next');

        try {
            $driver = Driver::findRecordOrFail($id, ['user']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Driver resource not found.',
                ],
                404
            );
        }

        // Get the next organization
        $company = Company::where('public_id', $nextOrganization)->first();

        if ($company->uuid === $driver->user->company_uuid) {
            return response()->apiError('Driver is already on this organizations session.');
        }

        if (!CompanyUser::where(['user_uuid' => $driver->user_uuid, 'company_uuid' => $company->uuid])->exists()) {
            return response()->apiError('You do not belong to this organization');
        }

        // Get the driver user account
        $user = $driver->getUser();
        if (!$user) {
            return response()->apiError('Driver has not user account.');
        }

        // Assign user to company and update their session
        $user->update(['company_uuid' => $company->uuid]);

        Auth::setSession($user);

        return new Organization($company);
    }

    /**
     * This route can help to simulate certain actions for a driver.
     *      Actions:
     *          - Drive
     *          - Order.
     *
     * @param \Fleetbase\Http\Requests\DriverSimulationRequest $request
     *
     * @return \Illuminate\Http\Response
     */
    public function simulate(string $id, DriverSimulationRequest $request)
    {
        $start = $request->input('start');
        $end   = $request->input('end');
        $order = $request->input('order');

        try {
            /** @var Driver $driver */
            $driver = Driver::findRecordOrFail($id, ['user']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Driver resource not found.',
                ],
                404
            );
        }

        if ($order) {
            try {
                /** @var Order $order */
                $order = Order::findRecordOrFail($order, ['payload']);
            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
                return response()->json(
                    [
                        'error' => 'Order resource not found.',
                    ],
                    404
                );
            }

            return $this->simulateDrivingForOrder($driver, $order);
        }

        return $this->simulateDrivingForRoute($driver, $start, $end);
    }

    /**
     * Simulates a driving route for a given driver between a start and end point.
     *
     * @param Driver $driver the driver for whom the route is being simulated
     * @param mixed  $start  the starting point of the route, can be a Point object or other representation
     * @param mixed  $end    the ending point of the route, can be a Point object or other representation
     *
     * @return \Illuminate\Http\JsonResponse the response containing the route information
     *
     * @throws \Exception if there is an error in resolving the points or interacting with the OSRM API
     */
    public function simulateDrivingForRoute(Driver $driver, $start, $end)
    {
        // Resolve Point's from start/end
        $start = Utils::getPointFromMixed($start);
        $end   = Utils::getPointFromMixed($end);

        // Send points to OSRM
        $route = OSRM::getRoute($start, $end);

        // Create simulation events
        if (isset($route['code']) && $route['code'] === 'Ok') {
            // Get the route geometry to decode
            $routeGeometry = data_get($route, 'routes.0.geometry');

            // Decode the waypoints if needed
            $waypoints = OSRM::decodePolyline($routeGeometry);

            // Dispatch the job for each waypoint
            SimulateDrivingRoute::dispatchIf(Arr::first($waypoints) instanceof Point, $driver, $waypoints);
        }

        return response()->json($route);
    }

    /**
     * Simulates a driving route for a given driver based on an order's pickup and dropoff waypoints.
     *
     * @param Driver $driver the driver for whom the route is being simulated
     * @param Order  $order  the order containing the pickup and dropoff waypoints
     *
     * @return \Illuminate\Http\JsonResponse the response containing the route information
     *
     * @throws \Exception if there is an error in resolving the points, validating the waypoints, or interacting with the OSRM API
     */
    public function simulateDrivingForOrder(Driver $driver, Order $order)
    {
        // Get the order Pickup and Dropoff Waypoints
        $pickup  = $order->payload->getPickupOrFirstWaypoint();
        $dropoff = $order->payload->getDropoffOrLastWaypoint();

        // Convert order Pickup/Dropoff Place Waypoint's to Point's
        $start = Utils::getPointFromMixed($pickup);
        $end   = Utils::getPointFromMixed($dropoff);

        // Send points to OSRM
        $route = OSRM::getRoute($start, $end);

        // Create simulation events
        if (isset($route['code']) && $route['code'] === 'Ok') {
            // Get the route geometry to decode
            $routeGeometry = data_get($route, 'routes.0.geometry');

            // Decode the waypoints if needed
            $waypoints = OSRM::decodePolyline($routeGeometry);

            // Loop through waypoints to calculate the heading for each point
            for ($i = 0; $i < count($waypoints) - 1; $i++) {
                $point1 = $waypoints[$i];
                $point2 = $waypoints[$i + 1];

                $heading = Utils::calculateHeading($point1, $point2);

                // Directly add the 'heading' property to the Point object
                $point1->heading = $heading;
            }

            // Dispatch the job for each waypoint
            SimulateDrivingRoute::dispatchIf(Arr::first($waypoints) instanceof Point, $driver, $waypoints);
        }

        return response()->json($route);
    }

    /**
     * Get the drivers current company using their user account.
     */
    private static function getDriverCompanyFromUser(User $user): ?Company
    {
        // company defaults to null
        $company = null;

        // Load the driver profile to get the company
        $driverProfile = Driver::where('user_uuid', $user->uuid)->first();
        if ($driverProfile) {
            // get company from driver profile
            $company = Company::where('uuid', $driverProfile->company_uuid)->first();
        }

        // If unable to find company from driver profile, fallback to session flow
        if (!$company) {
            $company = Auth::getCompanySessionForUser($user);
        }

        return $company;
    }

    /**
     * Patches phone number with international code.
     */
    private static function phone(?string $phone = null): string
    {
        if ($phone === null) {
            $phone = request()->input('phone');
        }

        if (!Str::startsWith($phone, '+')) {
            $phone = '+' . $phone;
        }

        return $phone;
    }
}
