<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;

class ParentFleet extends FleetbaseResource
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
            'id'                    => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'                  => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'             => $this->when(Http::isInternalRequest(), $this->public_id),
            'name'                  => $this->name,
            'task'                  => $this->task ?? null,
            'status'                => $this->status ?? null,
            'drivers_count'         => $this->when(Http::isInternalRequest(), $this->drivers_count),
            'drivers_online_count'  => $this->when(Http::isInternalRequest(), $this->drivers_online_count),
            'vehicles_count'        => $this->when(Http::isInternalRequest(), $this->vehicles_count),
            'vehicles_online_count' => $this->when(Http::isInternalRequest(), $this->vehicles_online_count),
            'service_area'          => $this->whenLoaded('serviceArea', fn () => new ServiceArea($this->serviceArea)),
            'zone'                  => $this->whenLoaded('zone', fn () => new Zone($this->zone)),
            'vendor'                => $this->whenLoaded('vendor', fn () => new Vendor($this->vendor)),
            'drivers'               => $this->whenLoaded('drivers', fn () => Driver::collection($this->drivers()->without(['driverAssigned'])->with(Http::isInternalRequest() ? ['jobs'] : [])->get())),
            'vehicles'              => $this->whenLoaded('vehicles', fn () => Vehicle::collection($this->vehicles)),
            'subfleets'             => [],
            'type'                  => 'fleet',
            'updated_at'            => $this->updated_at,
            'created_at'            => $this->created_at,
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
            'id'           => $this->public_id,
            'name'         => $this->name,
            'task'         => $this->task ?? null,
            'status'       => $this->status ?? null,
            'service_area' => $this->when($this->serviceArea, data_get($this, 'serviceArea.public_id')),
            'zone'         => $this->when($this->zone, data_get($this, 'zone.public_id')),
            'updated_at'   => $this->updated_at,
            'created_at'   => $this->created_at,
        ];
    }
}
