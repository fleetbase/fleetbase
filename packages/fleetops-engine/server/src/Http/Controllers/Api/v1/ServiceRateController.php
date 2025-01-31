<?php

namespace Fleetbase\FleetOps\Http\Controllers\Api\v1;

use Fleetbase\FleetOps\Http\Requests\CreateServiceRateRequest;
use Fleetbase\FleetOps\Http\Requests\UpdateServiceRateRequest;
use Fleetbase\FleetOps\Http\Resources\v1\DeletedResource;
use Fleetbase\FleetOps\Http\Resources\v1\ServiceRate as ServiceRateResource;
use Fleetbase\FleetOps\Models\ServiceRate;
use Fleetbase\FleetOps\Models\ServiceRateFee;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ServiceRateController extends Controller
{
    /**
     * Creates a new Fleetbase ServiceRate resource.
     *
     * @param \Fleetbase\Http\Requests\CreateServiceRateRequest $request
     *
     * @return \Fleetbase\Http\Resources\ServiceRate
     */
    public function create(CreateServiceRateRequest $request)
    {
        // get request input
        $input = $request->only([
            'service_name',
            'service_type',
            'rate_calculation_method',
            'currency',
            'base_fee',
            'per_meter_unit',
            'per_meter_flat_rate_fee',
            'meter_fees',
            'meter_fees.*.distance',
            'meter_fees.*.fee',
            'algorithm',
            'has_cod_fee',
            'cod_calculation_method',
            'cod_flat_fee',
            'cod_percent',
            'has_peak_hours_fee',
            'peak_hours_calculation_method',
            'peak_hours_flat_fee',
            'peak_hours_percent',
            'peak_hours_start',
            'peak_hours_end',
            'duration_terms',
            'estimated_days',
        ]);

        // make sure company is set
        $input['company_uuid'] = session('company');

        // service area assignment
        if ($request->has('service_area')) {
            $input['service_area_uuid'] = Utils::getUuid('service_areas', [
                'public_id'    => $request->input('service_area'),
                'company_uuid' => session('company'),
            ]);
        }

        // zone assignment
        if ($request->has('zone')) {
            $input['zone_uuid'] = Utils::getUuid('zones', [
                'public_id'    => $request->input('zone'),
                'company_uuid' => session('company'),
            ]);
        }

        // create the serviceRate
        $serviceRate = ServiceRate::create($input);

        // create service rate fee's if applicable
        if ($request->has('meter_fees') && $serviceRate->isRateCalculationMethod('fixed_meter') && is_array($request->input('meter_fees'))) {
            foreach ($request->input('meter_fees') as $meterFee) {
                ServiceRateFee::create([
                    'service_rate_uuid' => $serviceRate->uuid,
                    'distance'          => Utils::get($meterFee, 'distance'),
                    'distance_unit'     => $request->input('per_meter_unit', 'm'),
                    'fee'               => Utils::get($meterFee, 'fee'),
                    'currency'          => $serviceRate->currency,
                ]);
            }
            $serviceRate->makeVisible('meter_fees');
        }

        // response the driver resource
        return new ServiceRateResource($serviceRate);
    }

    /**
     * Updates a Fleetbase ServiceRate resource.
     *
     * @param string                                            $id
     * @param \Fleetbase\Http\Requests\UpdateServiceRateRequest $request
     *
     * @return \Fleetbase\Http\Resources\ServiceRate
     */
    public function update($id, UpdateServiceRateRequest $request)
    {
        // find for the serviceRate
        try {
            $serviceRate = ServiceRate::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'ServiceRate resource not found.',
                ],
                404
            );
        }

        // get request input
        $input = $request->only([
            'service_name',
            'service_type',
            'rate_calculation_method',
            'currency',
            'base_fee',
            'per_km_flat_rate_fee',
            'meter_fees',
            'meter_fees.*.distance',
            'meter_fees.*.fee',
            'algorithm',
            'has_cod_fee',
            'cod_calculation_method',
            'cod_flat_fee',
            'cod_percent',
            'has_peak_hours_fee',
            'peak_hours_calculation_method',
            'peak_hours_flat_fee',
            'peak_hours_percent',
            'peak_hours_start',
            'peak_hours_end',
            'duration_terms',
            'estimated_days',
        ]);

        // service area assignment
        if ($request->has('service_area')) {
            $input['service_area_uuid'] = Utils::getUuid('service_areas', [
                'public_id'    => $request->input('service_area'),
                'company_uuid' => session('company'),
            ]);
        }

        // zone assignment
        if ($request->has('zone')) {
            $input['zone_uuid'] = Utils::getUuid('zones', [
                'public_id'    => $request->input('zone'),
                'company_uuid' => session('company'),
            ]);
        }

        // update the serviceRate
        $serviceRate->update($input);

        // response the serviceRate resource
        return new ServiceRateResource($serviceRate);
    }

    /**
     * Query for Fleetbase ServiceRate resources.
     *
     * @return \Fleetbase\Http\Resources\ServiceRateCollection
     */
    public function query(Request $request)
    {
        $results = ServiceRate::queryWithRequest($request);

        return ServiceRateResource::collection($results);
    }

    /**
     * Finds a single Fleetbase ServiceRate resources.
     *
     * @return \Fleetbase\Http\Resources\ServiceRateCollection
     */
    public function find($id)
    {
        // find for the serviceRate
        try {
            $serviceRate = ServiceRate::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'ServiceRate resource not found.',
                ],
                404
            );
        }

        // response the serviceRate resource
        return new ServiceRateResource($serviceRate);
    }

    /**
     * Deletes a Fleetbase ServiceRate resources.
     *
     * @return \Fleetbase\Http\Resources\ServiceRateCollection
     */
    public function delete($id)
    {
        // find for the driver
        try {
            $serviceRate = ServiceRate::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'ServiceRate resource not found.',
                ],
                404
            );
        }

        // delete the serviceRate
        $serviceRate->delete();

        // response the serviceRate resource
        return new DeletedResource($serviceRate);
    }
}
