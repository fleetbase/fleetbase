<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Fleetbase\Traits\SendsWebhooks;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Notifications\Notifiable;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Fleet extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use TracksApiCredential;
    use SendsWebhooks;
    use Searchable;
    use HasSlug;
    use LogsActivity;
    use Notifiable;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'fleets';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'fleet';

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['name'];

    /**
     * Get the activity log options for the model.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly(['name', 'task', 'service_area_uuid', 'zone_uuid'])->logOnlyDirty();
    }

    /**
     * The flug options for this model.
     */
    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        '_key',
        'public_id',
        'company_uuid',
        'service_area_uuid',
        'zone_uuid',
        'vendor_uuid',
        'parent_fleet_uuid',
        'image_uuid',
        'name',
        'color',
        'task',
        'status',
        'slug',
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['photo_url', 'drivers_count', 'drivers_online_count', 'vehicles_count', 'vehicles_online_count'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function photo()
    {
        return $this->belongsTo(\Fleetbase\Models\File::class, 'image_uuid', 'uuid');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function serviceArea()
    {
        return $this->belongsTo(ServiceArea::class)->select(['uuid', 'public_id', 'name', 'type', 'border']);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function zone()
    {
        return $this->belongsTo(Zone::class)->select(['uuid', 'public_id', 'name', 'border']);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function vendor()
    {
        return $this->belongsTo(Vendor::class)->select(['uuid', 'public_id', 'name']);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function parentFleet()
    {
        return $this->belongsTo(Fleet::class)->without(['subFleets']);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function subFleets()
    {
        return $this->hasMany(Fleet::class, 'parent_fleet_uuid', 'uuid')->without(['parentFleet']);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasManyThrough
     */
    public function drivers()
    {
        return $this->hasManyThrough(Driver::class, FleetDriver::class, 'fleet_uuid', 'uuid', 'uuid', 'driver_uuid');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasManyThrough
     */
    public function vehicles()
    {
        return $this->hasManyThrough(Vehicle::class, FleetVehicle::class, 'fleet_uuid', 'uuid', 'uuid', 'vehicle_uuid');
    }

    /**
     * Get avatar URL attribute.
     *
     * @return string
     */
    public function getPhotoUrlAttribute()
    {
        return data_get($this, 'photo.url', 'https://s3.ap-northeast-2.amazonaws.com/fleetbase/public/default-fleet.png');
    }

    /**
     * Get the number of drivers in fleet.
     *
     * @return int
     */
    public function getDriversCountAttribute()
    {
        return $this->drivers()->count();
    }

    /**
     * Get the number of online drivers in fleet.
     *
     * @return int
     */
    public function getDriversOnlineCountAttribute()
    {
        return $this->drivers()->where('online', 1)->count();
    }

    /**
     * Get the number of vehicles in fleet.
     *
     * @return int
     */
    public function getVehiclesCountAttribute()
    {
        return $this->vehicles()->count();
    }

    /**
     * Get the number of online vehicles in fleet.
     *
     * @return int
     */
    public function getVehiclesOnlineCountAttribute()
    {
        return $this->vehicles()->where('online', 1)->count();
    }

    public static function createFromImport(array $row, bool $saveInstance = false): Fleet
    {
        // Filter array for null key values
        $row = array_filter($row);

        // Get fleet columns
        $name  = Utils::or($row, ['name', 'fleet', 'fleet_name']);

        // Create fleet
        $fleet = new static([
            'company_uuid' => session('company'),
            'name'         => $name,
            'status'       => 'active',
        ]);

        if ($saveInstance === true) {
            $fleet->save();
        }

        return $fleet;
    }
}
