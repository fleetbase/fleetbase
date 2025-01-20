<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;

class VehicleDevice extends FleetbaseResource
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
            'id'                    => $this->when(Http::isInternalRequest(), $this->id),
            'uuid'                  => $this->when(Http::isInternalRequest(), $this->uuid),
            'vehicle_uuid'          => $this->vehicle_uuid,
            'device_id'             => $this->device_id,
            'device_provider'       => $this->device_provider,
            'device_type'           => $this->device_type,
            'device_name'           => $this->device_name,
            'device_model'          => $this->device_model,
            'device_location'       => $this->device_location,
            'manufacturer'          => $this->manufacturer,
            'serial_number'         => $this->serial_number,
            'installation_date'     => $this->installation_date,
            'last_maintenance_date' => $this->last_maintenance_date,
            'meta'                  => $this->meta ?? [],
            'data'                  => $this->data ?? [],
            'status'                => $this->status,
            'data_frequency'        => $this->data_frequency,
            'notes'                 => $this->notes,
            'updated_at'            => $this->updated_at,
            'created_at'            => $this->created_at,
        ];
    }
}
