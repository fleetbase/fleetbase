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
     * Required columns for vehicle import
     * 
     * @var array
     */
    private const REQUIRED_HEADERS = ['name', 'make', 'model', 'year', 'plate_number'];

    /**
     * Optional columns for vehicle import
     * 
     * @var array
     */
    private const OPTIONAL_HEADERS = ['vin_number', 'vin'];

    /**
     * Column mapping for flexible header names
     * 
     * @var array
     */
    private const COLUMN_MAPPING = [
        'name' => ['name', 'vehicle', 'vehicle_name'],
        'make' => ['make', 'vehicle_make', 'manufacturer', 'brand'],
        'model' => ['model', 'vehicle_model', 'brand_model'],
        'year' => ['year', 'vehicle_year', 'build_year', 'release_year'],
        'plate_number' => ['plate_number', 'license_plate', 'license_place_number', 'vehicle_plate', 'registration_plate', 'tag_number', 'tail_number', 'head_number'],
        'vin_number' => ['vin_number', 'vin', 'chassis_number', 'vehicle_vin']
    ];


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
    /*public function import(ImportRequest $request)
    {
        $files = File::whereIn('uuid', $request->input('files'))->get();
        
        $result = $this->processImportWithErrorHandling($files, 'vehicle', function($file) {
            return $this->processVehicleImport($file);
        });
        
        if (!empty($result['allErrors'])) {
            return response($this->generateErrorResponse($result['allErrors'], 'vehicle', $files->first()->uuid, $result));
        }
        
        return response($this->generateSuccessResponse('vehicle', $files->first()->uuid, $result));
    }*/
    public function import(ImportRequest $request)
    {
        $disk           = $request->input('disk', config('filesystems.default'));
        $files          = $request->resolveFilesFromIds();

        foreach ($files as $file) {
            try {
                Excel::import(new VehicleImport(), $file->path, $disk);
            } catch (\Throwable $e) {
                return response()->error('Invalid file, unable to proccess.');
            }
        }

        return response()->json(['status' => 'ok', 'message' => 'Import completed']);
    }

    /**
     * Process vehicle import file
     *
     * @param File $file
     * @return array
     */
    private function processVehicleImport($file)
    {
        try {
            $disk = config('filesystems.default');
            $data = Excel::toArray(new VehicleImport(), $file->path, $disk);
            
            // Count total rows
            $totalRows = collect($data)->flatten(1)->count();
            Log::info('Total rows in vehicle import: ' . $totalRows . ", Company: " . session('company'));
            
            // Check row limit
            $maxRows = config('params.maximum_import_row_size', 1000);
            if ($totalRows > $maxRows) {
                return [
                    'success' => false,
                    'errors' => [['N/A', "Import failed: Maximum of {$maxRows} rows allowed. Your file contains {$totalRows} rows.", 'N/A']]
                ];
            }

            // Validate headers
            $validation = $this->validateImportHeaders($data, self::REQUIRED_HEADERS);
            if (!$validation['success']) {
                return $validation;
            }

            // Process the import
            return $this->processVehicleRows($data);

        } catch (\Exception $e) {
            Log::error('Vehicle import processing failed', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false, 
                'errors' => [['N/A', 'Import processing failed: ' . $e->getMessage(), 'N/A']]
            ];
        }
    }

    /**
     * Process vehicle rows from import data
     *
     * @param array $excelData
     * @return array
     */
    private function processVehicleRows($excelData)
    {
        $records = [];
        $errors = [];
        $createdVehicles = [];
        $updatedVehicles = [];
        
        // Collect all plate numbers and VINs from import for duplicate checking
        $importPlateNumbers = [];
        $importVins = [];
        $allRows = [];
        
        // First pass: collect all data and validate format
        foreach ($excelData as $sheetIndex => $sheetRows) {
            foreach ($sheetRows as $rowIndex => $row) {
                $displayRowIndex = $rowIndex + 1;
                
                // Normalize row data
                $normalizedRow = $this->normalizeRowData($row);
                
                // Basic validation
                $validationErrors = $this->validateRowFormat($normalizedRow, $displayRowIndex);
                if (!empty($validationErrors)) {
                    $errors = array_merge($errors, $validationErrors);
                    continue;
                }
                
                // Check for duplicates within import file
                $plateNumber = $normalizedRow['plate_number'];
                $vinNumber = $normalizedRow['vin_number'];
                
                if (!empty($plateNumber)) {
                    if (in_array($plateNumber, $importPlateNumbers)) {
                        $errors[] = [
                            (string)$displayRowIndex,
                            "Duplicate plate number '{$plateNumber}' found in import file.",
                            $plateNumber
                        ];
                        continue;
                    }
                    $importPlateNumbers[] = $plateNumber;
                }
                
                if (!empty($vinNumber)) {
                    if (in_array($vinNumber, $importVins)) {
                        $errors[] = [
                            (string)$displayRowIndex,
                            "Duplicate VIN '{$vinNumber}' found in import file.",
                            $plateNumber
                        ];
                        continue;
                    }
                    $importVins[] = $vinNumber;
                }
                
                $allRows[] = [
                    'data' => $normalizedRow,
                    'rowIndex' => $displayRowIndex
                ];
            }
        }
        
        // Check for existing records in database
        $existingPlateNumbers = $this->getExistingPlateNumbers($importPlateNumbers);
        $existingVins = $this->getExistingVins($importVins);
        
        // Second pass: check database duplicates and create records
        foreach ($allRows as $rowInfo) {
            $row = $rowInfo['data'];
            $displayRowIndex = $rowInfo['rowIndex'];
            
            try {
                // Check database duplicates
                $plateNumber = $row['plate_number'];
                $vinNumber = $row['vin_number'];
                
                if (!empty($plateNumber) && in_array($plateNumber, $existingPlateNumbers)) {
                    $errors[] = [
                        (string)$displayRowIndex,
                        "Plate number '{$plateNumber}' already exists in the system.",
                        $plateNumber
                    ];
                    continue;
                }
                
                if (!empty($vinNumber) && in_array($vinNumber, $existingVins)) {
                    $errors[] = [
                        (string)$displayRowIndex,
                        "VIN '{$vinNumber}' already exists in the system.",
                        $plateNumber
                    ];
                    continue;
                }
                
                // Create vehicle record
                $vehicle = Vehicle::createFromImport($row, true);
                
                if ($vehicle) {
                    $records[] = $vehicle;
                    
                    if ($vehicle->wasRecentlyCreated) {
                        $createdVehicles[] = $vehicle->uuid;
                    } else {
                        $updatedVehicles[] = $vehicle->uuid;
                    }
                    
                    // Add to existing arrays to prevent future duplicates
                    if (!empty($plateNumber)) {
                        $existingPlateNumbers[] = $plateNumber;
                    }
                    if (!empty($vinNumber)) {
                        $existingVins[] = $vinNumber;
                    }
                } else {
                    $errors[] = [
                        (string)$displayRowIndex,
                        "Failed to create vehicle - createFromImport returned null",
                        $plateNumber ?? $row['name'] ?? 'Unknown'
                    ];
                }
                
            } catch (\Exception $e) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Failed to create vehicle: " . $e->getMessage(),
                    $row['plate_number'] ?? $row['name'] ?? 'Unknown'
                ];
            }
        }
        
        // Return results
        if (!empty($errors)) {
            $successCount = count($records);
            $errorCount = count($errors);
            $createdCount = count($createdVehicles);
            $updatedCount = count($updatedVehicles);

            return [
                'success' => false,
                'partial_success' => $successCount > 0,
                'successful_imports' => $successCount,
                'created_vehicles' => $createdCount,
                'updated_vehicles' => $updatedCount,
                'total_errors' => $errorCount,
                'errors' => $errors,
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
    }

    /**
     * Normalize row data to standard format
     *
     * @param array $row
     * @return array
     */
    private function normalizeRowData($row)
    {
        $normalized = [];
        
        foreach (self::COLUMN_MAPPING as $standardKey => $possibleKeys) {
            $value = $this->getValueFromRow($row, $possibleKeys);
            
            if ($value !== null) {
                $value = trim($value);
                
                // Special handling for specific fields
                if ($standardKey === 'plate_number' && !empty($value)) {
                    $value = strtoupper($value);
                } elseif ($standardKey === 'vin_number' && !empty($value)) {
                    $value = strtoupper($value);
                } elseif ($standardKey === 'year' && !empty($value)) {
                    $value = (int) $value;
                }
                
                // Convert empty strings to null
                if ($value === '') {
                    $value = null;
                }
            }
            
            $normalized[$standardKey] = $value;
        }
        
        return $normalized;
    }

    /**
     * Get value from row using possible column names
     *
     * @param array $row
     * @param array $possibleKeys
     * @return mixed
     */
    private function getValueFromRow($row, $possibleKeys)
    {
        foreach ($possibleKeys as $key) {
            if (isset($row[$key]) && !empty($row[$key])) {
                return $row[$key];
            }
        }
        return null;
    }

    /**
     * Validate row format and required fields
     *
     * @param array $row
     * @param int $displayRowIndex
     * @return array
     */
    private function validateRowFormat($row, $displayRowIndex)
    {
        $errors = [];
        
        // Check required fields
        foreach (self::REQUIRED_HEADERS as $requiredField) {
            if (empty($row[$requiredField])) {
                $fieldName = ucwords(str_replace('_', ' ', $requiredField));
                $errors[] = [
                    (string)$displayRowIndex,
                    "{$fieldName} is required.",
                    $row['plate_number'] ?? ''
                ];
            }
        }
        
        // Validate year if provided
        if (!empty($row['year'])) {
            $year = $row['year'];
            $currentYear = date('Y');
            
            if (!is_numeric($year) || $year < 1900 || $year > ($currentYear + 2)) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Invalid year: '{$year}'. Year must be between 1900 and " . ($currentYear + 2),
                    $row['plate_number'] ?? ''
                ];
            }
        }
        
        // Validate plate number format if provided
        if (!empty($row['plate_number'])) {
            $plateNumber = $row['plate_number'];
            
            if (strlen($plateNumber) < 2 || strlen($plateNumber) > 20) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Invalid plate number format: '{$plateNumber}'. Plate number must be between 2 and 20 characters.",
                    $plateNumber
                ];
            }
        }
        
        // Validate VIN format if provided
        if (!empty($row['vin_number'])) {
            $vin = $row['vin_number'];
            
            if (strlen($vin) < 11 || strlen($vin) > 17) {
                $errors[] = [
                    (string)$displayRowIndex,
                    "Invalid VIN format: '{$vin}'. VIN must be between 11 and 17 characters.",
                    $row['plate_number'] ?? ''
                ];
            }
        }
        
        return $errors;
    }

    /**
     * Get existing plate numbers from database
     *
     * @param array $plateNumbers
     * @return array
     */
    private function getExistingPlateNumbers($plateNumbers)
    {
        if (empty($plateNumbers)) {
            return [];
        }
        
        return Vehicle::where('company_uuid', session('company'))
            ->whereIn('plate_number', $plateNumbers)
            ->pluck('plate_number')
            ->map(function($plate) {
                return strtoupper(trim($plate));
            })
            ->toArray();
    }

    /**
     * Get existing VIN numbers from database
     *
     * @param array $vins
     * @return array
     */
    private function getExistingVins($vins)
    {
        if (empty($vins)) {
            return [];
        }
        
        return Vehicle::where('company_uuid', session('company'))
            ->whereIn('vin', $vins)
            ->pluck('vin')
            ->map(function($vin) {
                return strtoupper(trim($vin));
            })
            ->toArray();
    }
}
