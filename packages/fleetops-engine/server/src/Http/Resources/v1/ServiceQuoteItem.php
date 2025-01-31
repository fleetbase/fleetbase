<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;

class ServiceQuoteItem extends FleetbaseResource
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
            'id'                 => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'               => $this->when(Http::isInternalRequest(), $this->uuid),
            'service_quote_uuid' => $this->when(Http::isInternalRequest(), $this->service_quote_uuid),
            'amount'             => $this->amount,
            'currency'           => $this->currency,
            'details'            => $this->details,
            'code'               => $this->code,
        ];
    }
}
