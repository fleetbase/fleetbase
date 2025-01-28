<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;

class Proof extends FleetbaseResource
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
        return [
            'id'         => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'       => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'  => $this->when(Http::isInternalRequest(), $this->public_id),
            'subject_id' => $this->subject ? $this->subject->public_id : null,
            'order_id'   => $this->order ? $this->order->public_id : null,
            'url'        => $this->file_url,
            'remarks'    => $this->remarks,
            'raw'        => $this->raw_data,
            'data'       => $this->data,
            'updated_at' => $this->updated_at,
            'created_at' => $this->created_at,
        ];
    }
}
