<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Exports\FleetExport;
use Fleetbase\FleetOps\Http\Controllers\FleetOpsController;
use Fleetbase\FleetOps\Http\Requests\Internal\FleetActionRequest;
use Fleetbase\FleetOps\Imports\FleetImport;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Fleet;
use Fleetbase\FleetOps\Models\FleetDriver;
use Fleetbase\FleetOps\Models\FleetVehicle;
use Fleetbase\FleetOps\Models\Vehicle;
use Fleetbase\Http\Requests\ExportRequest;
use Fleetbase\Http\Requests\ImportRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Log;
use Fleetbase\FleetOps\Traits\ImportErrorHandler;
use Fleetbase\Models\File;
use Fleetbase\FleetOps\Models\ImportLog;
use Illuminate\Support\Facades\Storage;

class FleetController extends FleetOpsController
{
    use ImportErrorHandler;
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'fleet';

    /**
     * Query callback when querying record.
     *
     * @param \Illuminate\Database\Query\Builder $query
     * @param \Illuminate\Http\Request           $request
     */
    public static function onQueryRecord($query, $request): void
    {
        if ($request->has('excludeDriverJobs')) {
            $excludeJobs = $request->array('excludeDriverJobs');
            $query->with('drivers', function ($query) use ($excludeJobs) {
                $query->with('jobs', function ($query) use ($excludeJobs) {
                    if (is_array($excludeJobs)) {
                        $isUuids = Arr::every($excludeJobs, function ($id) {
                            return Str::isUuid($id);
                        });

                        if ($isUuids) {
                            $query->whereNotIn('uuid', $excludeJobs);
                        } else {
                            $query->whereNotIn('public_id', $excludeJobs);
                        }
                    }

                    $query->whereHas(
                        'payload',
                        function ($q) {
                            $q->where(
                                function ($q) {
                                    $q->whereHas('waypoints');
                                    $q->orWhereHas('pickup');
                                    $q->orWhereHas('dropoff');
                                }
                            );
                            $q->with(['entities', 'waypoints', 'dropoff', 'pickup', 'return']);
                        }
                    );
                    $query->whereHas('trackingNumber');
                    $query->whereHas('trackingStatuses');
                    $query->with(
                        [
                            'payload',
                            'trackingNumber',
                            'trackingStatuses',
                        ]
                    );
                });
            });
        }
    }

    /**
     * Export the fleets to excel or csv.
     *
     * @return \Illuminate\Http\Response
     */
    public static function export(ExportRequest $request)
    {
        $format       = $request->input('format', 'xlsx');
        $selections   = $request->array('selections');
        $fileName     = trim(Str::slug('fleets-' . date('Y-m-d-H:i')) . '.' . $format);

        return Excel::download(new FleetExport($selections), $fileName);
    }

    /**
     * Removes a driver from a fleet.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response
     */
    public static function removeDriver(FleetActionRequest $request)
    {
        $fleet  = Fleet::where('uuid', $request->input('fleet'))->first();
        $driver = Driver::where('uuid', $request->input('driver'))->first();

        // check if driver is already in this fleet
        $deleted = FleetDriver::where([
            'fleet_uuid'  => $fleet->uuid,
            'driver_uuid' => $driver->uuid,
        ])->delete();

        return response()->json([
            'status'  => 'ok',
            'deleted' => $deleted,
        ]);
    }

    /**
     * Adds a driver to a fleet.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response
     */
    public static function assignDriver(FleetActionRequest $request)
    {
        $fleet  = Fleet::where('uuid', $request->input('fleet'))->first();
        $driver = Driver::where('uuid', $request->input('driver'))->first();
        $added  = false;

        // check if driver is already in this fleet
        $exists = FleetDriver::where([
            'fleet_uuid'  => $fleet->uuid,
            'driver_uuid' => $driver->uuid,
        ])->whereNull('deleted_at')->where('company_uuid', session('company'))->exists();

        // $existingFleet = FleetDriver::where('driver_uuid', $driver->uuid)
        //     ->whereNull('deleted_at')
        //     ->first();
        if ($exists) {
            $driver_name = Driver::where('uuid', $driver->uuid)
                ->with('user') // eager load the user
                ->first();
            if ($exists) {
                $fleetName = $exists->fleet->name ?? '';
                $driverName = $driver_name->user->name ?? $driver_name->name ?? 'Driver';
                return response()->error(
                    __('messages.fleet_uuid.driver_already_assigned', [
                        'driver' => $driverName,
                        'fleet'  => $fleetName,
                    ])
                );
            }
        } else {
            $added = FleetDriver::create([
                'fleet_uuid'  => $fleet->uuid,
                'driver_uuid' => $driver->uuid,
            ]);
        }

        return response()->json([
            'status' => 'ok',
            'exists' => $exists,
            'added'  => (bool) $added,
        ]);
    }

