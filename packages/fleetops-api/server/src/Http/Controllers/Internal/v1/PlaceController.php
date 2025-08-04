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
        
        $result = $this->processImportWithErrorHandling($files, 'place', function($file) {
            $disk = config('filesystems.default');
            $data = Excel::toArray(new PlaceImport(), $file->path, $disk);
            $totalRows = collect($data)->flatten(1)->count();
            Log::info('Total rows: ' . $totalRows .", Company: ". session('company'));
            
            if ($totalRows > config('params.maximum_import_row_size')) {
                return [
                    'success' => false,
                    'errors' => [['N/A', "Import failed: Maximum of 500 rows allowed. Your file contains {$totalRows} rows.", 'N/A']]
                ];
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

            foreach ($excelData as $sheetIndex => $sheetRows) {
                $sheetRowsWithIndex = collect($sheetRows)->map(function ($row, $originalIndex) {
                    $row['_original_row_index'] = $originalIndex;
                    return $row;
                });

                foreach ($sheetRowsWithIndex as $rowIndex => $row) {
                    $originalRowIndex = $row['_original_row_index'] ?? $rowIndex;
                    $displayRowIndex = $originalRowIndex + 1;

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

                        // Check for duplicate place code if provided
                        if (!empty($row['code'])) {
                            $existingPlace = Place::where('code', $row['code'])
                                ->where('company_uuid', session('company'))
                                ->whereNull('deleted_at')
                                ->first();

                            if ($existingPlace) {
                                $importErrors[] = [
                                    (string)$displayRowIndex,
                                    "Place code '{$row['code']}' already exists.",
                                    $row['code']
                                ];
                                continue;
                            }
                        }

                        // Use the existing PlaceImport logic via Place::createFromImport
                        $place = Place::createFromImport($row, true);
                        
                        if ($place) {
                            $records[] = $place;
                            $createdPlaces[] = $place->uuid;
                        }

                    } catch (\Exception $e) {
                        $importErrors[] = [
                            (string)$displayRowIndex,
                            "Failed to create place: " . $e->getMessage(),
                            $row['code'] ?? $row['name']
                        ];
                    }
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

            return [
                'records' => $records,
                'summary' => [
                    'total_processed' => $successCount,
                    'created' => $createdCount,
                    'updated' => $updatedCount,
                    'created_places' => $createdPlaces,
                    'updated_places' => $updatedPlaces
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

}
