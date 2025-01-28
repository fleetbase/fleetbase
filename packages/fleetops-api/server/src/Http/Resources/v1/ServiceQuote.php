<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;

class ServiceQuote extends FleetbaseResource
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
            'id'                => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'              => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'         => $this->when(Http::isInternalRequest(), $this->public_id),
            'service_rate_uuid' => $this->when(Http::isInternalRequest(), $this->service_rate_uuid),
            'payload_uuid'      => $this->when(Http::isInternalRequest(), $this->payload_uuid),
            'service_rate_name' => $this->when(Http::isInternalRequest(), data_get($this, 'serviceRate.name')),
            'service_rate'      => $this->when(Http::isPublicRequest(), data_get($this, 'serviceRate.public_id')),
            'facilitator'       => $this->when(Http::isPublicRequest(), data_get($this, 'integratedVendor.public_id')),
            'items'             => ServiceQuoteItem::collection($this->items),
            'request_id'        => $this->request_id,
            'amount'            => $this->amount,
            'currency'          => $this->currency,
            'meta'              => $this->meta ?? [],
            'updated_at'        => $this->updated_at,
            'created_at'        => $this->created_at,
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
            'service_rate' => data_get($this, 'serviceRate.public_id'),
            'facilitator'  => data_get($this, 'integratedVendor.public_id'),
            'request_id'   => $this->request_id,
            'amount'       => $this->amount,
            'currency'     => $this->currency,
            'updated_at'   => $this->updated_at,
            'created_at'   => $this->created_at,
        ];
    }
}