    /**
     * Removes a vehicle from a fleet.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response
     */
    public static function removeVehicle(FleetActionRequest $request)
    {
        $fleet   = Fleet::where('uuid', $request->input('fleet'))->first();
        $vehicle = Vehicle::where('uuid', $request->input('vehicle'))->first();

        // check if vehicle is already in this fleet
        $deleted = FleetVehicle::where([
            'fleet_uuid'   => $fleet->uuid,
            'vehicle_uuid' => $vehicle->uuid,
        ])->delete();

        return response()->json([
            'status'  => 'ok',
            'deleted' => $deleted,
        ]);
    }

    /**
     * Adds a vehicle to a fleet.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response
     */
    public static function assignVehicle(FleetActionRequest $request)
    {
        $fleet   = Fleet::where('uuid', $request->input('fleet'))->first();
        $vehicle = Vehicle::where('uuid', $request->input('vehicle'))->first();
        $added   = false;

        // check if vehicle is already in this fleet
        $exists = FleetVehicle::where([
            'fleet_uuid'   => $fleet->uuid,
            'vehicle_uuid' => $vehicle->uuid,
        ])->exists();

        if (!$exists) {
            $added = FleetVehicle::create([
                'fleet_uuid'   => $fleet->uuid,
                'vehicle_uuid' => $vehicle->uuid,
            ]);
        }

        return response()->json([
            'status' => 'ok',
            'exists' => $exists,
            'added'  => (bool) $added,
        ]);
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
            if($alreadyProcessed->status == 'COMPLETED')
            {
                return response()->json([
                'success' => true,
                'message' => "Import completed successfully.",
                ]);
            }
        }
        $requiredHeaders = ['name', 'task'];
        $validation = [];
      
        $result = $this->processImportWithErrorHandling($files, 'fleet', function($file) use ($requiredHeaders, &$validation) {
            $disk = config('filesystems.default');
            $data = Excel::toArray(new FleetImport(), $file->path, $disk);
            $totalRows = collect($data)->flatten(1)->count();
            Log::info('Total rows: ' . $totalRows .", Company: ". session('company'));
            
            if ($totalRows > config('params.maximum_import_row_size')) {
                return [
                    'success' => false,
                    'errors' => [['N/A', "Import failed: Maximum of ". config('params.maximum_import_row_size') ." rows allowed. Your file contains {$totalRows} rows.", 'N/A']]
                ];
            }
            $validation = $this->validateImportHeaders($data, $requiredHeaders);
            return $this->fleetImportWithValidation($data);
        });
        if (!$validation['success']) {
            return response()->error($validation['errors']);
        }
        if (!empty($result['allErrors'])) {
            return response($this->generateErrorResponse($result['allErrors'], 'fleet', $files->first()->uuid, $result));
        }
        
