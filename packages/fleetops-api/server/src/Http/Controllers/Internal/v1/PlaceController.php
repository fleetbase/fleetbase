<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Exports\PlaceExport;
use Fleetbase\FleetOps\Http\Controllers\FleetOpsController;
use Fleetbase\FleetOps\Http\Resources\v1\Place as PlaceResource;
use Fleetbase\FleetOps\Imports\PlaceImport;
use Fleetbase\FleetOps\Models\Place;
use Fleetbase\FleetOps\Support\Geocoding;
use Fleetbase\Http\Requests\ExportRequest;
use Fleetbase\Http\Requests\ImportRequest;
use Fleetbase\Http\Requests\Internal\BulkDeleteRequest;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Fleetbase\Models\File;
use Fleetbase\FleetOps\Models\ImportLog;
use App\Helpers\UserHelper;
use Illuminate\Support\Facades\Storage;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\FleetOps\Exports\ImportErrorsExport;
use Fleetbase\FleetOps\Traits\ImportErrorHandler;

class PlaceController extends FleetOpsController
{
    use ImportErrorHandler;
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'place';

    /**
     * Quick search places for selection.
     *
     * @return \Illuminate\Http\Response
     */
    public function search(Request $request)
    {
        $searchQuery = $request->searchQuery();
        $limit       = $request->input('limit', 30);
        $geo         = $request->boolean('geo');
        $latitude    = $request->input('latitude');
        $longitude   = $request->input('longitude');

        $query = Place::where('company_uuid', session('company'))
            ->whereNull('deleted_at')
            ->applyDirectivesForPermissions('fleet-ops list place')
            ->search($searchQuery);

        if ($latitude && $longitude) {
            $point = new Point($latitude, $longitude);
            $query->orderByDistanceSphere('location', $point, 'asc');
        } else {
            $query->orderBy('name', 'desc');
        }

        if ($limit) {
            $query->limit($limit);
        }

        $results = $query->get();

        if ($geo && Geocoding::canGoogleGeocode()) {
            if ($searchQuery) {
                try {
                    $geocodingResults = Geocoding::query($searchQuery, $latitude, $longitude);

                    foreach ($geocodingResults as $result) {
                        $results->prepend($result);
                    }
                } catch (\Throwable $e) {
                    return response()->error($e->getMessage());
                }
            } elseif ($latitude && $longitude) {
                try {
                    $geocodingResults = Geocoding::reverseFromCoordinates($latitude, $longitude, $searchQuery);

                    foreach ($geocodingResults as $result) {
                        $results->prepend($result);
                    }
                } catch (\Throwable $e) {
                    return response()->error($e->getMessage());
                }
            }
        }

        return PlaceResource::collection($results);
    }

    /**
     * Search using geocoder for addresses.
     *
     * @return \Illuminate\Http\Response
     */
    public function geocode(ExportRequest $request)
    {
        $searchQuery = $request->searchQuery();
        $latitude    = $request->input('latitude', false);
        $longitude   = $request->input('longitude', false);
        $results     = collect();

        if ($searchQuery && Geocoding::canGoogleGeocode()) {
            try {
                $geocodingResults = Geocoding::query($searchQuery, $latitude, $longitude);

                foreach ($geocodingResults as $result) {
                    $results->push($result);
                }
            } catch (\Throwable $e) {
                return response()->error($e->getMessage());
            }
        } elseif ($latitude && $longitude) {
            try {
                $geocodingResults = Geocoding::reverseFromCoordinates($latitude, $longitude, $searchQuery);

                foreach ($geocodingResults as $result) {
                    $results->push($result);
                }
            } catch (\Throwable $e) {
                return response()->error($e->getMessage());
            }
        }

        return response()->json($results)->withHeaders(['Cache-Control' => 'no-cache']);
    }

    /**
     * Export the places to excel or csv.
     *
     * @return \Illuminate\Http\Response
     */
    public function export(ExportRequest $request)
    {
        $format       = $request->input('format', 'xlsx');
        $selections   = $request->array('selections');
        $fileName     = trim(Str::slug('places-' . date('Y-m-d-H:i')) . '.' . $format);

        return Excel::download(new PlaceExport($selections), $fileName);
    }

