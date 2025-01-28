<?php

namespace Fleetbase\Http\Resources;

use Fleetbase\Support\Http;

class Author extends FleetbaseResource
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
            'id'            => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'          => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'     => $this->when(Http::isInternalRequest(), $this->public_id),
            'company_uuid'  => $this->when(Http::isInternalRequest(), $this->company_uuid),
            'avatar_uuid'   => $this->when(Http::isInternalRequest(), $this->avatar_uuid),
            'name'          => $this->name,
            'email'         => $this->email,
            'phone'         => $this->phone,
            'country'       => $this->country,
            'avatar_url'    => $this->avatar_url,
            'company_name'  => $this->company_name,
            // 'type'          => $this->type,
            'is_admin'      => $this->is_admin,
            'timezone'      => $this->timezone,
            'updated_at'    => $this->updated_at,
            'created_at'    => $this->created_at,
        ];
    }
}
