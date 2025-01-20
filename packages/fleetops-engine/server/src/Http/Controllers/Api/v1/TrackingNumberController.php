<?php

namespace Fleetbase\FleetOps\Http\Controllers\Api\v1;

use Fleetbase\FleetOps\Http\Requests\CreateTrackingNumberRequest;
use Fleetbase\FleetOps\Http\Requests\DecodeTrackingNumberQR;
use Fleetbase\FleetOps\Http\Resources\v1\DeletedResource;
use Fleetbase\FleetOps\Http\Resources\v1\TrackingNumber as TrackingNumberResource;
use Fleetbase\FleetOps\Models\TrackingNumber;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;

class TrackingNumberController extends Controller
{
    /**
     * Creates a new Fleetbase TrackingNumber resource.
     *
     * @param \Fleetbase\Http\Requests\CreateTrackingNumberRequest $request
     *
     * @return \Fleetbase\Http\Resources\TrackingNumber
     */
    public function create(CreateTrackingNumberRequest $request)
    {
        // get request input
        $input = $request->only(['region', 'type']);

        // make sure company is set
        $input['company_uuid'] = session('company');

        // owner assignment
        if ($request->has('owner')) {
            $owner = Utils::getUuid(
                ['orders', 'entities'],
                [
                    'public_id'    => $request->input('owner'),
                    'company_uuid' => session('company'),
                ]
            );

            if (is_array($owner)) {
                $input['owner_uuid']       = Utils::get($owner, 'uuid');
                $input['owner_type']       = Utils::getModelClassName(Utils::get($owner, 'table'));
            }
        }

        // create the trackingNumber
        $trackingNumber = TrackingNumber::create($input);

        // response the driver resource
        return new TrackingNumberResource($trackingNumber);
    }

    /**
     * Query for Fleetbase TrackingNumber resources.
     *
     * @return \Fleetbase\Http\Resources\TrackingNumberCollection
     */
    public function query(Request $request)
    {
        $results = TrackingNumber::queryWithRequest($request);

        return TrackingNumberResource::collection($results);
    }

    /**
     * Finds a single Fleetbase TrackingNumber resources.
     *
     * @return \Fleetbase\Http\Resources\TrackingNumberCollection
     */
    public function find($id)
    {
        // find for the trackingNumber
        try {
            $trackingNumber = TrackingNumber::findTrackingOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'TrackingNumber resource not found.',
                ],
                404
            );
        }

        // response the trackingNumber resource
        return new TrackingNumberResource($trackingNumber);
    }

    /**
     * Deletes a Fleetbase TrackingNumber resources.
     *
     * @return \Fleetbase\Http\Resources\TrackingNumberCollection
     */
    public function delete($id, Request $request)
    {
        // find for the driver
        try {
            $trackingNumber = TrackingNumber::findTrackingOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'TrackingNumber resource not found.',
                ],
                404
            );
        }

        // delete the trackingNumber
        $trackingNumber->delete();

        // response the trackingNumber resource
        return new DeletedResource($trackingNumber);
    }

    /**
     * Take the uuid value of an entity QR code and return the object.
     *
     * @param Request $request
     *
     * @return \Illuminate\Http\Response
     */
    public function fromQR(DecodeTrackingNumberQR $request)
    {
        // validate request inputs
        $code = $request->input('code');

        // get the model of from the code
        $model = Utils::findModel(['entities', 'orders'], ['uuid' => $code]);

        // if no model response with error
        if (!$model) {
            return response()->json(
                [
                    'error' => 'Unable to find QR code value',
                ],
                400
            );
        }

        // get the model class name
        $modelType         = class_basename($model);
        $resourceNamespace = '\\Fleetbase\\Http\\Resources\\v1\\' . $modelType;

        return new $resourceNamespace($model);
    }
}