    /**
     * Bulk deletes resources.
     *
     * @return \Illuminate\Http\Response
     */
    public function bulkDelete(BulkDeleteRequest $request)
    {
        $ids = $request->input('ids', []);

        if (!$ids) {
            return response()->error('Nothing to delete.');
        }

        /**
         * @var \Fleetbase\Models\Place
         */
        $count   = Place::whereIn('uuid', $ids)->applyDirectivesForPermissions('fleet-ops list place')->count();
        $deleted = Place::whereIn('uuid', $ids)->applyDirectivesForPermissions('fleet-ops list place')->delete();

        if (!$deleted) {
            return response()->error('Failed to bulk delete places.');
        }

        return response()->json(
            [
                'status'  => 'OK',
                'message' => 'Deleted ' . $count . ' places',
            ],
            200
        );
    }

    /**
     * Get all avatar options for an vehicle.
     *
     * @return \Illuminate\Http\Response
     */
    public function avatars()
    {
        $options = Place::getAvatarOptions();

        return response()->json($options);
    }

    /**
     * Process import files (excel,csv) into Fleetbase place data.
     *
     * @return \Illuminate\Http\Response
     */
    public function import(ImportRequest $request)
    {
        $files = File::whereIn('uuid', $request->input('files'))->get();
        $requiredHeaders = [
            'name', 'phone', 'code', 'street1', 'street2', 'city', 'postal_code',
            'country', 'state', 'latitude', 'longitude'
        ];
        $result = $this->processImportWithErrorHandling($files, 'place', function($file) use ($requiredHeaders) {
            $disk = config('filesystems.default');
            $data = Excel::toArray(new PlaceImport(), $file->path, $disk);
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
            return $this->placeImport($data);
        });
        
        if (!empty($result['allErrors'])) {
            return response($this->generateErrorResponse($result['allErrors'], 'place', $files->first()->uuid, $result));
        }
        
        return response($this->generateSuccessResponse('place', $files->first()->uuid, $result));
    }

