<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\TracksApiCredential;

class VehicleDevice extends Model
{
    use HasUuid;
    use TracksApiCredential;
    use HasApiModelBehavior;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'vehicle_devices';

    /**
     * Attributes that is filterable on this model.
     *
     * @var array
     */
    protected $fillable = [
        'uuid',
        'vehicle_uuid',
        'device_type',
        'device_id',
        'device_provider',
        'device_name',
        'device_model',
        'device_location',
        'manufacturer',
        'serial_number',
        'installation_date',
        'last_maintenance_date',
        'meta',
        'data',
        'online',
        'status',
        'data_frequency',
        'notes',
    ];
    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'meta' => Json::class,
        'data' => Json::class,
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = [];

    /**
     * Filterable params.
     *
     * @var array
     */
    protected $filterParams = [];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class)->without(['events']);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function events()
    {
        return $this->hasMany(VehicleDeviceEvent::class);
    }

    /**
     * Retrieve the associated Vehicle model for the current instance.
     *
     * @param \Closure|null $callback a callback function to be executed if a Vehicle model is found
     *
     * @return \App\Models\Vehicle|null the associated Vehicle model, or null if not found
     */
    public function getVehicle(?\Closure $callback): ?Vehicle
    {
        $this->load(['vehicle']);
        $vehicle = null;

        if ($this->vehicle instanceof Vehicle) {
            $vehicle = $this->vehicle;
        }

        // check if id is set
        if (!$vehicle && $this->vehicle_uuid) {
            $vehicle = Vehicle::where('uuid', $this->vehicle_uuid)->first();
        }

        if ($vehicle && is_callable($callback)) {
            $callback($vehicle);
        }

        return $vehicle;
    }
}
