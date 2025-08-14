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
use Illuminate\Support\Facades\Log;
use Fleetbase\FleetOps\Traits\ImportErrorHandler;
use Fleetbase\Models\File;
use Fleetbase\FleetOps\Models\ImportLog;
use Illuminate\Support\Facades\Storage;

class DriverController extends FleetOpsController
{
    use ImportErrorHandler;
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'driver';
    public bool $disableResponseCache = true;


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
        $rules               = $updateDriverRequest->rules();

        // manually validate request
        $validator = Validator::make($input, $rules);

        if ($validator->fails()) {
            return $updateDriverRequest->responseWithErrors($validator);
        }

        try {
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

                // ✅ If the vehicle has NO active orders, automatically unassign the old driver
                $assignedDriver->update(['vehicle_uuid' => null]);
            }
        }
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
            $record = $this->model->updateRecordFromRequest(
                $request,
                $id,
                function (&$request, &$driver, &$input) {
                    $driver->load(['user'])->guard(['user_uuid']);
                    $input     = collect($input);
                    $userInput = $input->only(['name', 'password', 'email', 'phone', 'avatar_uuid'])->toArray();
                    // handle `photo_uuid`
                    if (isset($input['photo_uuid']) && Str::isUuid($input['photo_uuid'])) {
                        $userInput['avatar_uuid'] = $input['photo_uuid'];
                    }
                    $input     = $input->except(['name', 'password', 'email', 'phone', 'meta', 'avatar_uuid', 'photo_uuid'])->toArray();

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
         if (!session('company')) {
                return response()->json([]);
            }
        $statuses = DB::table('drivers')
            ->select('status')
            ->where('company_uuid', session('company'))
            ->whereNull('deleted_at')
            ->whereNotNull('status') 
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

    public function import(ImportRequest $request)
    {
        $files = File::whereIn('uuid', $request->input('files'))->get();
        $alreadyProcessed = ImportLog::where('imported_file_uuid', $files[0]->uuid)->first();
        if($alreadyProcessed){
            if($alreadyProcessed->status == 'ERROR' || $alreadyProcessed->status == 'PARTIALLY_COMPLETED'){
                $url = Storage::url($alreadyProcessed['error_log_file_path']);
                $message = $alreadyProcessed->status == 'ERROR'
                    ? __('messages.full_import_error')
                    : __('messages.partial_success');
                return response()->json([
                    'error_log_url' => $url,
                    'message' => $message,
                     'status' => $alreadyProcessed->status == 'ERROR' ? 'error' : 'partial_success',
                    'success' => false,
                ]);

            }
        }
        $requiredHeaders = ['name', 'phone', 'license', 'country', 'city', 'email'];
        $result = $this->processImportWithErrorHandling($files, 'driver', function($file) use ($requiredHeaders) {
            $disk = config('filesystems.default');
            $data = Excel::toArray(new DriverImport(), $file->path, $disk);
            $totalRows = collect($data)->flatten(1)->count();
            Log::info('Total rows: ' . $totalRows .", Company: ". session('company'));
            
            if ($totalRows > config('params.maximum_import_row_size')) {
                return [
                    'success' => false,
                    'errors' => [['N/A', "Import failed: Maximum of ". config('params.maximum_import_row_size') ." rows allowed. Your file contains {$totalRows} rows.", 'N/A']]
                ];
            }

            $validation = $this->validateImportHeaders($data, $requiredHeaders);

            if (!$validation['success']) {
                return response()->json($validation);
            }
            return $this->driverImportWithValidation($data);
        });
        
        if (!empty($result['allErrors'])) {
            return response($this->generateErrorResponse($result['allErrors'], 'driver', $files->first()->uuid, $result));
        }
        
        return response($this->generateSuccessResponse('driver', $files->first()->uuid, $result));
    }

    public function driverImportWithValidation($excelData)
    {
        try {
            $records = [];
            $importErrors = [];
            $createdDrivers = [];
            $updatedDrivers = [];

            // Pre-collect all unique emails and license numbers for batch validation
            $allEmails = [];
            $allLicenseNumbers = [];
            $rowsWithIndex = [];

            foreach ($excelData as $sheetIndex => $sheetRows) {
                $sheetRowsWithIndex = collect($sheetRows)->map(function ($row, $originalIndex) {
                    $row['_original_row_index'] = $originalIndex;
                    return $row;
                });

                foreach ($sheetRowsWithIndex as $rowIndex => $row) {
                    $originalRowIndex = $row['_original_row_index'] ?? $rowIndex;
                    $displayRowIndex = $originalRowIndex + 1;

                    // Collect emails and license numbers for batch validation using same column mapping as createFromImport
                    $email = $this->getDriverValue($row, ['email', 'email_address']);
                    $driversLicenseNumber = $this->getDriverValue($row, ['drivers_license', 'driver_license', 'drivers_license_number', 'driver_license_number', 'license', 'driver_id', 'driver_identification', 'driver_identification_number', 'license_number']);
                    
                    if (!empty($email)) {
                        $allEmails[] = strtolower(trim($email));
                    }
                    if (!empty($driversLicenseNumber)) {
                        $allLicenseNumbers[] = trim($driversLicenseNumber);
                    }
                    
                    $rowsWithIndex[] = [
                        'row' => $row,
                        'displayRowIndex' => $displayRowIndex
                    ];
                }
            }

            // Single query to get all existing emails and license numbers
            $existingEmails = [];
            $existingLicenseNumbers = [];
            
            if (!empty($allEmails)) {
                // Query both Driver table directly and through User relationship
                $driverEmails = Driver::join('users', 'drivers.user_uuid', '=', 'users.uuid')
                    ->whereIn('users.email', array_unique($allEmails))
                    ->where('drivers.company_uuid', session('company'))
                    ->whereNull('drivers.deleted_at')
                    ->pluck('users.email')
                    ->map('strtolower')
                    ->toArray();
                    
                $existingEmails = $driverEmails;
            }

            if (!empty($allLicenseNumbers)) {
                $existingLicenseNumbers = Driver::whereIn('drivers_license_number', array_unique($allLicenseNumbers))
                    ->where('company_uuid', session('company'))
                    ->whereNull('deleted_at')
                    ->pluck('drivers_license_number')
                    ->toArray();
            }

            // Track duplicates within the import file itself
            $seenEmails = [];
            $seenLicenseNumbers = [];

            // Process each row with pre-validation before calling createFromImport
            foreach ($rowsWithIndex as $rowData) {
                $row = $rowData['row'];
                $displayRowIndex = $rowData['displayRowIndex'];

                try {
                    // Pre-validation before calling createFromImport
                    $validationErrors = $this->validateDriverRow($row, $displayRowIndex, 
                        $existingEmails, $existingLicenseNumbers, $seenEmails, $seenLicenseNumbers);
                    
                    if (!empty($validationErrors)) {
                        $importErrors = array_merge($importErrors, $validationErrors);
                        continue;
                    }

                    // Clean the row data before passing to createFromImport
                    $cleanedRow = $this->cleanRowData($row);

                    // Use your existing createFromImport method
                    $driver = Driver::createFromImport($cleanedRow, true);
                    
                    if ($driver) {
                        $records[] = $driver;
                        
                        // Track whether driver was created or updated
                        if ($driver->wasRecentlyCreated) {
                            $createdDrivers[] = $driver->uuid;
                        } else {
                            $updatedDrivers[] = $driver->uuid;
                        }

                        // Add to seen arrays to prevent future duplicates in the same import
                        if (!empty($driver->user->email)) {
                            $seenEmails[] = strtolower($driver->user->email);
                            $existingEmails[] = strtolower($driver->user->email);
                        }
                        if (!empty($driver->drivers_license_number)) {
                            $seenLicenseNumbers[] = $driver->drivers_license_number;
                            $existingLicenseNumbers[] = $driver->drivers_license_number;
                        }
                    } else {
                        $name = $this->getDriverValue($row, ['name', 'full_name', 'first_name', 'driver', 'person']);
                        $email = $this->getDriverValue($row, ['email', 'email_address']);
                        $driversLicenseNumber = $this->getDriverValue($row, ['drivers_license', 'driver_license', 'drivers_license_number', 'driver_license_number', 'license', 'driver_id', 'driver_identification', 'driver_identification_number', 'license_number']);
                        
                        $importErrors[] = [
                            (string)$displayRowIndex,
                            "Failed to create driver - createFromImport returned null",
                            $email ?? $driversLicenseNumber ?? $name ?? 'Unknown'
                        ];
                    }

                } catch (\Exception $e) {
                    $name = $this->getDriverValue($row, ['name', 'full_name', 'first_name', 'driver', 'person']);
                    $email = $this->getDriverValue($row, ['email', 'email_address']);
                    $driversLicenseNumber = $this->getDriverValue($row, ['drivers_license', 'driver_license', 'drivers_license_number', 'driver_license_number', 'license', 'driver_id', 'driver_identification', 'driver_identification_number', 'license_number']);
                    
                    $importErrors[] = [
                        (string)$displayRowIndex,
                        "Failed to create driver: " . $e->getMessage(),
                        $email ?? $driversLicenseNumber ?? $name ?? 'Unknown'
                    ];
                }
            }

            if (!empty($importErrors)) {
                $successCount = count($records);
                $errorCount = count($importErrors);
                $createdCount = count($createdDrivers);
                $updatedCount = count($updatedDrivers);

                return [
                    'success' => false,
                    'partial_success' => $successCount > 0,
                    'successful_imports' => $successCount,
                    'created_drivers' => $createdCount,
                    'updated_drivers' => $updatedCount,
                    'total_errors' => $errorCount,
                    'errors' => $importErrors,
                    'message' => $successCount > 0
                        ? "Partial import completed. {$createdCount} drivers created, {$updatedCount} drivers updated, {$errorCount} errors found."
                        : "Import failed. No drivers were imported due to validation errors."
                ];
            }

            $successCount = count($records);
            $createdCount = count($createdDrivers);
            $updatedCount = count($updatedDrivers);

            return [
                'records' => $records,
                'summary' => [
                    'total_processed' => $successCount,
                    'created' => $createdCount,
                    'updated' => $updatedCount,
                    'created_drivers' => $createdDrivers,
                    'updated_drivers' => $updatedDrivers
                ]
            ];

        } catch (\Exception $e) {
            Log::error('Driver import failed', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return ['success' => false, 'errors' => [[$e->getMessage()]]];
        }
    }

    /**
     * Validate a single driver row before processing
     * Collects ALL validation errors for the row instead of stopping at the first error
     *
     * @param array $row
     * @param int $displayRowIndex
     * @param array $existingEmails
     * @param array $existingLicenseNumbers
     * @param array $seenEmails
     * @param array $seenLicenseNumbers
     * @return array
     */
    private function validateDriverRow($row, $displayRowIndex, $existingEmails, $existingLicenseNumbers, &$seenEmails, &$seenLicenseNumbers)
    {
        $errors = [];
        $hasValidationErrors = false;

        // Extract values using the same logic as createFromImport
        $name = $this->getDriverValue($row, ['name', 'full_name', 'first_name', 'driver', 'person']);
        $email = $this->getDriverValue($row, ['email', 'email_address']);
        $phone = $this->getDriverValue($row, ['phone', 'mobile', 'phone_number', 'number', 'cell', 'cell_phone', 'mobile_number', 'contact_number', 'tel', 'telephone', 'telephone_number']);
        $driversLicenseNumber = $this->getDriverValue($row, ['drivers_license', 'driver_license', 'drivers_license_number', 'driver_license_number', 'license', 'driver_id', 'driver_identification', 'driver_identification_number', 'license_number']);

        // Basic validation - name is required
        if (empty($name)) {
            $errors[] = [
                (string)$displayRowIndex,
                "Driver name is required.",
                ""
            ];
            $hasValidationErrors = true;
        }

        // Email validation
        if (!empty($email)) {
            $email = strtolower(trim($email));
            
            // Check email format
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Invalid email format: '{$email}'",
                    $email
                ];
                $hasValidationErrors = true;
            } else {
                // Only check duplicates if email format is valid
                
                // Check for duplicate email in existing database
                if (in_array($email, $existingEmails)) {
                    $errors[] = [
                        (string)$displayRowIndex,
                        "Email '{$email}' already exists in the system.",
                        $email
                    ];
                    $hasValidationErrors = true;
                }

                // Check for duplicate email within the import file
                if (in_array($email, $seenEmails)) {
                    $errors[] = [
                        (string)$displayRowIndex,
                        "Duplicate email '{$email}' found in import file.",
                        $email
                    ];
                    $hasValidationErrors = true;
                }

                // Only add to seen emails if no validation errors for this email
                if (!$hasValidationErrors || (!in_array($email, $existingEmails) && !in_array($email, $seenEmails))) {
                    $seenEmails[] = $email;
                }
            }
        }

        // License number validation
        if (!empty($driversLicenseNumber)) {
            $licenseNumber = trim($driversLicenseNumber);
            
            // Check for duplicate license number in existing database
            if (in_array($licenseNumber, $existingLicenseNumbers)) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "License number '{$licenseNumber}' already exists in the system.",
                    $licenseNumber
                ];
                $hasValidationErrors = true;
            }

            // Check for duplicate license number within the import file
            if (in_array($licenseNumber, $seenLicenseNumbers)) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Duplicate license number '{$licenseNumber}' found in import file.",
                    $licenseNumber
                ];
                $hasValidationErrors = true;
            }

            // Only add to seen license numbers if no validation errors for this license
            if (!in_array($licenseNumber, $existingLicenseNumbers) && !in_array($licenseNumber, $seenLicenseNumbers)) {
                $seenLicenseNumbers[] = $licenseNumber;
            }
        }
        return $errors;
    }

    /**
     * Get driver value using the same logic as createFromImport
     * This mimics the Utils::or() method behavior
     *
     * @param array $row
     * @param array $keys
     * @return mixed
     */
    private function getDriverValue($row, $keys)
    {
        foreach ($keys as $key) {
            if (isset($row[$key]) && !empty($row[$key])) {
                return $row[$key];
            }
        }
        return null;
    }

    /**
     * Clean row data before passing to createFromImport
     *
     * @param array $row
     * @return array
     */
    private function cleanRowData($row)
    {
        // Remove our internal tracking field
        unset($row['_original_row_index']);
        
        // Trim and clean string values
        foreach ($row as $key => $value) {
            if (is_string($value)) {
                $row[$key] = trim($value);
                // Convert empty strings to null
                if ($row[$key] === '') {
                    $row[$key] = null;
                }
            }
        }

        // Normalize email to lowercase
        $email = $this->getDriverValue($row, ['email', 'email_address']);
        if (!empty($email)) {
            // Set email in all possible column names to ensure consistency
            if (isset($row['email'])) {
                $row['email'] = strtolower($email);
            }
            if (isset($row['email_address'])) {
                $row['email_address'] = strtolower($email);
            }
        }

        return $row;
    }
}
