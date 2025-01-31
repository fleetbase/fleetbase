<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;

class PurchaseRate extends FleetbaseResource
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
            'id'            => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'          => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'     => $this->when(Http::isInternalRequest(), $this->public_id),
            'service_quote' => $this->when(Http::isInternalRequest(), $this->serviceQuote(), $this->service_quote_id),
            'order'         => $this->order_id,
            'customer'      => $this->customer_id,
            'transaction'   => $this->transaction_id,
            'amount'        => $this->amount,
            'currency'      => $this->currency,
            'status'        => $this->status,
            // 'type'          => $this->when(Http::isInternalRequest(), 'service-rate'),
            'updated_at'    => $this->updated_at,
            'created_at'    => $this->created_at,
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
            'id'            => $this->public_id,
            'service_quote' => $this->service_quote_id,
            'order'         => $this->order_id,
            'customer'      => $this->customer_id,
            'transaction'   => $this->transaction_id,
            'amount'        => $this->amount,
            'currency'      => $this->currency,
            'status'        => $this->status,
            'updated_at'    => $this->updated_at,
            'created_at'    => $this->created_at,
        ];
    }

    /**
     * Returns the correct service_quote resource if applicable.
     *
     * @return Illuminate\Http\Resources\Json\JsonResource|null
     */
    public function serviceQuote()
    {
        if ($this->resource && method_exists($this->resource, 'loadMissing')) {
            $this->resource->loadMissing('serviceQuote');

            return $this->resource->serviceQuote ? new ServiceQuote($this->resource->serviceQuote) : null;
        }

        if (method_exists($this, 'loadMissing')) {
            $this->loadMissing('serviceQuote');

            return $this->serviceQuote ? new ServiceQuote($this->serviceQuote) : null;
        }

        return null;
    }
}
