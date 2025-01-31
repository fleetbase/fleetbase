<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPolicies;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasPermissions;
use Spatie\Permission\Traits\HasRoles;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

/**
 * @property \Illuminate\Database\Eloquent\Collection $users
 */
class Group extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use HasPermissions;
    use HasPolicies;
    use HasRoles;
    use HasSlug;
    use Filterable;
    use Notifiable;

    /**
     * The database connection to use.
     *
     * @var string
     */
    protected $connection = 'mysql';

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'groups';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'group';

    /**
     * The attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['name'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['_key', 'public_id', 'company_uuid', 'name', 'description', 'slug'];

    /**
     * The relationships that will always be appended.
     *
     * @var array
     */
    protected $with = ['users', 'permissions', 'policies'];

    /**
     * The relationship of the multiple notifiables.
     */
    public string $containsMultipleNotifiables = 'users';

    /**
     * Get the options for generating the slug.
     */
    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    /**
     * Waypoints between start and end.
     *
     * @return \Illuminate\Database\Eloquent\Concerns\HasRelationships
     */
    public function users()
    {
        return $this->hasManyThrough(User::class, GroupUser::class, 'group_uuid', 'uuid', 'uuid', 'user_uuid');
    }

    /**
     * An array of each group members email to send notification emails to.
     */
    public function routeNotificationForMail(): \Illuminate\Support\Collection
    {
        return $this->users->pluck('email');
    }
}
