<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPolicies;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Models\Role as BaseRole;

class Role extends BaseRole
{
    use HasUuid;
    use HasApiModelBehavior;
    use SoftDeletes;
    use HasPolicies;
    use Filterable;
    use Notifiable;
    use Searchable;

    /**
     * The database connection to use.
     *
     * @var string
     */
    protected $connection = 'mysql';

    /**
     * The primary key for the model.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * The primary key type.
     *
     * @var string
     */
    public $keyType = 'string';

    /**
     * The default guard for this model.
     *
     * @var string
     */
    public $guard_name = 'sanctum';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * The column to use for generating uuid.
     *
     * @var string
     */
    public $uuidColumn = 'id';

    /**
     * The attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['name'];

    /**
     * The relationships that will always be appended.
     *
     * @var array
     */
    protected $with = ['permissions'];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['type', 'is_mutable', 'is_deletable'];

    /**
     * Hotfix for tiemstamps bug.
     *
     * @return void
     */
    public static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->created_at = $model->freshTimestamp();
            $model->updated_at = $model->freshTimestamp();
        });

        static::updating(function ($model) {
            $model->updated_at = $model->freshTimestamp();
        });
    }

    /**
     * Cannot set permissions to Role model directly.
     *
     * @return void
     */
    public function setPermissionsAttribute()
    {
        unset($this->attributes['permissions']);
    }

    /**
     * Default guard should be `sanctum`.
     *
     * @return void
     */
    public function setGuardNameAttribute()
    {
        $this->attributes['guard_name'] = 'sanctum';
    }

    /**
     * Check if the company_uuid attribute is set.
     *
     * @return bool
     */
    public function getIsMutableAttribute()
    {
        return isset($this->company_uuid);
    }

    /**
     * Check if the company_uuid attribute is set.
     *
     * @return bool
     */
    public function getIsDeletableAttribute()
    {
        return isset($this->company_uuid);
    }

    /**
     * Get the type of attribute based on the company_uuid.
     *
     * @return string
     */
    public function getTypeAttribute()
    {
        return empty($this->company_uuid) ? 'FLB Managed' : 'Organization Managed';
    }
}
