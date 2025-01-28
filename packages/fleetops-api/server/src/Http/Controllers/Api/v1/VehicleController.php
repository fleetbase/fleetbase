<?php

namespace Fleetbase\FleetOps\Http\Controllers\Api\v1;

use Fleetbase\FleetOps\Http\Requests\CreateVehicleRequest;
use Fleetbase\FleetOps\Http\Requests\UpdateVehicleRequest;
use Fleetbase\FleetOps\Http\Resources\v1\DeletedResource;
use Fleetbase\FleetOps\Http\Resources\v1\Vehicle as VehicleResource;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Vehicle;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    /**
     * Creates a new Fleetbase Vehicle resource.
     *
     * @param \Fleetbase\Http\Requests\CreateVehicleRequest $request
     *
     * @return \Fleetbase\Http\Resources\Vehicle
     */
    public function create(CreateVehicleRequest $request)
    {
        // get request input
        $input = $request->only(['status', 'make', 'model', 'year', 'trim', 'type', 'plate_number', 'vin', 'meta', 'online', 'location', 'altitude', 'heading', 'speed']);
        // make sure company is set
        $input['company_uuid'] = session('company');

        // create instance of vehicle model
        $vehicle = new Vehicle();

        // set default online
        if (!isset($input['online'])) {
            $input['online'] = 0;
        }

        // vendor assignment
        if ($request->has('vendor')) {
            $input['vendor_uuid'] = Utils::getUuid('vendors', [
                'public_id'    => $request->input('vendor'),
                'company_uuid' => session('company'),
            ]);
        }

        // latitude / longitude
        if ($request->has(['latitude', 'longitude'])) {
            $input['location'] = Utils::getPointFromCoordinates($request->only(['latitude', 'longitude']));
        }

        // apply user input to vehicle
        $vehicle = $vehicle->fill($input);

        // save the vehicle
        $vehicle->save();

        // driver assignment
        if ($request->has('driver')) {
            // set this vehicle to the driver
            try {
                $driver = Driver::findRecordOrFail($request->input('driver'));
            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
                return response()->json(
                    [
                        'error' => 'The driver attempted to assign this vehicle was not found.',
                    ],
                    404
                );
            }

            $driver->vehicle_uuid = $vehicle->uuid;
            $driver->save();
        }

        // response the driver resource
        return new VehicleResource($vehicle);
    }

    /**
     * Updates a Fleetbase Vehicle resource.
     *
     * @param string                                        $id
     * @param \Fleetbase\Http\Requests\UpdateVehicleRequest $request
     *
     * @return \Fleetbase\Http\Resources\Vehicle
     */
    public function update($id, UpdateVehicleRequest $request)
    {
        // find for the vehicle
        try {
            $vehicle = Vehicle::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Vehicle resource not found.',
                ],
                404
            );
        }

        // get request input
        $input = $request->only(['status', 'make', 'model', 'year', 'trim', 'type', 'plate_number', 'vin', 'meta', 'location', 'online', 'altitude', 'heading', 'speed']);

        // vendor assignment
        if ($request->has('vendor')) {
            $input['vendor_uuid'] = Utils::getUuid('vendors', [
                'public_id'    => $request->input('vendor'),
                'company_uuid' => session('company'),
            ]);
        }

        // set default online
        if (!isset($input['online'])) {
            $input['online'] = 0;
        }

        // latitude / longitude
        if ($request->has(['latitude', 'longitude'])) {
            $input['location'] = Utils::getPointFromCoordinates($request->only(['latitude', 'longitude']));
        }

        // update the vehicle w/ user input
        $vehicle->fill($input);

        // if the vin has changed do another vin run
        if ($vehicle->isDirty('vin')) {
            $vehicle->applyAllDataFromVin();
        }

        // save the update
        $vehicle->save();

        // get udpated vehicle
        $vehicle = $vehicle->refresh();

        // response the vehicle resource
        return new VehicleResource($vehicle);
    }

    /**
     * Query for Fleetbase Vehicle resources.
     *
     * @return \Fleetbase\Http\Resources\VehicleCollection
     */
    public function query(Request $request)
    {
        $results = Vehicle::queryWithRequest($request, function (&$query, $request) {
            if ($request->has('vendor')) {
                $query->whereHas('vendor', function ($q) use ($request) {
                    $q->where('public_id', $request->input('vendor'));
                });
            }
        });

        return VehicleResource::collection($results);
    }

    /**
     * Finds a single Fleetbase Vehicle resources.
     *
     * @param string $id
     *
     * @return \Fleetbase\Http\Resources\VehicleCollection
     */
    public function find($id)
    {
        // find for the vehicle
        try {
            $vehicle = Vehicle::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Vehicle resource not found.',
                ],
                404
            );
        }

        // response the vehicle resource
        return new VehicleResource($vehicle);
    }

    /**
     * Deletes a Fleetbase Vehicle resources.
     *
     * @param string $id
     *
     * @return \Fleetbase\Http\Resources\VehicleCollection
     */
    public function delete($id)
    {
        // find for the driver
        try {
            $vehicle = Vehicle::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Vehicle resource not found.',
                ],
                404
            );
        }

        // delete the vehicle
        $vehicle->delete();

        // response the vehicle resource
        return new DeletedResource($vehicle);
    }
}
