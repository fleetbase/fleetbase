<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;

class Zone extends FleetbaseResource
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
            'id'           => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'         => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'    => $this->when(Http::isInternalRequest(), $this->public_id),
            'name'         => $this->name,
            'description'  => $this->description,
            'center'       => $this->location,
            'border'       => $this->border,
            'color'        => $this->color,
            'stroke_color' => $this->stroke_color,
            'status'       => $this->status,
            'updated_at'   => $this->updated_at,
            'created_at'   => $this->created_at,
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
            'description'  => $this->description,
            'center'       => $this->location,
            'border'       => $this->border,
            'color'        => $this->color,
            'stroke_color' => $this->stroke_color,
            'status'       => $this->status,
            'updated_at'   => $this->updated_at,
            'created_at'   => $this->created_at,
        ];
    }
}
