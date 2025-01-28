<?php

namespace Fleetbase\FleetOps\Http\Controllers\Api\v1;

use Fleetbase\FleetOps\Http\Requests\CreateServiceAreaRequest;
use Fleetbase\FleetOps\Http\Requests\UpdateServiceAreaRequest;
use Fleetbase\FleetOps\Http\Resources\v1\DeletedResource;
use Fleetbase\FleetOps\Http\Resources\v1\ServiceArea as ServiceAreaResource;
use Fleetbase\FleetOps\Models\ServiceArea;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Controllers\Controller;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Illuminate\Http\Request;

class ServiceAreaController extends Controller
{
    /**
     * Creates a new Fleetbase ServiceArea resource.
     *
     * @param \Fleetbase\Http\Requests\CreateServiceAreaRequest $request
     *
     * @return \Fleetbase\Http\Resources\ServiceArea
     */
    public function create(CreateServiceAreaRequest $request)
    {
        // get request input
        $input = $request->only(['name', 'type', 'status']);

        // get radius for creating service area border - default to 500 meters
        $radius = (int) $request->input('radius', 500);

        // make sure company is set
        $input['company_uuid'] = session('company');

        // if parent service area set
        if ($request->filled('parent')) {
            $input['parent_uuid'] = Utils::getUuid('service_areas', [
                'public_id'    => $request->input('parent'),
                'company_uuid' => session('company'),
            ]);
        }

        // if latitude and longitude is provided
        if ($request->has(['latitude', 'longitude'])) {
            // create a polygon given the radius
            $latitude  = $request->input('latitude');
            $longitude = $request->input('longitude');
            $point     = new Point($latitude, $longitude);

            if ($point instanceof Point) {
                $input['border'] = ServiceArea::createMultiPolygonFromPoint($point, $radius);
            }
        }

        // if a location is provided
        if ($request->has('location')) {
            $location = $request->input('location');
            $point    = Utils::getPointFromMixed($location);

            if ($point instanceof Point) {
                $input['border'] = ServiceArea::createMultiPolygonFromPoint($point, $radius);
            }
        }

        // create the serviceArea
        try {
            $serviceArea = ServiceArea::create($input);
        } catch (\Throwable $e) {
            dd($e->getMessage());
        }

        // response the driver resource
        return new ServiceAreaResource($serviceArea);
    }

    /**
     * Updates a Fleetbase ServiceArea resource.
     *
     * @param string                                            $id
     * @param \Fleetbase\Http\Requests\UpdateServiceAreaRequest $request
     *
     * @return \Fleetbase\Http\Resources\ServiceArea
     */
    public function update($id, UpdateServiceAreaRequest $request)
    {
        // find for the serviceArea
        try {
            $serviceArea = ServiceArea::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'ServiceArea resource not found.',
                ],
                404
            );
        }

        // get request input
        $input = $request->only(['name', 'type', 'status']);

        // get radius for creating service area border - default to 500 meters
        $radius = $request->input('radius', 500);

        // if parent service area set
        if ($request->filled('parent')) {
            $input['parent_uuid'] = Utils::getUuid('service_areas', [
                'public_id'    => $request->input('parent'),
                'company_uuid' => session('company'),
            ]);
        }

        // if latitude and longitude is provided
        if ($request->has(['latitude', 'longitude'])) {
            // create a polygon given the radius
            $latitude  = $request->input('latitude');
            $longitude = $request->input('longitude');
            $point     = new Point($latitude, $longitude);

            if ($point instanceof Point) {
                $input['border'] = ServiceArea::createMultiPolygonFromPoint($point, $radius);
            }
        }

        // if a location is provided
        if ($request->has('location')) {
            $location = $request->input('location');
            $point    = Utils::getPointFromMixed($location);

            if ($point instanceof Point) {
                $input['border'] = ServiceArea::createMultiPolygonFromPoint($point, $radius);
            }
        }

        // update the serviceArea
        $serviceArea->update($input);

        // response the serviceArea resource
        return new ServiceAreaResource($serviceArea);
    }

    /**
     * Query for Fleetbase ServiceArea resources.
     *
     * @return \Fleetbase\Http\Resources\ServiceAreaCollection
     */
    public function query(Request $request)
    {
        $results = ServiceArea::queryWithRequest($request);

        return ServiceAreaResource::collection($results);
    }

    /**
     * Finds a single Fleetbase ServiceArea resources.
     *
     * @return \Fleetbase\Http\Resources\ServiceAreaCollection
     */
    public function find($id, Request $request)
    {
        // find for the serviceArea
        try {
            $serviceArea = ServiceArea::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'ServiceArea resource not found.',
                ],
                404
            );
        }

        // response the serviceArea resource
        return new ServiceAreaResource($serviceArea);
    }

    /**
     * Deletes a Fleetbase ServiceArea resources.
     *
     * @return \Fleetbase\Http\Resources\ServiceAreaCollection
     */
    public function delete($id, Request $request)
    {
        // find for the driver
        try {
            $serviceArea = ServiceArea::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'ServiceArea resource not found.',
                ],
                404
            );
        }

        // delete the serviceArea
        $serviceArea->delete();

        // response the serviceArea resource
        return new DeletedResource($serviceArea);
    }
}
