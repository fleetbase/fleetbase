<?php

namespace Fleetbase\FleetOps\Http\Resources\Internal\v1;

use Fleetbase\FleetOps\Http\Resources\v1\Place;
use Illuminate\Http\Resources\Json\JsonResource;

class Waypoint extends JsonResource
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
        $place = (new Place($this->place))->toArray($request);

        return array_merge(
            $place,
            [
                'uuid'                 => $this->place->uuid,
                'waypoint_uuid'        => $this->uuid,
                'waypoint_public_id'   => $this->public_id,
                'tracking_number_uuid' => $this->tracking_number_uuid,
                'tracking'             => $this->tracking,
                'status'               => $this->status,
                'status_code'          => $this->status_code,
            ]
        );
    }
}
