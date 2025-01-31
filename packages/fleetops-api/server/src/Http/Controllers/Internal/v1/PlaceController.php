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

class PlaceController extends FleetOpsController
{
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
                Excel::import(new PlaceImport(), $file->path, $disk);
            } catch (\Throwable $e) {
                return response()->error('Invalid file, unable to proccess.');
            }
        }

        return response()->json(['status' => 'ok', 'message' => 'Import completed']);
    }
}
