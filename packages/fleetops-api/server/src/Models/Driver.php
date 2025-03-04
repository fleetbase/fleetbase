<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Casts\Json;
use Fleetbase\FleetOps\Casts\Point;
use Fleetbase\FleetOps\Scopes\DriverScope;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\FleetOps\Support\Utils as FleetOpsUtils;
use Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialTrait;
use Fleetbase\Models\File;
use Fleetbase\Models\Model;
use Fleetbase\Models\User;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasInternalId;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\SendsWebhooks;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Broadcasting\Channel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\CausesActivity;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;
use WebSocket\Message\Ping;

class Driver extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasInternalId;
    use TracksApiCredential;
    use HasApiModelBehavior;
    use Notifiable;
    use SendsWebhooks;
    use SpatialTrait;
    use HasSlug;
    use LogsActivity;
    use CausesActivity;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'drivers';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'driver';

    /**
     * The attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['drivers_license_number', 'user.name', 'user.email', 'user.phone'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        '_key',
        'public_id',
        'internal_id',
        'user_uuid',
        'company_uuid',
        'vehicle_uuid',
        'vendor_uuid',
        'current_job_uuid',
        'auth_token',
        'signup_token_used',
        'avatar_url',
        'drivers_license_number',
        'location',
        'heading',
        'bearing',
        'altitude',
        'speed',
        'country',
        'currency',
        'city',
        'online',
        'current_status',
        'slug',
        'status',
        'meta,',
    ];

    /**
     * The attributes that are guarded and not mass assignable.
     *
     * @var array
     */
    protected $guarded = [];

    /**
     * The attributes that are spatial columns.
     *
     * @var array
     */
    protected $spatialFields = ['location'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'location'   => Point::class,
        'online'     => 'boolean',
        'meta'       => Json::class,
    ];

    /**
     * Relationships to auto load with driver.
     *
     * @var array
     */
    protected $with = [];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = [
        'current_job_id',
        'vehicle_id',
        'vendor_id',
        'photo_url',
        'name',
        'phone',
        'email',
        'rotation',
        'vehicle_name',
        'vehicle_avatar',
        'vendor_name',
        'is_available',
        'availability_message',
        'button_message',
        'have_no_vehicle',
    ];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = ['currentJob', 'vendor', 'vehicle', 'user', 'latitude', 'longitude', 'auth_token'];

    /**
     * Attributes that is filterable on this model.
     *
     * @var array
     */
    protected $filterParams = ['vendor', 'facilitator', 'customer', 'fleet', 'photo_uuid', 'avatar_uuid', 'avatar_value'];

    /**
     * Get the activity log options for the model.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly(['*'])->logOnlyDirty();
    }

    /**
     * Get the options for generating the slug.
     */
    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('drivers_license_number')
            ->saveSlugsTo('slug');
    }

    /**
     * The "booting" method of the model.
     *
     * @return void
     */
    protected static function boot()
    {
        parent::boot();
        static::addGlobalScope(new DriverScope());
    }

    /**
     * @return BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class)->select(['uuid', 'company_uuid', 'public_id', 'avatar_uuid', 'name', 'phone', 'email'])->without(['driver'])->withTrashed();
    }

    /**
     * @return BelongsTo
     */
    public function company()
    {
        return $this->belongsTo(\Fleetbase\Models\Company::class);
    }

    /**
     * @return BelongsTo
     */
    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class)->select([
            'uuid',
            'vendor_uuid',
            'photo_uuid',
            'avatar_url',
            'public_id',
            'year',
            'make',
            'model',
            'model_data',
            'vin_data',
            'telematics',
            'meta',
            'trim',
            'plate_number',
            DB::raw("CONCAT(vehicles.year, ' ', vehicles.make, ' ', vehicles.model, ' ', vehicles.trim, ' ', vehicles.plate_number) AS display_name"),
        ]);
    }

    public function vendor(): BelongsTo|Builder
    {
        return $this->belongsTo(Vendor::class)->select(['id', 'uuid', 'public_id', 'name']);
    }

    public function currentJob(): BelongsTo|Builder
    {
        return $this->belongsTo(Order::class)->select(['id', 'uuid', 'public_id', 'payload_uuid', 'driver_assigned_uuid'])->without(['driver']);
    }

    public function currentOrder(): BelongsTo|Builder
    {
        return $this->belongsTo(Order::class, 'current_job_uuid')->select(['id', 'uuid', 'public_id', 'payload_uuid', 'driver_assigned_uuid'])->without(['driver']);
    }

    public function jobs(): HasMany|Builder
    {
        return $this->hasMany(Order::class, 'driver_assigned_uuid')->without(['driver']);
    }

    public function orders(): HasMany|Builder
    {
        return $this->hasMany(Order::class, 'driver_assigned_uuid')->without(['driver']);
    }

    public function pings(): HasMany
    {
        return $this->hasMany(Ping::class);
    }

    public function positions(): HasMany
    {
        return $this->hasMany(Position::class, 'subject_uuid');
    }

    public function fleets(): HasManyThrough
    {
        return $this->hasManyThrough(Fleet::class, FleetDriver::class, 'driver_uuid', 'uuid', 'uuid', 'fleet_uuid');
    }

    public function devices(): HasMany
    {
        return $this->hasMany(\Fleetbase\Models\UserDevice::class, 'user_uuid', 'user_uuid');
    }

    /**
     * Get avatar url.
     */
    public function getAvatarUrlAttribute($value): ?string
    {
        // if vehicle assigned us the vehicle avatar
        $this->loadMissing('vehicle');
        if ($this->vehicle) {
            return $this->vehicle->avatar_url;
        }

        if (!$value) {
            return static::getAvatar();
        }

        if (Str::isUuid($value)) {
            return static::getAvatar($value);
        }

        return $value;
    }

    /**
     * Get an avatar url by key.
     *
     * @param string $key
     */
    public static function getAvatar($key = 'moto-driver'): ?string
    {
        if (Str::isUuid($key)) {
            $file = File::where('uuid', $key)->first();
            if ($file) {
                return $file->url;
            }

            return null;
        }

        return static::getAvatarOptions()->get($key);
    }

    /**
     * Get all avatar options for a vehicle.
     */
    public static function getAvatarOptions(): Collection
    {
        $options = [
            'moto-driver.png',
        ];

        // Get custom avatars
        $customAvatars = collect(File::where('type', 'driver-avatar')->get()->mapWithKeys(
            function ($file) {
                $key = str_replace(['.svg', '.png'], '', 'Custom: ' . $file->original_filename);

                return [$key => $file->uuid];
            }
        )->toArray());

        // Create default avatars included from fleetbase
        $avatars = collect($options)->mapWithKeys(
            function ($option) {
                $key = str_replace(['.svg', '.png'], '', $option);

                return [$key => Utils::assetFromS3('static/driver-icons/' . $option)];
            }
        );

        return $customAvatars->merge($avatars);
    }

    /**
     * Specifies the user's FCM tokens.
     */
    public function routeNotificationForFcm(): array
    {
        return $this->devices
            ->where('platform', 'android')->map(
                function ($userDevice) {
                    return $userDevice->token;
                }
            )
            ->toArray();
    }

    /**
     * Specifies the user's APNS tokens.
     */
    public function routeNotificationForApn(): array
    {
        return $this->devices
            ->where('platform', 'ios')->map(
                function ($userDevice) {
                    return $userDevice->token;
                }
            )->toArray();
    }

    /**
     * The channels the driver receives notification broadcasts on.
     *
     * @param \Illuminate\Notifications\Notification $notification
     *
     * @return Channel
     */
    public function receivesBroadcastNotificationsOn($notification)
    {
        return new Channel('driver.' . $this->public_id);
    }

    /**
     * Get the drivers rotation.
     */
    public function getRotationAttribute(): float
    {
        return round($this->heading / 360 + 180);
    }

    /**
     * Get assigned vehicle assigned name.
     */
    public function getCurrentJobIdAttribute(): ?string
    {
        return $this->currentJob()->value('public_id');
    }

    /**
     * Get assigned vehicle assigned name.
     */
    public function getVehicleNameAttribute(): ?string
    {
        $this->loadMissing('vehicle');

        return $this->vehicle ? $this->vehicle->display_name : null;
    }

    /**
     * Get assigned vehicles public ID.
     */
    public function getVehicleIdAttribute(): ?string
    {
        return $this->vehicle()->value('public_id');
    }

    /**
     * Get assigned vehicles public ID.
     */
    public function getVehicleAvatarAttribute()
    {
        if ($this->isVehicleNotAssigned()) {
            return Vehicle::getAvatar();
        }

        return $this->vehicle()->value('avatar_url');
    }

    /**
     * Get drivers vendor ID.
     */
    public function getVendorIdAttribute()
    {
        return $this->vendor()->select(['uuid', 'public_id', 'name'])->value('public_id');
    }

    /**
     * Get drivers vendor name.
     */
    public function getVendorNameAttribute()
    {
        return $this->vendor()->select(['uuid', 'public_id', 'name'])->value('name');
    }

    /**
     * Get drivers photo URL attribute.
     */
    public function getPhotoAttribute()
    {
        return data_get($this, 'user.avatar');
    }

    /**
     * Get drivers photo URL attribute.
     */
    public function getPhotoUrlAttribute()
    {
        return data_get($this, 'user.avatarUrl');
    }

    /**
     * Get drivers name.
     */
    public function getNameAttribute()
    {
        return data_get($this, 'user.name');
    }

    /**
     * Get drivers phone number.
     */
    public function getPhoneAttribute()
    {
        return data_get($this, 'user.phone');
    }

    /**
     * Get drivers email.
     */
    public function getEmailAttribute()
    {
        return data_get($this, 'user.email');
    }

    /**
     * Unassigns the current order from the driver if a driver is assigned.
     *
     * @return bool True if the driver was unassigned and the changes were saved, false otherwise
     */
    public function unassignCurrentOrder()
    {
        if (!empty($this->driver_assigned_uuid)) {
            $this->driver_assigned_uuid = null;

            return $this->save();
        }

        return false;
    }

    /**
     * Assigns the specified vehicle to the current driver.
     *
     * This method performs the following actions:
     * 1. Unassigns the vehicle from any other drivers by setting their `vehicle_uuid` to `null`.
     * 2. Assigns the vehicle to the current driver by updating the vehicle's `driver_uuid`.
     * 3. Associates the vehicle with the current driver instance.
     * 4. Saves the changes to persist the assignment.
     *
     * @param Vehicle $vehicle the vehicle instance to assign to the driver
     *
     * @return $this returns the current driver instance after assignment
     *
     * @throws \Exception if the vehicle assignment fails
     */
    public function assignVehicle(Vehicle $vehicle): self
    {
        // Unassign vehicle from other drivers
        static::where('vehicle_uuid', $vehicle->uuid)->update(['vehicle_uuid' => null]);

        // Set this vehicle to the driver instance
        $this->setVehicle($vehicle);
        $this->save();

        return $this;
    }

    /**
     * Sets the vehicle for the current driver instance.
     *
     * This method updates the `vehicle_uuid` attribute of the driver and establishes
     * the relationship between the driver and the vehicle model instance.
     *
     * @param Vehicle $vehicle the vehicle instance to associate with the driver
     *
     * @return $this returns the current driver instance after setting the vehicle
     */
    public function setVehicle(Vehicle $vehicle)
    {
        // Update the driver's vehicle UUID
        $this->vehicle_uuid = $vehicle->uuid;

        // Establish the relationship with the vehicle
        $this->setRelation('vehicle', $vehicle);

        return $this;
    }

    /**
     * Checks if the vehicle is assigned to the driver.
     *
     * @return bool True if the vehicle is assigned, false otherwise
     */
    public function isVehicleAssigned()
    {
        return $this->isVehicleNotAssigned() === false;
    }

    /**
     * Checks if the vehicle is not assigned to the driver.
     *
     * @return bool True if the vehicle is not assigned, false otherwise
     */
    public function isVehicleNotAssigned()
    {
        return !$this->vehicle_uuid;
    }

    /**
     * Updates the position of the driver, creating a new Position record if
     * the driver has moved more than 100 meters or if it's their first recorded position.
     *
     * @param Order|null $order The order to consider when updating the position (default: null)
     *
     * @return Position|null The created Position object, or null if no new position was created
     */
    public function updatePosition(?Order $order = null): ?Position
    {
        $position     = null;
        $lastPosition = $this->positions()->whereCompanyUuid(session('company'))->latest()->first();

        // get the drivers current order
        $currentOrder = $order ?? $this->currentOrder()->with(['payload'])->first();
        $destination  = $currentOrder ? $currentOrder->payload->getPickupOrCurrentWaypoint() : null;

        $positionData = [
            'company_uuid' => session('company', $this->company_uuid),
            'subject_uuid' => $this->uuid,
            'subject_type' => Utils::getMutationType($this),
            'coordinates'  => $this->location,
            'altitude'     => $this->altitude,
            'heading'      => $this->heading,
            'speed'        => $this->speed,
        ];

        if ($currentOrder) {
            $positionData['order_uuid'] = $currentOrder->uuid;
        }

        if ($destination) {
            $positionData['destination_uuid'] = $destination->uuid;
        }

        $isFirstPosition = !$lastPosition;
        $isPast50Meters  = $lastPosition && FleetOpsUtils::vincentyGreatCircleDistance($this->location, $lastPosition->coordinates) > 50;
        $position        = null;

        // create the first position
        if ($isFirstPosition || $isPast50Meters) {
            $position = Position::create($positionData);
        }

        return $position;
    }

    /**
     * Get the user relationship from the driver.
     */
    public function getUser(): ?User
    {
        // get user
        $user = $this->load(['user'])->user;

        if (empty($user) && Str::isUuid($this->user_uuid)) {
            $user = User::where('uuid', $this->user_uuid)->first();
        }

        return $user;
    }

    public static function createFromImport(array $row, bool $saveInstance = false): Driver
    {
        // Filter array for null key values
        $row = array_filter($row);

        // Get driver columns
        $name                 = Utils::or($row, ['name', 'full_name', 'first_name', 'driver', 'person']);
        $phone                = Utils::or($row, ['phone', 'mobile', 'phone_number', 'number', 'cell', 'cell_phone', 'mobile_number', 'contact_number', 'tel', 'telephone', 'telephone_number']);
        $email                = Utils::or($row, ['email', 'email_address']);
        $country              = Utils::or($row, ['country', 'country_name']);
        $driversLicenseNumber = Utils::or($row, ['drivers_license', 'driver_license', 'drivers_license_number', 'driver_license_number', 'license', 'driver_id', 'driver_identification', 'driver_identification_number']);
        $vehicleName          = Utils::or($row, ['vehicle', 'vehicle_name', 'vehicle_id', 'vehicle_id_number', 'vehicle_number', 'vehicle_plate', 'vehicle_plate_number', 'vin', 'vehicle_vin', 'vehicle_identification_number']);
        $password             = Utils::get($row, 'password');

        // Fix phone number format
        $phone = Utils::fixPhone($phone);

        // Try to find existing user
        $user = User::where(function ($query) use ($email, $phone) {
            $query->where('email', $email);
            $query->orWhere('phone', $phone);
        })->whereHas('companies', function ($query) {
            $query->where('company_uuid', session('company'));
        })->first();

        // If no user exists create new user for driver profile
        if (!$user) {
            $user = User::newUserWithRequestInfo(request(), [
                'company_uuid' => session('company'),
                'name'         => $name,
                'phone'        => $phone,
                'email'        => $email,
                'username'     => Str::slug($name . '_' . Str::random(4), '_'),
                'status'       => 'active',
            ]);

            // if password is provided
            if ($password) {
                $user->password = $password;
            }

            // save the user
            $user->save();
        }

        // Fix country format
        if (is_string($country) && strlen($country) > 2) {
            $country = Utils::getCountryCodeByName($country);
        }

        // Attempt to resolve vehicle from column and assign to driver
        $vehicle = null;
        if ($vehicleName) {
            $vehicle = Vehicle::findByName($vehicleName);
        }

        // Create driver
        $driver = new static([
            'company_uuid'           => session('company'),
            'user_uuid'              => $user->uuid,
            'drivers_license_number' => $driversLicenseNumber,
            'country'                => $country,
            'status'                 => 'active',
            'location'               => Utils::parsePointToWkt(new Point(0, 0)),
        ]);

        // If vehicle resolved
        if ($vehicle) {
            $driver->vehicle_uuid = $vehicle->uuid;
        }

        if ($saveInstance === true) {
            $driver->save();
        }

        return $driver;
    }

    public static function findByIdentifier(?string $identifier = null): ?Driver
    {
        if (is_null($identifier)) {
            return null;
        }

        return static::where('company_uuid', session('company'))->where(function ($query) use ($identifier) {
            $query->whereHas('user', function ($query) use ($identifier) {
                $query->whereRaw('lower(name) like ?', ['%' . strtolower($identifier) . '%'])->orWhere('email', $identifier)->orWhere('phone', $identifier);
            })->orWhere(function ($query) use ($identifier) {
                $query->where('public_id', $identifier)->orWhere('drivers_license_number', $identifier);
            });
        })->first();
    }

    public function getIsAvailableAttribute()
    {
        return $this->attributes['is_available'] ?? null;
    }
    public function getAvailabilityMessageAttribute()
    {
        return $this->attributes['availability_message'] ?? null;
    }

    public function getButtonMessageAttribute()
    {
        // Return early if button_message is already set from other functionality
        if (isset($this->attributes['button_message'])) {
            return $this->attributes['button_message'];
        }
        // Handle different driver statuses
        switch ($this->status) {
            case 'shift-ended':
                return 'Shift has ended';
            case 'on-break':
                return 'On break';
            case 'with Assignment':
                return 'with Assignment';
            case 'Without Vehicle':
                return 'Without Vehicle';
            case 'Confirmed':
                return 'Confirmed';
            case 'Created':
                return 'Created';
            default:
                return null;
        }
    }
    private function getHaveNoVehicleAttribute()
    {
        return $this->attributes['have_no_vehicle'] ?? null;
    }
}
