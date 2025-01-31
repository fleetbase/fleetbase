<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;

class ServiceRateParcelFee extends FleetbaseResource
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
            'id'         => $this->when(Http::isInternalRequest(), $this->id),
            'uuid'       => $this->when(Http::isInternalRequest(), $this->uuid),
            'fee'        => $this->fee,
            'currency'   => $this->currency,
            'distance'   => $this->distance,
            'updated_at' => $this->updated_at,
            'created_at' => $this->created_at,
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
            'fee'        => $this->fee,
            'currency'   => $this->currency,
            'distance'   => $this->distance,
            'updated_at' => $this->updated_at,
            'created_at' => $this->created_at,
        ];
    }
}
