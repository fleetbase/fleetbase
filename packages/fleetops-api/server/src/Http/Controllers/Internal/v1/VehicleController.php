<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Exports\VehicleExport;
use Fleetbase\FleetOps\Http\Controllers\FleetOpsController;
use Fleetbase\FleetOps\Imports\VehicleImport;
use Fleetbase\FleetOps\Models\Vehicle;
use Fleetbase\Http\Requests\ExportRequest;
use Fleetbase\Http\Requests\ImportRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Fleetbase\FleetOps\Traits\ImportErrorHandler;
use Fleetbase\Models\File;
use Illuminate\Support\Facades\Log;

class VehicleController extends FleetOpsController
{
    use ImportErrorHandler;
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'vehicle';
    public bool $disableResponseCache = true;

    /**
     * Get all status options for an vehicle.
     *
     * @return \Illuminate\Http\Response
     */
    public function statuses()
    {
        $statuses = DB::table('vehicles')
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
        $options = Vehicle::getAvatarOptions();

        return response()->json($options);
    }

    /**
     * Export the vehicles to excel or csv.
     *
     * @return \Illuminate\Http\Response
     */
    public static function export(ExportRequest $request)
    {
        $format       = $request->input('format', 'xlsx');
        $selections   = $request->array('selections');
        $fileName     = trim(Str::slug('vehicles-' . date('Y-m-d-H:i')) . '.' . $format);

        return Excel::download(new VehicleExport($selections), $fileName);
    }

    /**
     * Process import files (excel,csv) into Fleetbase order data.
     *
     * @return \Illuminate\Http\Response
     */
    public function import(ImportRequest $request)
    {
        $files = File::whereIn('uuid', $request->input('files'))->get();
        $requiredHeaders = ['name', 'make', 'model', 'year', 'plate_number', 'vin_number'];
        $result = $this->processImportWithErrorHandling($files, 'vehicle', function($file) use ($requiredHeaders) {
            $disk = config('filesystems.default');
            $data = Excel::toArray(new VehicleImport(), $file->path, $disk);
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
            return $this->vehicleImportWithValidation($data);
        });
        
        if (!empty($result['allErrors'])) {
            return response($this->generateErrorResponse($result['allErrors'], 'vehicle', $files->first()->uuid, $result));
        }
        
        return response($this->generateSuccessResponse('vehicle', $files->first()->uuid, $result));
    }

