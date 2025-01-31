<?php

namespace Fleetbase\Http\Resources;

use Fleetbase\Models\Setting;
use Fleetbase\Support\Http;

class Organization extends FleetbaseResource
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
            'id'                 => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'               => $this->when(Http::isInternalRequest(), $this->uuid),
            'owner_uuid'         => $this->when(Http::isInternalRequest(), $this->owner_uuid),
            'public_id'          => $this->when(Http::isInternalRequest(), $this->public_id),
            'name'               => $this->name,
            'description'        => $this->description,
            'phone'              => $this->phone,
            'type'               => $this->when(Http::isInternalRequest(), $this->type),
            'users_count'        => $this->when(Http::isInternalRequest(), $this->companyUsers()->count()),
            'timezone'           => $this->timezone,
            'logo_url'           => $this->logo_url,
            'backdrop_url'       => $this->backdrop_url,
            'branding'           => Setting::getBranding(),
            'options'            => $this->options,
            'owner'              => new User($this->owner),
            'slug'               => $this->slug,
            'status'             => $this->status,
            'joined_at'          => $this->when(Http::isInternalRequest() && $request->hasSession() && $request->session()->has('user'), function () {
                if ($this->resource->joined_at) {
                    return $this->resource->joined_at;
                }

                $currentCompanyUser = $this->resource->getCompanyUserPivot(session('user'));
                if ($currentCompanyUser) {
                    return $currentCompanyUser->created_at;
                }
            }),
            'updated_at'         => $this->updated_at,
            'created_at'         => $this->created_at,
        ];
    }
}
