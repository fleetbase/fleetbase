<?php

namespace Fleetbase\FleetOps\Http\Controllers\Api\v1;

use Fleetbase\FleetOps\Http\Requests\CreatePayloadRequest;
use Fleetbase\FleetOps\Http\Requests\UpdatePayloadRequest;
use Fleetbase\FleetOps\Http\Resources\v1\DeletedResource;
use Fleetbase\FleetOps\Http\Resources\v1\Payload as PayloadResource;
use Fleetbase\FleetOps\Models\Payload;
use Fleetbase\FleetOps\Models\Place;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

// use Fleetbase\FleetOps\Support\Utils;

class PayloadController extends Controller
{
    /**
     * Creates a new Fleetbase Payload resource.
     *
     * @param \Fleetbase\Http\Requests\CreatePayloadRequest $request
     *
     * @return \Fleetbase\Http\Resources\Payload
     */
    public function create(CreatePayloadRequest $request)
    {
        $input     = $request->all();
        $entities  = data_get($input, 'entities', []);
        $waypoints = data_get($input, 'waypoints', []);
        $pickup    = data_get($input, 'pickup');
        $dropoff   = data_get($input, 'dropoff');
        $return    = data_get($input, 'return');

        // make sure company is set
        $input['company_uuid'] = session('company');

        // create the payload
        $payload = new Payload(Arr::only($input, ['type', 'provider', 'meta', 'cod_amount', 'cod_currency', 'cod_payment_method']));

        // set pickup point
        if ($pickup) {
            $payload->setPickup($pickup);
        }

        // set dropoff point
        if ($dropoff) {
            $payload->setDropoff($dropoff);
        }

        // set return point
        if ($return) {
            $payload->setReturn($return);
        }

        // save payload
        $payload->save();

        // set waypoints and entities after payload is saved
        $payload->setWaypoints($waypoints);
        $payload->setEntities($entities);

        // set the first / current waypoint
        $firstWaypoint = $payload->getPickupOrFirstWaypoint();
        if ($firstWaypoint instanceof Place) {
            $payload->setCurrentWaypoint($firstWaypoint);
        }

        // response the driver resource
        return new PayloadResource($payload);
    }

    /**
     * Updates a Fleetbase Payload resource.
     *
     * @param string                                        $id
     * @param \Fleetbase\Http\Requests\UpdatePayloadRequest $request
     *
     * @return \Fleetbase\Http\Resources\Payload
     */
    public function update($id, UpdatePayloadRequest $request)
    {
        // find for the payload
        try {
            $payload = Payload::findRecordOrFail($id, ['waypoints']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Payload resource not found.',
                ],
                404
            );
        }

        // get request input
        $input     = $request->all();
        $entities  = data_get($input, 'entities', []);
        $waypoints = data_get($input, 'waypoints', []);
        $pickup    = data_get($input, 'pickup');
        $dropoff   = data_get($input, 'dropoff');
        $return    = data_get($input, 'return');

        // pickup assignment
        if ($pickup) {
            $payload->setPickup($pickup);
        }

        // dropoff assignment
        if ($dropoff) {
            $payload->setDropoff($dropoff);
        }

        // return assignment
        if ($return) {
            $payload->setReturn($return);
        }

        // set waypoints
        if ($waypoints) {
            $payload->setWaypoints($waypoints);
        }

        // set entities
        if ($entities) {
            $payload->setEntities($entities);
        }

        // update the payload
        $payload->fill(array_filter(Arr::only($input, ['type', 'provider', 'meta', 'cod_amount', 'cod_currency', 'cod_payment_method'])));

        // save the payload
        $payload->save();

        // make sure entities and waypoints is loaded
        $payload->load(['entities', 'waypoints', 'pickup', 'dropoff', 'return']);

        // response the payload resource
        return new PayloadResource($payload);
    }

    /**
     * Query for Fleetbase Payload resources.
     *
     * @return \Fleetbase\Http\Resources\PayloadCollection
     */
    public function query(Request $request)
    {
        $results = Payload::queryWithRequest($request);

        return PayloadResource::collection($results);
    }

    /**
     * Finds a single Fleetbase Payload resources.
     *
     * @return \Fleetbase\Http\Resources\Payload
     */
    public function find($id, Request $request)
    {
        // find for the payload
        try {
            $payload = Payload::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Payload resource not found.',
                ],
                404
            );
        }

        // response the payload resource
        return new PayloadResource($payload);
    }

    /**
     * Deletes a Fleetbase Payload resources.
     *
     * @return \Fleetbase\Http\Resources\Payload
     */
    public function delete($id, Request $request)
    {
        // find for the driver
        try {
            $payload = Payload::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Payload resource not found.',
                ],
                404
            );
        }

        // delete the payload
        $payload->delete();

        // response the payload resource
        return new DeletedResource($payload);
    }
}
