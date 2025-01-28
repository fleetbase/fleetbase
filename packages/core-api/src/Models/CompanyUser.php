<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\HasPolicies;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Traits\HasRoles;

class CompanyUser extends Model
{
    use HasUuid;
    use TracksApiCredential;
    use HasRoles;
    use HasPolicies;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'company_users';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'company_uuid',
        'user_uuid',
        'status',
        'external',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'external'                     => 'boolean',
    ];

    /**
     * The default guard for this model.
     *
     * @var string
     */
    public $guard_name = 'sanctum';

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Set the default status to `active`.
     *
     * @return void
     */
    public function setStatusAttribute($value = 'active')
    {
        $this->attributes['status'] = $value;
    }

    /**
     * Assign a single role to the user, removing any existing roles.
     *
     * This method deletes all existing roles assigned to the user and then assigns the specified role.
     *
     * @param string|int|\Spatie\Permission\Models\Role $role The role to assign to the user (can be a role name, ID, or instance)
     *
     * @return User The assigned role instance
     */
    public function assignSingleRole($role): self
    {
        DB::table('model_has_roles')->where('model_uuid', $this->uuid)->delete();

        return $this->assignRole($role);
    }

    /**
     * Return all the permissions the model has, both directly and via roles and policies.
     */
    public function getAllPermissions()
    {
        /** @var \Illuminate\Database\Eloquent\Model|\Spatie\Permission\Traits\HasPermissions $this */
        /** @var Collection $permissions */
        $permissions = $this->permissions;

        if (method_exists($this, 'roles')) {
            $permissions = $permissions->merge($this->getPermissionsViaRoles());
        }

        if (method_exists($this, 'policies')) {
            $permissions = $permissions->merge($this->getPermissionsViaPolicies());
            $permissions = $permissions->merge($this->getPermissionsViaRolePolicies());
        }

        return $permissions->sort()->values();
    }

    /**
     * Checks if the user has any of the given permissions.
     *
     * This method checks if the user's attached permissions intersect with the given permissions.
     * If there is at least one matching permission, the method returns true.
     *
     * @param Collection|array $permissions The permissions to check against
     *
     * @return bool True if the user has any of the given permissions, false otherwise
     */
    public function hasPermissions(Collection|array $permissions): bool
    {
        $attachedPermissions = $this->getAllPermissions();

        return $attachedPermissions->filter(function ($permission) use ($permissions) {
            return $permissions->contains($permission);
        })->isNotEmpty();
    }

    /**
     * Checks if the user does not have any of the given permissions.
     *
     * This method checks if the user's attached permissions do not intersect with the given permissions.
     * If there are no matching permissions, the method returns true.
     *
     * @param Collection|array $permissions The permissions to check against
     *
     * @return bool True if the user does not have any of the given permissions, false otherwise
     */
    public function doesntHavePermissions(Collection|array $permissions): bool
    {
        return !$this->hasPermissions($permissions);
    }
}