    /**
     * Process vehicle import data with pre-validation before calling createFromImport.
     *
     * @param array $excelData
     * @return array
     */
    public function vehicleImportWithValidation($excelData)
    {
        try {
            $records = [];
            $importErrors = [];
            $createdVehicles = [];
            $updatedVehicles = [];

            // Pre-collect all unique VINs and plate numbers for batch validation
            $allVins = [];
            $allPlateNumbers = [];
            $rowsWithIndex = [];

            foreach ($excelData as $sheetIndex => $sheetRows) {
                $sheetRowsWithIndex = collect($sheetRows)->map(function ($row, $originalIndex) {
                    $row['_original_row_index'] = $originalIndex;
                    return $row;
                });

                foreach ($sheetRowsWithIndex as $rowIndex => $row) {
                    $originalRowIndex = $row['_original_row_index'] ?? $rowIndex;
                    $displayRowIndex = $originalRowIndex + 1;

                    // Collect VINs and plate numbers for batch validation using same column mapping as createFromImport
                    $vin = $this->getVehicleValue($row, ['vin', 'vin_number', 'vin_id', 'vehicle_identification_number', 'serial_number']);
                    $plateNumber = $this->getVehicleValue($row, ['plate_number', 'license_plate', 'license_place_number', 'vehicle_plate', 'registration_plate', 'tag_number', 'tail_number', 'head_number']);
                    
                    if (!empty($vin)) {
                        $allVins[] = strtoupper(trim($vin));
                    }
                    if (!empty($plateNumber)) {
                        $allPlateNumbers[] = strtoupper(trim($plateNumber));
                    }
                    
                    $rowsWithIndex[] = [
                        'row' => $row,
                        'displayRowIndex' => $displayRowIndex
                    ];
                }
            }

            // Single query to get all existing VINs and plate numbers
            $existingVins = [];
            $existingPlateNumbers = [];
            
            if (!empty($allVins)) {
                $existingVins = Vehicle::whereIn('vin', array_unique($allVins))
                    ->where('company_uuid', session('company'))
                    ->whereNull('deleted_at')
                    ->pluck('vin')
                    ->map('strtoupper')
                    ->toArray();
            }

            if (!empty($allPlateNumbers)) {
                $existingPlateNumbers = Vehicle::whereIn('plate_number', array_unique($allPlateNumbers))
                    ->where('company_uuid', session('company'))
                    ->whereNull('deleted_at')
                    ->pluck('plate_number')
                    ->map('strtoupper')
                    ->toArray();
            }

            // Track duplicates within the import file itself
            $seenVins = [];
            $seenPlateNumbers = [];

            // Process each row with pre-validation before calling createFromImport
            foreach ($rowsWithIndex as $rowData) {
                $row = $rowData['row'];
                $displayRowIndex = $rowData['displayRowIndex'];

                try {
                    // Pre-validation before calling createFromImport
                    $validationErrors = $this->validateVehicleRow($row, $displayRowIndex, 
                        $existingVins, $existingPlateNumbers, $seenVins, $seenPlateNumbers);
                    
                    if (!empty($validationErrors)) {
                        $importErrors = array_merge($importErrors, $validationErrors);
                        continue;
                    }

                    // Clean the row data before passing to createFromImport
                    $cleanedRow = $this->cleanRowData($row);

                    // Use your existing createFromImport method
                    $vehicle = Vehicle::createFromImport($cleanedRow, true);
                    
                    if ($vehicle) {
                        $records[] = $vehicle;
                        
                        // Track whether vehicle was created or updated
                        if ($vehicle->wasRecentlyCreated) {
                            $createdVehicles[] = $vehicle->uuid;
                        } else {
                            $updatedVehicles[] = $vehicle->uuid;
                        }

                        // Add to seen arrays to prevent future duplicates in the same import
                        if (!empty($vehicle->vin)) {
                            $seenVins[] = strtoupper($vehicle->vin);
                            $existingVins[] = strtoupper($vehicle->vin);
                        }
                        if (!empty($vehicle->plate_number)) {
                            $seenPlateNumbers[] = strtoupper($vehicle->plate_number);
                            $existingPlateNumbers[] = strtoupper($vehicle->plate_number);
                        }
                    } else {
                        $vehicleName = $this->getVehicleValue($row, ['vehicle', 'vehicle_name', 'name']);
                        $make = $this->getVehicleValue($row, ['make', 'vehicle_make', 'manufacturer', 'brand']);
                        $vin = $this->getVehicleValue($row, ['vin', 'vin_number', 'vin_id', 'vehicle_identification_number', 'serial_number']);
                        $plateNumber = $this->getVehicleValue($row, ['plate_number', 'license_plate', 'license_place_number', 'vehicle_plate', 'registration_plate', 'tag_number', 'tail_number', 'head_number']);
                        
                        $importErrors[] = [
                            (string)$displayRowIndex,
                            "Failed to create vehicle - createFromImport returned null",
                            $vin ?? $plateNumber ?? $make ?? $vehicleName ?? 'Unknown'
                        ];
                    }

                } catch (\Exception $e) {
                    $vehicleName = $this->getVehicleValue($row, ['vehicle', 'vehicle_name', 'name']);
                    $make = $this->getVehicleValue($row, ['make', 'vehicle_make', 'manufacturer', 'brand']);
                    $vin = $this->getVehicleValue($row, ['vin', 'vin_number', 'vin_id', 'vehicle_identification_number', 'serial_number']);
                    $plateNumber = $this->getVehicleValue($row, ['plate_number', 'license_plate', 'license_place_number', 'vehicle_plate', 'registration_plate', 'tag_number', 'tail_number', 'head_number']);
                    
                    $importErrors[] = [
                        (string)$displayRowIndex,
                        "Failed to create vehicle: " . $e->getMessage(),
                        $vin ?? $plateNumber ?? $make ?? $vehicleName ?? 'Unknown'
                    ];
                }
            }

            if (!empty($importErrors)) {
                $successCount = count($records);
                $errorCount = count($importErrors);
                $createdCount = count($createdVehicles);
                $updatedCount = count($updatedVehicles);

                return [
                    'success' => false,
                    'partial_success' => $successCount > 0,
                    'successful_imports' => $successCount,
                    'created_vehicles' => $createdCount,
                    'updated_vehicles' => $updatedCount,
                    'total_errors' => $errorCount,
                    'errors' => $importErrors,
                    'message' => $successCount > 0
                        ? "Partial import completed. {$createdCount} vehicles created, {$updatedCount} vehicles updated, {$errorCount} errors found."
                        : "Import failed. No vehicles were imported due to validation errors."
                ];
            }

            $successCount = count($records);
            $createdCount = count($createdVehicles);
            $updatedCount = count($updatedVehicles);

            return [
                'records' => $records,
                'summary' => [
                    'total_processed' => $successCount,
                    'created' => $createdCount,
                    'updated' => $updatedCount,
                    'created_vehicles' => $createdVehicles,
                    'updated_vehicles' => $updatedVehicles
                ]
            ];

        } catch (\Exception $e) {
            Log::error('Vehicle import failed', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return ['success' => false, 'errors' => [[$e->getMessage()]]];
        }
    }

    /**
     * Validate a single vehicle row before processing
     * Collects ALL validation errors for the row instead of stopping at the first error
     *
     * @param array $row
     * @param int $displayRowIndex
     * @param array $existingVins
     * @param array $existingPlateNumbers
     * @param array $seenVins
     * @param array $seenPlateNumbers
     * @return array
     */
    private function validateVehicleRow($row, $displayRowIndex, $existingVins, $existingPlateNumbers, &$seenVins, &$seenPlateNumbers)
    {
        $errors = [];
        $hasValidationErrors = false;

        // Extract values using the same logic as createFromImport
        $vehicleName = $this->getVehicleValue($row, ['vehicle', 'vehicle_name', 'name']);
        $make = $this->getVehicleValue($row, ['make', 'vehicle_make', 'manufacturer', 'brand']);
        $model = $this->getVehicleValue($row, ['model', 'vehicle_model', 'brand_model']);
        $year = $this->getVehicleValue($row, ['year', 'vehicle_year', 'build_year', 'release_year']);
        $vin = $this->getVehicleValue($row, ['vin', 'vin_number', 'vin_id', 'vehicle_identification_number', 'serial_number']);
        $plateNumber = $this->getVehicleValue($row, ['plate_number', 'license_plate', 'license_place_number', 'vehicle_plate', 'registration_plate', 'tag_number', 'tail_number', 'head_number']);

        // Basic validation - make is required (or vehicle name which can be parsed for make)
        if (empty($make) && empty($vehicleName)) {
            $errors[] = [
                (string)$displayRowIndex,
                "Vehicle make or vehicle name is required.",
                ""
            ];
            $hasValidationErrors = true;
        }

        // Year validation
        if (!empty($year)) {
            $year = trim($year);
            if (!is_numeric($year) || $year < 1900 || $year > (date('Y') + 2)) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Invalid year: '{$year}'. Year must be between 1900 and " . (date('Y') + 2),
                    $vin ?? $plateNumber ?? $make ?? $vehicleName
                ];
                $hasValidationErrors = true;
            }
        }

