<?php

namespace Fleetbase\FleetOps\Http\Resources\Internal\v1;

use Fleetbase\FleetOps\Http\Resources\v1\VehicleWithoutDriver;
use Illuminate\Support\Arr;

class Vehicle extends VehicleWithoutDriver
{
    /**
     * Transform the resource into an array.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        $vehicle = parent::toArray($request);
        $vehicle = Arr::insertAfterKey(
            $vehicle,
            [
                'uuid'         => $this->uuid,
                'public_id'    => $this->public_id,
                'display_name' => $this->display_name,
                'driver_name'  => $this->driver_name,
            ],
            'id'
        );

        return $vehicle;
    }
}
