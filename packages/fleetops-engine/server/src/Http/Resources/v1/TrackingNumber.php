<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;

class TrackingNumber extends FleetbaseResource
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
            'id'              => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'            => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'       => $this->when(Http::isInternalRequest(), $this->public_id),
            'status_uuid'     => $this->when(Http::isInternalRequest(), $this->status_uuid),
            'owner_uuid'      => $this->when(Http::isInternalRequest(), $this->owner_uuid),
            'owner_type'      => $this->when(Http::isInternalRequest(), $this->owner_type),
            'tracking_number' => $this->tracking_number,
            'subject'         => Utils::get($this->owner, 'public_id'),
            'region'          => $this->region,
            'status'          => $this->last_status,
            'status_code'     => $this->last_status_code,
            'qr_code'         => $this->qr_code,
            'barcode'         => $this->barcode,
            'url'             => Utils::consoleUrl('track-order', ['order' => $this->tracking_number]),
            'type'            => Utils::getTypeFromClassName($this->owner_type),
            'updated_at'      => $this->updated_at,
            'created_at'      => $this->created_at,
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
            'id'              => $this->public_id,
            'tracking_number' => $this->tracking_number,
            'subject'         => Utils::get($this->owner, 'public_id'),
            'region'          => $this->region,
            'qr_code'         => $this->qr_code,
            'barcode'         => $this->barcode,
            'type'            => Utils::getTypeFromClassName($this->owner_type),
            'updated_at'      => $this->updated_at,
            'created_at'      => $this->created_at,
        ];
    }
}
