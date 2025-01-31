<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;

class ServiceRate extends FleetbaseResource
{
    /**
     * Transform the resource into an array.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return array
     */
    public function toArray($request)
    {
        return [
            'id'                                         => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'                                       => $this->when(Http::isInternalRequest(), $this->uuid),
            'service_area_uuid'                          => $this->when(Http::isInternalRequest(), $this->service_area_uuid),
            'zone_uuid'                                  => $this->when(Http::isInternalRequest(), $this->zone_uuid),
            'order_config_uuid'                          => $this->when(Http::isInternalRequest(), $this->order_config_uuid),
            'public_id'                                  => $this->when(Http::isInternalRequest(), $this->public_id),
            'service_area'                               => $this->whenLoaded('serviceArea', fn () => new ServiceArea($this->serviceArea)),
            'service_area_name'                          => $this->when(Http::isInternalRequest(), data_get($this, 'serviceArea.name')),
            'zone'                                       => $this->whenLoaded('zone', fn () => new Zone($this->zone)),
            'zone_name'                                  => $this->when(Http::isInternalRequest(), data_get($this, 'zone.name')),
            'service_name'                               => $this->service_name,
            'service_type'                               => $this->service_type,
            'base_fee'                                   => $this->base_fee,
            'rate_calculation_method'                    => $this->rate_calculation_method,
            'per_meter_flat_rate_fee'                    => $this->per_meter_flat_rate_fee,
            'per_meter_unit'                             => $this->per_meter_unit,
            'meter_fees'                                 => ServiceRateFee::collection($this->rateFees ?? []),
            'parcel_fees'                                => ServiceRateParcelFee::collection($this->rateFees ?? []),
            'algorithm'                                  => $this->algorithm,
            'has_cod_fee'                                => Utils::castBoolean($this->has_cod_fee),
            'cod_calculation_method'                     => $this->cod_calculation_method,
            'cod_flat_fee'                               => $this->cod_flat_fee,
            'cod_percent'                                => $this->cod_percent,
            'has_peak_hours_fee'                         => Utils::castBoolean($this->has_peak_hours_fee),
            'peak_hours_calculation_method'              => $this->peak_hours_calculation_method,
            'peak_hours_flat_fee'                        => $this->peak_hours_flat_fee,
            'peak_hours_percent'                         => $this->peak_hours_percent,
            'peak_hours_start'                           => $this->peak_hours_start,
            'peak_hours_end'                             => $this->peak_hours_end,
            'currency'                                   => $this->currency,
            'duration_terms'                             => $this->duration_terms,
            'estimated_days'                             => $this->estimated_days,
            'updated_at'                                 => $this->updated_at,
            'created_at'                                 => $this->created_at,
        ];
    }

    /**
     * Transform the resource into an webhook payload.
     *
     * @return array
     */
    public function toWebhookPayload()
    {
        return [
            'id'                            => $this->public_id,
            'service_area'                  => new ServiceArea($this->serviceArea),
            'zone'                          => new Zone($this->zone),
            'service_name'                  => $this->service_name,
            'service_type'                  => $this->service_type,
            'base_fee'                      => $this->base_fee,
            'rate_calculation_method'       => $this->rate_calculation_method,
            'per_km_flat_rate_fee'          => $this->per_km_flat_rate_fee,
            'meter_fees'                    => ServiceRateFee::collection($this->rateFees ?? []),
            'parcel_fees'                   => ServiceRateParcelFee::collection($this->rateFees ?? []),
            'algorithm'                     => $this->algorithm,
            'has_cod_fee'                   => Utils::castBoolean($this->has_cod_fee),
            'cod_calculation_method'        => $this->cod_calculation_method,
            'cod_flat_fee'                  => $this->cod_flat_fee,
            'cod_percent'                   => $this->cod_percent,
            'has_peak_hours_fee'            => Utils::castBoolean($this->has_peak_hours_fee),
            'peak_hours_calculation_method' => $this->peak_hours_calculation_method,
            'peak_hours_flat_fee'           => $this->peak_hours_flat_fee,
            'peak_hours_percent'            => $this->peak_hours_percent,
            'peak_hours_start'              => $this->peak_hours_start,
            'peak_hours_end'                => $this->peak_hours_end,
            'currency'                      => $this->currency,
            'duration_terms'                => $this->duration_terms,
            'estimated_days'                => $this->estimated_days,
            'updated_at'                    => $this->updated_at,
            'created_at'                    => $this->created_at,
        ];
    }
}
