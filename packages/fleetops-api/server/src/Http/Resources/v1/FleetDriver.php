<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;


class FleetDriver extends FleetbaseResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function toArray($request)
    {
        return [
            'uuid'        => $this->when(Http::isInternalRequest(), $this->uuid),   
            'fleet_uuid'  => $this->fleet_uuid,
            'driver_uuid' => $this->driver_uuid,
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
            'deleted_at'  => $this->deleted_at,
            'fleet'  => new Fleet($this->whenLoaded('fleet')),
        ];
    }
}
