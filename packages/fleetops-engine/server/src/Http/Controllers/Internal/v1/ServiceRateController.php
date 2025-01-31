<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Brick\Geo\Point;
use Fleetbase\FleetOps\Exports\ServiceRateExport;
use Fleetbase\FleetOps\Http\Controllers\FleetOpsController;
use Fleetbase\FleetOps\Models\ServiceRate;
use Fleetbase\Http\Requests\ExportRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class ServiceRateController extends FleetOpsController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'service_rate';

    /**
     * Creates a record with request payload.
     *
     * @return \Illuminate\Http\Response
     */
    public function getServicesForRoute(Request $request)
    {
        $coordinates = explode(';', $request->input('coordinates')); // ex. 1.3621663,103.8845049;1.353151,103.86458

        // convert coordinates to points
        $waypoints = collect($coordinates)->map(
            function ($coord) {
                $coord                  = explode(',', $coord);
                [$latitude, $longitude] = $coord;

                return Point::fromText("POINT($longitude $latitude)", 4326);
            }
        );

        $applicableServiceRates = ServiceRate::getServicableForWaypoints(
            $waypoints,
            function ($query) use ($request) {
                $query->where('company_uuid', $request->session()->get('company'));
                if ($request->filled('service_type')) {
                    $query->where('service_type', $request->input('service_type'));
                }
            }
        );

        return response()->json($applicableServiceRates);
    }

    /**
     * Export the service rate to excel or csv.
     *
     * @return \Illuminate\Http\Response
     */
    public static function export(ExportRequest $request)
    {
        $format       = $request->input('format', 'xlsx');
        $selections   = $request->array('selections');
        $fileName     = trim(Str::slug('contacts-' . date('Y-m-d-H:i')) . '.' . $format);

        return Excel::download(new ServiceRateExport($selections), $fileName);
    }
}
