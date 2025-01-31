<?php

namespace Fleetbase\Traits;

use Fleetbase\Models\Permission;
use Fleetbase\Models\Policy;
use Fleetbase\Models\Role;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Spatie\Permission\Traits\HasPermissions;

trait HasPolicies
{
    use HasPermissions;

    private $policyClass = Policy::class;

    public static function bootHasPolicies()
    {
        static::deleting(function ($model) {
            if (method_exists($model, 'isForceDeleting') && !$model->isForceDeleting()) {
                return;
            }

            $model->policies()->detach();
        });
    }

    public function getPolicyClass()
    {
        return app($this->policyClass);
    }

    /**
     * A model may have multiple policies.
     */
    public function policies(): BelongsToMany
    {
        /** @var \Illuminate\Database\Eloquent\Model|HasPermissions $this */
        return $this->morphToMany(
            Policy::class,
            'model',
            'model_has_policies',
            config('permission.column_names.model_morph_key'),
            'policy_id'
        );
    }

    /**
     * Scope the model query to certain policies only.
     *
     * @param string|array|Policy|Collection $policies
     * @param string                         $guard
     */
    public function scopePolicy(Builder $query, $policies, $guard = null): Builder
    {
        if ($policies instanceof Collection) {
            $policies = $policies->all();
        }

        if (!is_array($policies)) {
            $policies = [$policies];
        }

        $policies = array_map(function ($role) use ($guard) {
            if ($role instanceof Policy) {
                return $role;
            }

            $method = is_numeric($role) ? 'findById' : 'findByName';
            $guard  = $guard ?: $this->getDefaultGuardName();

            return $this->getPolicyClass()->{$method}($role, $guard);
        }, $policies);

        return $query->whereHas('policies', function (Builder $subQuery) use ($policies) {
            $subQuery->whereIn(config('permission.table_names.policies') . '.id', \array_column($policies, 'id'));
        });
    }

    /**
     * Assign the given role to the model.
     *
     * @param array|string|Policy ...$policies
     *
     * @return $this
     */
    public function assignPolicy(...$policies)
    {
        $policies = collect($policies)
            ->flatten()
            ->map(function ($policy) {
                if (empty($policy)) {
                    return false;
                }

                return $this->getStoredPolicy($policy);
            })
            ->filter(function ($policy) {
                return $policy instanceof Policy;
            })
            ->each(function ($policy) {
                $this->ensureModelSharesGuard($policy);
            })
            ->map->id
            ->all();

        $model = $this->getModel();

        if ($model->exists) {
            $this->policies()->sync($policies, false);
            $model->load('policies');
        } else {
            $class = \get_class($model);

            $class::saved(
                function ($object) use ($policies, $model) {
                    $model->policies()->sync($policies, false);
                    $model->load('policies');
                }
            );
        }

        $this->forgetCachedPermissions();

        return $this;
    }

    /**
     * Revoke the given role from the model.
     *
     * @param string|\Fleebase\Contracts\Policy $role
     */
    public function removePolicy($role)
    {
        $this->policies()->detach($this->getStoredPolicy($role));

        $this->load('policies');

        $this->forgetCachedPermissions();

        return $this;
    }

    /**
     * Remove all current policies and set the given ones.
     *
     * @param array|\Fleebase\Contracts\Policy|string ...$policies
     *
     * @return $this
     */
    public function syncPolicies(...$policies)
    {
        $this->policies()->detach();

        return $this->assignPolicy($policies);
    }

    /**
     * Determine if the model has (one of) the given role(s).
     *
     * @param string|int|array|\Fleebase\Contracts\Policy|Collection $policies
     */
    public function hasPolicy($policies, ?string $guard = null): bool
    {
        if (is_string($policies) && false !== strpos($policies, '|')) {
            $policies = $this->_convertPipeToArray($policies);
        }

        if (is_string($policies)) {
            return $guard
                ? $this->policies->where('guard_name', $guard)->contains('name', $policies)
                : $this->policies->contains('name', $policies);
        }

        if (is_int($policies)) {
            return $guard
                ? $this->policies->where('guard_name', $guard)->contains('id', $policies)
                : $this->policies->contains('id', $policies);
        }

        if ($policies instanceof Policy) {
            return $this->policies->contains('id', $policies->id);
        }

        if (is_array($policies)) {
            foreach ($policies as $role) {
                if ($this->hasPolicy($role, $guard)) {
                    return true;
                }
            }

            return false;
        }

        return $policies->intersect($guard ? $this->policies->where('guard_name', $guard) : $this->policies)->isNotEmpty();
    }

    /**
     * Determine if the model has any of the given role(s).
     *
     * Alias to hasPolicy() but without Guard controls
     *
     * @param string|int|array|\Fleebase\Contracts\Policy|Collection $policies
     */
    public function hasAnyPolicy(...$policies): bool
    {
        return $this->hasPolicy($policies);
    }