    /**
     * Process place import data with detailed error handling.
     *
     * @param array $excelData
     * @return array
     */
    public function placeImport($excelData)
    {
        try {
            $records = [];
            $importErrors = [];
            $createdPlaces = [];
            $updatedPlaces = [];

            // Pre-collect all unique place codes for batch validation
            $allPlaceCodes = [];
            $rowsWithIndex = [];

            foreach ($excelData as $sheetIndex => $sheetRows) {
                $sheetRowsWithIndex = collect($sheetRows)->map(function ($row, $originalIndex) {
                    $row['_original_row_index'] = $originalIndex;
                    return $row;
                });

                foreach ($sheetRowsWithIndex as $rowIndex => $row) {
                    $originalRowIndex = $row['_original_row_index'] ?? $rowIndex;
                    $displayRowIndex = $originalRowIndex + 1;

                    // Collect place codes for batch validation
                    if (!empty($row['code'])) {
                        $allPlaceCodes[] = $row['code'];
                    }
                    
                    $rowsWithIndex[] = [
                        'row' => $row,
                        'displayRowIndex' => $displayRowIndex
                    ];
                }
            }

            // Single query to get all existing place codes
            $existingPlaceCodes = [];
            if (!empty($allPlaceCodes)) {
                $existingPlaceCodes = Place::whereIn('code', array_unique($allPlaceCodes))
                    // ->where('company_uuid', session('company'))
                    ->whereNull('deleted_at')
                    ->pluck('code')
                    ->toArray();
            }

            // Process each row with in-memory validation
            foreach ($rowsWithIndex as $rowData) {
                $row = $rowData['row'];
                $displayRowIndex = $rowData['displayRowIndex'];

                try {
                    // Basic validation
                    if (empty($row['name'])) {
                        $importErrors[] = [
                            (string)$displayRowIndex,
                            "Place name is required.",
                            ""
                        ];
                        continue;
                    }

                    // Check for duplicate place code using in-memory list
                    if (!empty($row['code'])) {
                        if (in_array($row['code'], $existingPlaceCodes)) {
                            $importErrors[] = [
                                (string)$displayRowIndex,
                                "Place code '{$row['code']}' already exists.",
                                $row['code']
                            ];
                            continue;
                        }
                    }

                    // Add field validations
                    $fieldsToValidate = [
                        'name',
                        'code',
                        'street1',
                        'street2',
                        'neighborhood',
                        'building',
                        'security_access_code',
                        'postal_code',
                        'city',
                        'state',
                        'latitude',
                        'longitude',
                        'phone',
                        'country'
                    ];

                    foreach ($fieldsToValidate as $field) {
                        if (isset($row[$field])) {
                            $fieldErrors = $this->validatePlaceField($field, $row[$field], $displayRowIndex);
                            $importErrors = array_merge($importErrors, $fieldErrors);
                        }
                    }

                    // If there were validation errors, skip to next row
                    if (!empty($importErrors)) {
                        continue;
                    }

                    // Create place data without geocoding if coordinates are provided
                    $placeData = [
                        'company_uuid' => session('company'),
                        'name' => $row['name'],
                        'code' => $row['code'] ?? null,
                        'address' => $row['address'] ?? null,
                        'city' => $row['city'] ?? null,
                        'state' => $row['state'] ?? null,
                        'country' => $row['country'] ?? null,
                        'postal_code' => $row['postal_code'] ?? null,
                        'phone' => $row['phone'] ?? null,
                        'email' => $row['email'] ?? null,
                        'website' => $row['website'] ?? null,
                        'meta' => [
                            'description' => $row['description'] ?? null,
                            'type' => $row['type'] ?? 'facility'
                        ]
                    ];

                    // Handle coordinates if provided (skip geocoding)
                    if (!empty($row['latitude']) && !empty($row['longitude'])) {
                        try {
                            $latitude = floatval($row['latitude']);
                            $longitude = floatval($row['longitude']);
                            
                            if ($latitude >= -90 && $latitude <= 90 && $longitude >= -180 && $longitude <= 180) {
                                $placeData['location'] = new Point($longitude, $latitude);
                            } else {
                                $importErrors[] = [
                                    (string)$displayRowIndex,
                                    "Invalid coordinates provided. Latitude must be between -90 and 90, longitude between -180 and 180.",
                                    $row['code'] ?? $row['name']
                                ];
                                continue;
                            }
                        } catch (\Exception $e) {
                            $importErrors[] = [
                                (string)$displayRowIndex,
                                "Invalid coordinate format. Please provide numeric values for latitude and longitude.",
                                $row['code'] ?? $row['name']
                            ];
                            continue;
                        }
                    }

                    // Create place without geocoding
                    $place = Place::create($placeData);
                    
                    if ($place) {
                        $records[] = $place;
                        
                        // Track whether place was created or updated
                        if ($place->wasRecentlyCreated) {
                            $createdPlaces[] = $place->uuid;
                        } else {
                            $updatedPlaces[] = $place->uuid;
                        }
                    }

                } catch (\Exception $e) {
                    $importErrors[] = [
                        (string)$displayRowIndex,
                        "Failed to create place: " . $e->getMessage(),
                        $row['code'] ?? $row['name']
                    ];
                }
            }

            if (!empty($importErrors)) {
                $successCount = count($records);
                $errorCount = count($importErrors);
                $createdCount = count($createdPlaces);
                $updatedCount = count($updatedPlaces);

                return [
                    'success' => false,
                    'partial_success' => $successCount > 0,
                    'successful_imports' => $successCount,
                    'created_places' => $createdCount,
                    'updated_places' => $updatedCount,
                    'total_errors' => $errorCount,
                    'errors' => $importErrors,
                    'message' => $successCount > 0
                        ? "Partial import completed. {$createdCount} places created, {$updatedCount} places updated, {$errorCount} errors found."
                        : "Import failed. No places were imported due to validation errors."
                ];
            }

            $successCount = count($records);
            $createdCount = count($createdPlaces);
            $updatedCount = count($updatedPlaces);

            // Queue background geocoding for places without coordinates
            $placesNeedingGeocoding = collect($records)->filter(function($place) {
                return !$place->location && ($place->address || $place->city);
            });

            if ($placesNeedingGeocoding->count() > 0) {
                // Log that geocoding is needed for these places
                Log::info("Places import completed. {$placesNeedingGeocoding->count()} places need geocoding in background.");
            }

            return [
                'records' => $records,
                'summary' => [
                    'total_processed' => $successCount,
                    'created' => $createdCount,
                    'updated' => $updatedCount,
                    'created_places' => $createdPlaces,
                    'updated_places' => $updatedPlaces,
                    'geocoding_queued' => $placesNeedingGeocoding->count()
                ]
            ];

        } catch (\Exception $e) {
            Log::error('Place import failed', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return ['success' => false, 'errors' => [[$e->getMessage()]]];
        }
    }

    // Add this helper method to the PlaceController class
    private function validatePlaceField($field, $value, $rowIndex)
    {
        $errors = [];

        // Skip validation if value is empty
        if (empty($value)) {
            return $errors;
        }

        switch ($field) {
            case 'name':
                if (!preg_match('/^[a-zA-Z0-9\s\-\'\.]+$/', $value)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods.",
                        $value
                    ];
                }
                break;

            case 'code':
                if (!preg_match('/^[a-zA-Z0-9\-_]+$/', $value)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "Code can only contain letters, numbers, hyphens, and underscores. No spaces or special characters allowed.",
                        $value
                    ];
                }
                break;

            case 'street1':
            case 'street2':
                if (!preg_match('/^[a-zA-Z0-9\s\.,\-]+$/', $value)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "Street address can only contain letters, numbers, spaces, periods, hyphens, and commas.",
                        $value
                    ];
                }
                break;

