<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission as BasePermission;

class Permission extends BasePermission
{
    use HasUuid;
    use HasApiModelBehavior;
    use Searchable;
    use Filterable;

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
     * The column to use for generating uuid.
     *
     * @var string
     */
    public $uuidColumn = 'id';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['name'];

    /** @method withTrashed ghost scope for non soft deletes */
    public function scopeWithTrashed($query)
    {
        return $query;
    }

    /**
     * Finds permissions by their names.
     *
     * This method takes an array of permission names and returns a collection of
     * permission models that match any of the given names.
     *
     * @param array $names The permission names to search for
     *
     * @return Collection A collection of permission models
     */
    public static function findByNames(array $names = []): Collection
    {
        return Permission::where(function ($query) use ($names) {
            $firstName = array_shift($names);
            $query->where('name', $firstName);
            foreach ($names as $name) {
                $query->orWhere('name', $name);
            }
        })->get();
    }
}
