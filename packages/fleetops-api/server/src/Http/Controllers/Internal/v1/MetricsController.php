<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Support\Metrics;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MetricsController extends Controller
{
    /**
     * Gets all key metrics for the current session.
     *
     * @return \Illuminate\Http\Response
     */
    public function all(Request $request)
    {
        $start    = $request->date('start');
        $end      = $request->date('end');
        $discover = $request->array('discover', []);

        try {
            $data = Metrics::forCompany($request->user()->company, $start, $end)->with($discover)->get();
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        }

        return response()->json($data);
    }
}