            case 'neighborhood':
                if (!preg_match('/^[a-zA-Z0-9\s\-]+$/', $value)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "Neighborhood can only contain letters, numbers, spaces, and hyphens.",
                        $value
                    ];
                }
                break;

            case 'building':
                if (!preg_match('/^[a-zA-Z0-9\s\-\/]+$/', $value)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "Building can only contain letters, numbers, spaces, hyphens, and forward slashes.",
                        $value
                    ];
                }
                break;

            case 'security_access_code':
                if (!preg_match('/^[a-zA-Z0-9]+$/', $value)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "Security access code can only contain letters and numbers. No special characters or spaces allowed.",
                        $value
                    ];
                }
                break;

            case 'postal_code':
                if (!preg_match('/^[a-zA-Z0-9\s\-]+$/', $value)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "Postal code can only contain letters, numbers, spaces, and hyphens.",
                        $value
                    ];
                }
                break;

            case 'city':
                if (!preg_match("/^[a-zA-Z\s\-']+$/", $value)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "City can only contain letters, spaces, hyphens, and apostrophes.",
                        $value
                    ];
                }
                break;

            case 'state':
                if (!preg_match('/^[a-zA-Z\s\-]+$/', $value)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "State can only contain letters, spaces, and hyphens.",
                        $value
                    ];
                }
                break;

            case 'latitude':
            case 'longitude':
                if (!is_numeric($value)) {
                    $errors[] = [
                        (string)$rowIndex,
                        ucfirst($field) . " must be a valid number.",
                        $value
                    ];
                } elseif ($field === 'latitude' && ($value < -90 || $value > 90)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "Latitude must be between -90 and 90 degrees.",
                        $value
                    ];
                } elseif ($field === 'longitude' && ($value < -180 || $value > 180)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "Longitude must be between -180 and 180 degrees.",
                        $value
                    ];
                }
                break;

            case 'phone':
                if (!preg_match('/^\+[0-9\s\-]+$/', $value)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "Phone number must start with + and contain only numbers, spaces, and hyphens.",
                        $value
                    ];
                } else {
                    $digits = preg_replace('/[^0-9]/', '', $value);
                    if (strlen($digits) < 7 || strlen($digits) > 15) {
                        $errors[] = [
                            (string)$rowIndex,
                            "Phone number must be between 7 and 15 digits (excluding + and formatting).",
                            $value
                        ];
                    }
                }
                break;

            case 'country':
                if (!preg_match('/^[A-Z]{2}$/i', $value)) {
                    $errors[] = [
                        (string)$rowIndex,
                        "Country must be a valid 2-letter ISO code (e.g., US, GB).",
                        $value
                    ];
                }
                break;
        }

        return $errors;
    }

}
