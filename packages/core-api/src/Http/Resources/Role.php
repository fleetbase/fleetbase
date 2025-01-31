<?php

namespace Fleetbase\Http\Resources;

class Role extends FleetbaseResource
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
            'id'              => $this->id,
            'company_uuid'    => $this->company_uuid,
            'name'            => $this->name,
            'guard_name'      => $this->guard_name,
            'description'     => $this->description,
            'policies'        => Policy::collection($this->policies),
            'permissions'     => $this->serializePermissions($this->permissions),
            'type'            => $this->type,
            'service'         => $this->service,
            'is_mutable'      => $this->is_mutable,
            'is_deletable'    => $this->is_deletable,
            'updated_at'      => $this->updated_at,
            'created_at'      => $this->created_at,
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
                    'service'     => $permission->service,
                    'updated_at'  => $permission->updated_at,
                    'created_at'  => $permission->created_at,
                ];
            }
        );
    }
}
