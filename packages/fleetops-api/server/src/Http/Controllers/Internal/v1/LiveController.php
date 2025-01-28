<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Http\Filter\PlaceFilter;
use Fleetbase\FleetOps\Http\Resources\v1\Driver as DriverResource;
use Fleetbase\FleetOps\Http\Resources\v1\Order as OrderResource;
use Fleetbase\FleetOps\Http\Resources\v1\Place as PlaceResource;
use Fleetbase\FleetOps\Http\Resources\v1\Vehicle as VehicleResource;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Models\Place;
use Fleetbase\FleetOps\Models\Route;
use Fleetbase\FleetOps\Models\Vehicle;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Class LiveController.
 */
class LiveController extends Controller
{
    /**
     * Get coordinates for active orders.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function coordinates()
    {
        $coordinates = [];

        // Fetch active orders for the current company
        $orders = Order::where('company_uuid', session('company'))
            ->whereNotIn('status', ['canceled', 'completed'])
            ->applyDirectivesForPermissions('fleet-ops list order')
            ->get();

        // Loop through each order to get its current destination location
        foreach ($orders as $order) {
            $coordinates[] = $order->getCurrentDestinationLocation();
        }

        return response()->json($coordinates);
    }

    /**
     * Get active routes for the current company.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function routes()
    {
        // Fetch routes that are not canceled or completed and have an assigned driver
        $routes = Route::where('company_uuid', session('company'))
            ->whereHas(
                'order',
                function ($q) {
                    $q->whereNotIn('status', ['canceled', 'completed']);
                    $q->whereNotNull('driver_assigned_uuid');
                    $q->whereNull('deleted_at');
                }
            )
            ->applyDirectivesForPermissions('fleet-ops list route')
            ->get();

        return response()->json($routes);
    }

    /**
     * Get active orders with payload for the current company.
     *
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection
     */
    public function orders(Request $request)
    {
        $exclude    = $request->array('exclude');
        $active     = $request->boolean('active');
        $unassigned = $request->boolean('unassigned');

        $query = Order::where('company_uuid', session('company'))
            ->whereHas('payload', function ($query) {
                $query->where(
                    function ($q) {
                        $q->whereHas('waypoints');
                        $q->orWhereHas('pickup');
                        $q->orWhereHas('dropoff');
                    }
                );
                $query->with(['entities', 'waypoints', 'dropoff', 'pickup', 'return']);
            })
            ->whereNotIn('status', ['canceled', 'completed', 'expired'])
            ->whereHas('trackingNumber')
            ->whereHas('trackingStatuses')
            ->whereNotIn('public_id', $exclude)
            ->whereNull('deleted_at')
            ->applyDirectivesForPermissions('fleet-ops list order')
            ->with(['payload', 'trackingNumber', 'trackingStatuses']);

        if ($active) {
            $query->whereHas('driverAssigned');
        }

        if ($unassigned) {
            $query->whereNull('driver_assigned_uuid');
        }

        $orders = $query->get();

        // Get additional data or load missing if necessary
        $orders->map(
            function ($order) use ($request) {
                // load required relations
                $order->loadMissing(['trackingNumber', 'payload', 'trackingStatuses']);

                // load tracker data
                if ($request->has('with_tracker_data')) {
                    $order->tracker_data = $order->tracker()->toArray();
                    $order->eta          = $order->tracker()->eta();
                }

                return $order;
            }
        );

        return OrderResource::collection($orders);
    }

    /**
     * Get drivers for the current company.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function drivers()
    {
        $drivers = Driver::where(['company_uuid' => session('company')])
            ->applyDirectivesForPermissions('fleet-ops list driver')
            ->get();

        return DriverResource::collection($drivers);
    }

    /**
     * Get vehicles for the current company.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function vehicles()
    {
        // Fetch vehicles that are online
        $vehicles = Vehicle::where(['company_uuid' => session('company')])
            ->with(['devices'])
            ->applyDirectivesForPermissions('fleet-ops list vehicle')
            ->get();

        return VehicleResource::collection($vehicles);
    }

    /**
     * Get places based on filters for the current company.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function places(Request $request)
    {
        // Query places based on filters
        $places = Place::where(['company_uuid' => session('company')])
            ->filter(new PlaceFilter($request))
            ->applyDirectivesForPermissions('fleet-ops list place')
            ->get();

        return PlaceResource::collection($places);
    }
}
