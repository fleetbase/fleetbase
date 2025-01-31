<?php

namespace Fleetbase\Http\Resources;

use Fleetbase\Support\Http;

class User extends FleetbaseResource
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
            'id'                                                      => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'                                                    => $this->when(Http::isInternalRequest(), $this->uuid),
            'company_uuid'                                            => $this->when(Http::isInternalRequest(), $this->company_uuid),
            'public_id'                                               => $this->when(Http::isInternalRequest(), $this->public_id),
            'company'                                                 => $this->when(Http::isPublicRequest(), $this->company ? $this->company->public_id : null),
            'name'                                                    => $this->name,
            'username'                                                => $this->username,
            'email'                                                   => $this->email,
            'phone'                                                   => $this->phone,
            'country'                                                 => $this->country,
            'timezone'                                                => $this->timezone,
            'avatar_url'                                              => $this->avatar_url,
            'meta'                                                    => $this->meta,
            'role'                                                    => $this->when(Http::isInternalRequest(), new Role($this->role), null),
            'policies'                                                => $this->when(Http::isInternalRequest(), Policy::collection($this->policies), []),
            'permissions'                                             => $this->when(Http::isInternalRequest(), $this->serializePermissions($this->permissions), []),
            'role_name'                                               => $this->when(Http::isInternalRequest(), $this->role ? $this->role->name : null),
            'type'                                                    => $this->type,
            'locale'                                                  => $this->getLocale(),
            'types'                                                   => $this->when(Http::isInternalRequest(), $this->types ?? []),
            'company_name'                                            => $this->when(Http::isInternalRequest(), $this->company_name),
            'session_status'                                          => $this->when(Http::isInternalRequest(), $this->session_status),
            'is_admin'                                                => $this->when(Http::isInternalRequest(), $this->is_admin),
            'is_online'                                               => $this->is_online,
            'date_of_birth'                                           => $this->date_of_birth,
            'email_verified_at'                                       => $this->email_verified_at,
            'phone_verified_at'                                       => $this->phone_verified_at,
            'last_seen_at'                                            => $this->last_seen_at,
            'last_login'                                              => $this->last_login,
            'updated_at'                                              => $this->updated_at,
            'created_at'                                              => $this->created_at,
        ];
    }

    /**
     * Map permissins into the correct format with regard to pivot.
     *
     * @param \Illuminate\Support\Collection $permissions
     */
    public function serializePermissions($permissions): \Illuminate\Support\Collection
    {
        return $permissions->map(
            function ($permission) {
                return [
                    'id'          => $permission->pivot->permission_id,
                    'name'        => $permission->name,
                    'guard_name'  => $permission->guard_name,
                    'description' => $permission->description,
                    'updated_at'  => $permission->updated_at,
                    'created_at'  => $permission->created_at,
                ];
            }
        );
    }
}