        // VIN validation
        if (!empty($vin)) {
            $vin = strtoupper(trim($vin));
            
            // VIN format validation (basic check for length and characters)
            if (strlen($vin) !== 17 || !preg_match('/^[A-HJ-NPR-Z0-9]{17}$/', $vin)) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Invalid VIN format: '{$vin}'. VIN must be 17 characters and contain only letters and numbers (excluding I, O, Q).",
                    $vin
                ];
                $hasValidationErrors = true;
            } else {
                // Check for duplicate VIN in existing database
                if (in_array($vin, $existingVins)) {
                    $errors[] = [
                        (string)$displayRowIndex,
                        "VIN '{$vin}' already exists in the system.",
                        $vin
                    ];
                    $hasValidationErrors = true;
                }

                // Check for duplicate VIN within the import file
                if (in_array($vin, $seenVins)) {
                    $errors[] = [
                        (string)$displayRowIndex,
                        "Duplicate VIN '{$vin}' found in import file.",
                        $vin
                    ];
                    $hasValidationErrors = true;
                }

                // Only add to seen VINs if no validation errors for this VIN
                if (!in_array($vin, $existingVins) && !in_array($vin, $seenVins)) {
                    $seenVins[] = $vin;
                }
            }
        }

        // Plate number validation
        if (!empty($plateNumber)) {
            $plateNumber = strtoupper(trim($plateNumber));
            
            // Basic plate number validation (length and basic format)
            if (strlen($plateNumber) < 2 || strlen($plateNumber) > 20) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Invalid plate number format: '{$plateNumber}'. Plate number must be between 2 and 20 characters.",
                    $plateNumber
                ];
                $hasValidationErrors = true;
            } else {
                // Check for duplicate plate number in existing database
                if (in_array($plateNumber, $existingPlateNumbers)) {
                    $errors[] = [
                        (string)$displayRowIndex,
                        "Plate number '{$plateNumber}' already exists in the system.",
                        $plateNumber
                    ];
                    $hasValidationErrors = true;
                }

                // Check for duplicate plate number within the import file
                if (in_array($plateNumber, $seenPlateNumbers)) {
                    $errors[] = [
                        (string)$displayRowIndex,
                        "Duplicate plate number '{$plateNumber}' found in import file.",
                        $plateNumber
                    ];
                    $hasValidationErrors = true;
                }

                // Only add to seen plate numbers if no validation errors for this plate
                if (!in_array($plateNumber, $existingPlateNumbers) && !in_array($plateNumber, $seenPlateNumbers)) {
                    $seenPlateNumbers[] = $plateNumber;
                }
            }
        }

        return $errors;
    }

    /**
     * Get vehicle value using the same logic as createFromImport
     * This mimics the Utils::or() method behavior
     *
     * @param array $row
     * @param array $keys
     * @return mixed
     */
    private function getVehicleValue($row, $keys)
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

        // Normalize VIN and plate number to uppercase
        $vin = $this->getVehicleValue($row, ['vin', 'vin_number', 'vin_id', 'vehicle_identification_number', 'serial_number']);
        if (!empty($vin)) {
            // Set VIN in all possible column names to ensure consistency
            foreach (['vin', 'vin_number', 'vin_id', 'vehicle_identification_number', 'serial_number'] as $vinColumn) {
                if (isset($row[$vinColumn])) {
                    $row[$vinColumn] = strtoupper($vin);
                }
            }
        }

        $plateNumber = $this->getVehicleValue($row, ['plate_number', 'license_plate', 'license_place_number', 'vehicle_plate', 'registration_plate', 'tag_number', 'tail_number', 'head_number']);
        if (!empty($plateNumber)) {
            // Set plate number in all possible column names to ensure consistency
            foreach (['plate_number', 'license_plate', 'license_place_number', 'vehicle_plate', 'registration_plate', 'tag_number', 'tail_number', 'head_number'] as $plateColumn) {
                if (isset($row[$plateColumn])) {
                    $row[$plateColumn] = strtoupper($plateNumber);
                }
            }
        }

        return $row;
    }
}
