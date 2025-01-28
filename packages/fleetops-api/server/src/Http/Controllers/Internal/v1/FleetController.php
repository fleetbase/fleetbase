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

class FleetController extends FleetOpsController
{
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
        ])->exists();

        if (!$exists) {
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
        $disk           = $request->input('disk', config('filesystems.default'));
        $files          = $request->resolveFilesFromIds();

        foreach ($files as $file) {
            try {
                Excel::import(new FleetImport(), $file->path, $disk);
            } catch (\Throwable $e) {
                return response()->error('Invalid file, unable to proccess.');
            }
        }

        return response()->json(['status' => 'ok', 'message' => 'Import completed']);
    }
}