    /**
     * Determine if the model has all of the given role(s).
     *
     * @param string|array|\Fleebase\Contracts\Policy|Collection $policies
     */
    public function hasAllPolicies($policies, ?string $guard = null): bool
    {
        if (is_string($policies) && false !== strpos($policies, '|')) {
            $policies = $this->_convertPipeToArray($policies);
        }

        if (is_string($policies)) {
            return $guard
                ? $this->policies->where('guard_name', $guard)->contains('name', $policies)
                : $this->policies->contains('name', $policies);
        }

        if ($policies instanceof Policy) {
            return $this->policies->contains('id', $policies->id);
        }

        $policies = collect()->make($policies)->map(function ($role) {
            return $role instanceof Policy ? $role->name : $role;
        });

        return $policies->intersect(
            $guard
                ? $this->policies->where('guard_name', $guard)->pluck('name')
                : $this->getPolicyNames()
        ) == $policies;
    }

    /**
     * Return all permissions directly coupled to the model.
     */
    public function getPolicyDirectPermissions(): Collection
    {
        return $this->permissions;
    }

    public function getPolicyNames(): Collection
    {
        return $this->policies->pluck('name');
    }

    protected function getStoredPolicy($policy): Policy
    {
        $policyClass = $this->getPolicyClass();

        if (Str::isUuid($policy)) {
            return $policyClass->findById($policy, $this->getDefaultGuardName());
        }

        if (is_string($policy)) {
            return $policyClass->findByName($policy, $this->getDefaultGuardName());
        }

        return $policy;
    }

    protected function _convertPipeToArray(string $pipeString)
    {
        $pipeString = trim($pipeString);

        if (strlen($pipeString) <= 2) {
            return $pipeString;
        }

        $quoteCharacter = substr($pipeString, 0, 1);
        $endCharacter   = substr($quoteCharacter, -1, 1);

        if ($quoteCharacter !== $endCharacter) {
            return explode('|', $pipeString);
        }

        if (!in_array($quoteCharacter, ["'", '"'])) {
            return explode('|', $pipeString);
        }

        return explode('|', trim($pipeString, $quoteCharacter));
    }

    public function getPermissionsViaRolePolicies()
    {
        if (is_a($this, Policy::class) || is_a($this, Role::class) || is_a($this, Permission::class)) {
            return collect();
        }

        /** @var \Illuminate\Database\Eloquent\Model|HasPermissions $this */
        $roles        = $this->loadMissing(['roles', 'roles.policies', 'roles.policies.permissions'])->roles;
        $rolePolicies = collect();
        foreach ($roles as $role) {
            $rolePolicies = $rolePolicies->merge($role->policies);
        }

        return $rolePolicies->flatMap(fn ($policy) => $policy->permissions)
            ->sort()->values();
    }

    /**
     * Return all the permissions the model has via policies.
     */
    public function getPermissionsViaPolicies()
    {
        if (is_a($this, Policy::class) || is_a($this, Permission::class)) {
            return collect();
        }

        /** @var \Illuminate\Database\Eloquent\Model|HasPermissions $this */
        return $this->loadMissing('policies', 'policies.permissions')
            ->policies->flatMap(fn ($policy) => $policy->permissions)
            ->sort()->values();
    }

    /**
     * Retrieves all policies associated with the user, including those through direct assignment and roles.
     *
     * This method loads all related policies and roles for the user, as well as policies associated with those roles.
     * It merges all these policies into a single collection, providing a comprehensive list of policies that the user
     * is associated with, either directly or through their roles.
     *
     * @return Collection a collection of all `Policy` models associated with the user, including those through roles
     */
    public function getAllPolicies(): Collection
    {
        $this->loadMissing('policies', 'roles', 'roles.policies');
        $allPolicies = collect();

        $allPolicies = $allPolicies->merge($this->policies);
        foreach ($this->roles as $role) {
            $allPolicies = $allPolicies->merge($role->policies);
        }

        return $allPolicies;
    }

    /**
     * Checks if the user has the specified policy assigned, either directly or through a role.
     *
     * This method retrieves all policies associated with the user, including those assigned directly and those
     * assigned through roles. It then checks if the specified policy is within this collection of policies. The method
     * returns `true` if the policy is assigned to the user, and `false` otherwise.
     *
     * @param Policy $policy the `Policy` model to check against the user's assigned policies
     *
     * @return bool `True` if the policy is assigned to the user, `false` otherwise
     */
    public function hasPolicyAssigned(Policy $policy): bool
    {
        $policies = $this->getAllPolicies();

        return $policies->contains(function ($anyPolicy) use ($policy) {
            return $policy->id === $anyPolicy->id;
        });
    }
}