        return response($this->generateSuccessResponse('fleet', $files->first()->uuid, $result));
    }

    /**
     * Process fleet import data with pre-validation before calling createFromImport.
     *
     * @param array $excelData
     * @return array
     */
    public function fleetImportWithValidation($excelData)
    {
        try {
            $records = [];
            $importErrors = [];
            $createdFleets = [];
            $updatedFleets = [];

            // Pre-collect all unique fleet names for batch validation
            $allFleetNames = [];
            $rowsWithIndex = [];

            foreach ($excelData as $sheetIndex => $sheetRows) {
                $sheetRowsWithIndex = collect($sheetRows)->map(function ($row, $originalIndex) {
                    $row['_original_row_index'] = $originalIndex;
                    return $row;
                });

                foreach ($sheetRowsWithIndex as $rowIndex => $row) {
                    $originalRowIndex = $row['_original_row_index'] ?? $rowIndex;
                    $displayRowIndex = $originalRowIndex + 1;

                    // Collect fleet names for batch validation using same column mapping as createFromImport
                    $fleetName = $this->getFleetValue($row, ['name', 'fleet', 'fleet_name']);
                    
                    if (!empty($fleetName)) {
                        $allFleetNames[] = trim($fleetName);
                    }
                    
                    $rowsWithIndex[] = [
                        'row' => $row,
                        'displayRowIndex' => $displayRowIndex
                    ];
                }
            }

            // Single query to get all existing fleet names
            $existingFleetNames = [];
            
            if (!empty($allFleetNames)) {
                $existingFleetNames = Fleet::whereIn('name', array_unique($allFleetNames))
                    ->where('company_uuid', session('company'))
                    ->whereNull('deleted_at')
                    ->pluck('name')
                    ->toArray();
            }

            // Track duplicates within the import file itself
            $seenFleetNames = [];

            // Process each row with pre-validation before calling createFromImport
            foreach ($rowsWithIndex as $rowData) {
                $row = $rowData['row'];
                $displayRowIndex = $rowData['displayRowIndex'];

                try {
                    // Pre-validation before calling createFromImport
                    $validationErrors = $this->validateFleetRow($row, $displayRowIndex, 
                        $existingFleetNames, $seenFleetNames);
                    
                    if (!empty($validationErrors)) {
                        $importErrors = array_merge($importErrors, $validationErrors);
                        continue;
                    }

                    // Add field validation for name and task
                    // $fieldsToValidate = ['name', 'task'];
                    // foreach ($fieldsToValidate as $field) {
                    //     if (isset($row[$field])) {
                    //         $fieldErrors = \App\Helpers\FieldValidator::validateField($field, $row[$field], $displayRowIndex);
                    //         $importErrors = array_merge($importErrors, $fieldErrors);
                    //     }
                    // }
                    // // If there were field validation errors, skip to next row
                    // if (!empty($fieldErrors)) {
                    //     continue;
                    // }

                    // Clean the row data before passing to createFromImport
                    $cleanedRow = $this->cleanRowData($row);

                    // Use your existing createFromImport method
                    $fleet = Fleet::createFromImport($cleanedRow, true);
                    
                    if ($fleet) {
                        $records[] = $fleet;
                        
                        // Track whether fleet was created or updated
                        if ($fleet->wasRecentlyCreated) {
                            $createdFleets[] = $fleet->uuid;
                        } else {
                            $updatedFleets[] = $fleet->uuid;
                        }

                        // Add to seen arrays to prevent future duplicates in the same import
                        if (!empty($fleet->name)) {
                            $seenFleetNames[] = $fleet->name;
                            $existingFleetNames[] = $fleet->name;
                        }
                    } else {
                        $fleetName = $this->getFleetValue($row, ['name', 'fleet', 'fleet_name']);
                        
                        $importErrors[] = [
                            (string)$displayRowIndex,
                            "Failed to create fleet - createFromImport returned null",
                            $fleetName ?? 'Unknown'
                        ];
                    }

                } catch (\Exception $e) {
                    $fleetName = $this->getFleetValue($row, ['name', 'fleet', 'fleet_name']);
                    
                    $importErrors[] = [
                        (string)$displayRowIndex,
                        "Failed to create fleet: " . $e->getMessage(),
                        $fleetName ?? 'Unknown'
                    ];
                }
            }

            if (!empty($importErrors)) {
                $successCount = count($records);
                $errorCount = count($importErrors);
                $createdCount = count($createdFleets);
                $updatedCount = count($updatedFleets);

                return [
                    'success' => false,
                    'partial_success' => $successCount > 0,
                    'successful_imports' => $successCount,
                    'created_fleets' => $createdCount,
                    'updated_fleets' => $updatedCount,
                    'total_errors' => $errorCount,
                    'errors' => $importErrors,
                    'message' => $successCount > 0
                        ? "Partial import completed. {$createdCount} fleets created, {$updatedCount} fleets updated, {$errorCount} errors found."
                        : "Import failed. No fleets were imported due to validation errors."
                ];
            }

            $successCount = count($records);
            $createdCount = count($createdFleets);
            $updatedCount = count($updatedFleets);

            return [
                'records' => $records,
                'summary' => [
                    'total_processed' => $successCount,
                    'created' => $createdCount,
                    'updated' => $updatedCount,
                    'created_fleets' => $createdFleets,
                    'updated_fleets' => $updatedFleets
                ]
            ];

        } catch (\Exception $e) {
            Log::error('Fleet import failed', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return ['success' => false, 'errors' => [[$e->getMessage()]]];
        }
    }

    /**
     * Validate a single fleet row before processing
     * Collects ALL validation errors for the row instead of stopping at the first error
     *
     * @param array $row
     * @param int $displayRowIndex
     * @param array $existingFleetNames
     * @param array $seenFleetNames
     * @return array
     */
    private function validateFleetRow($row, $displayRowIndex, $existingFleetNames, &$seenFleetNames)
    {
        $errors = [];
        $hasValidationErrors = false;

        // Extract values using the same logic as createFromImport
        $fleetName = $this->getFleetValue($row, ['name', 'fleet', 'fleet_name']);
        $task = $this->getFleetValue($row, ['task', 'fleet_task']);

        // Basic validation - fleet name is required
        if (empty($fleetName)) {
            $errors[] = [
                (string)$displayRowIndex,
                "Fleet name is required.",
                ""
            ];
            $hasValidationErrors = true;
        } else {
            $fleetName = trim($fleetName);
            
            // Fleet name format validation - no special characters except spaces, hyphens, and underscores
            if (!preg_match('/^[a-zA-Z0-9\s\-_]+$/', $fleetName)) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Fleet name '{$fleetName}' contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed.",
                    $fleetName
                ];
                $hasValidationErrors = true;
            }

            // Fleet name length validation
            if (strlen($fleetName) < 2) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Fleet name '{$fleetName}' is too short. Minimum 2 characters required.",
                    $fleetName
                ];
                $hasValidationErrors = true;
            } elseif (strlen($fleetName) > 100) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Fleet name '{$fleetName}' is too long. Maximum 100 characters allowed.",
                    $fleetName
                ];
                $hasValidationErrors = true;
            }

            // Check for duplicate fleet name in existing database
            if (in_array($fleetName, $existingFleetNames)) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Fleet name '{$fleetName}' already exists in the system.",
                    $fleetName
                ];
                $hasValidationErrors = true;
            }

            // Check for duplicate fleet name within the import file
            if (in_array($fleetName, $seenFleetNames)) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Duplicate fleet name '{$fleetName}' found in import file.",
                    $fleetName
                ];
                $hasValidationErrors = true;
            }

            // Only add to seen fleet names if no validation errors for this name
            if (!in_array($fleetName, $existingFleetNames) && !in_array($fleetName, $seenFleetNames)) {
                $seenFleetNames[] = $fleetName;
            }
        }

        // Task validation (optional field)
        if (!empty($task)) {
            $task = trim($task);
            
            // Task length validation
            if (strlen($task) > 255) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Task description is too long. Maximum 255 characters allowed.",
                    $fleetName ?? 'Unknown'
                ];
                $hasValidationErrors = true;
            }

            // Task format validation - allow letters, numbers, spaces, and common punctuation
            if (!preg_match('/^[a-zA-Z0-9\s\-_.,;:()\/&]+$/', $task)) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Task description contains invalid characters.",
                    $fleetName ?? 'Unknown'
                ];
                $hasValidationErrors = true;
            }
        }

        return $errors;
    }

    /**
     * Get fleet value using the same logic as createFromImport
     * This mimics the Utils::or() method behavior
     *
     * @param array $row
     * @param array $keys
     * @return mixed
     */
    private function getFleetValue($row, $keys)
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

        return $row;
    }
}
