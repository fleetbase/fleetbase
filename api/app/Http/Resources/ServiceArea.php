<?php

namespace App\Http\Resources;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;

class ServiceArea extends FleetbaseResource
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
            'id'         => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'       => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'  => $this->when(Http::isInternalRequest(), $this->public_id),
            'name'       => $this->name,
            'type'       => $this->type,
            'center'     => $this->location,
            'border'     => $this->border,
            'zones'      => $this->whenLoaded('zones', fn () => Zone::collection($this->zones)),
            'status'     => $this->status,
            'updated_at' => $this->updated_at,
            'created_at' => $this->created_at,
            'address','location_ref','telephone','location'
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
            'id'         => $this->public_id,
            'name'       => $this->name,
            'type'       => $this->type,
            'center'     => $this->location,
            'border'     => $this->border,
            'status'     => $this->status,
            'updated_at' => $this->updated_at,
            'created_at' => $this->created_at,
        ];
    }
}
