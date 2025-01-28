<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Casts\Json;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasInternalId;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Notifications\Notifiable;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Vendor extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use HasInternalId;
    use TracksApiCredential;
    use Searchable;
    use HasSlug;
    use LogsActivity;
    use Notifiable;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'vendors';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'vendor';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        '_key',
        'public_id',
        'internal_id',
        'company_uuid',
        'logo_uuid',
        'type_uuid',
        'connect_company_uuid',
        'business_id',
        'name',
        'email',
        'website_url',
        'meta',
        'callbacks',
        'phone',
        'place_uuid',
        'country',
        'status',
        'type',
        'slug',
    ];

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['name', 'email', 'business_id', 'connectCompany.name'];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['address', 'address_street', 'logo_url'];

    /**
     * Filterable params.
     *
     * @var array
     */
    protected $filterParams = ['customer_type', 'facilitator_type', 'photo_url'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'callbacks' => Json::class,
        'meta'      => Json::class,
    ];

    /**
     * Relationships to auto load with driver.
     *
     * @var array
     */
    protected $with = ['place'];

    /**
     * Get the activity log options for the model.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email', 'website_url', 'phone', 'country', 'status', 'type', 'logo_uuid', 'company_uuid'])
            ->logOnlyDirty();
    }

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
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = ['place'];

    public function place(): BelongsTo
    {
        return $this->belongsTo(Place::class);
    }

    public function connectCompany(): BelongsTo
    {
        return $this->belongsTo(\Fleetbase\Models\Company::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(\Fleetbase\Models\Company::class);
    }

    public function logo(): BelongsTo
    {
        return $this->belongsTo(\Fleetbase\Models\File::class);
    }

    public function places(): HasMany
    {
        return $this->hasMany(Place::class, 'owner_uuid', 'uuid');
    }

    public function vendorPersonnel(): HasMany
    {
        return $this->hasMany(VendorPersonnel::class, 'vendor_uuid', 'uuid');
    }

    public function personnels(): HasManyThrough
    {
        return $this->hasManyThrough(Contact::class, VendorPersonnel::class, 'vendor_uuid', 'uuid', 'uuid', 'contact_uuid');
    }

    public function facilitatorOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'facilitator_uuid', 'uuid');
    }

    public function customerOrders(): HasMany|Builder
    {
        return $this->hasMany(Order::class, 'customer_uuid')->whereNull('deleted_at')->withoutGlobalScopes();
    }

    /**
     * Get the vendor logo url.
     *
     * @return string
     */
    public function getLogoUrlAttribute()
    {
        return data_get($this, 'logo.url', 'https://s3.ap-southeast-1.amazonaws.com/flb-assets/static/no-avatar.png');
    }

    /**
     * Returns the vendors place address.
     *
     * @return string
     */
    public function getAddressAttribute()
    {
        return data_get($this, 'place.address_html');
    }

    /**
     * Returns the vendors place address.
     *
     * @return string
     */
    public function getAddressStreetAttribute()
    {
        return data_get($this, 'place.street1');
    }

    /**
     * Notify vendor using this column.
     *
     * @return mixed|string
     */
    public function routeNotificationForTwilio()
    {
        return $this->phone;
    }

    /**
     * Set the vendor type or default to `vendor`.
     *
     * @return void
     */
    public function setTypeAttribute(?string $type)
    {
        $this->attributes['type'] = $type ?? 'vendor';
    }

    /**
     * Set the vendor default status.
     *
     * @return void
     */
    public function setStatusAttribute(?string $status = 'active')
    {
        $this->attributes['status'] = $status ?? 'active';
    }

    /**
     * Create a vendor from an import row.
     */
    public static function createFromImport(array $row, bool $saveInstance = false): Vendor
    {
        // Filter array for null key values
        $row = array_filter($row);

        // Get vendor columns
        $name    = Utils::or($row, ['name', 'full_name', 'first_name', 'contact', 'person']);
        $phone   = Utils::or($row, ['phone', 'mobile', 'phone_number', 'number', 'cell', 'cell_phone', 'mobile_number', 'contact_number', 'tel', 'telephone', 'telephone_number']);
        $email   = Utils::or($row, ['email', 'email_address']);
        $website = Utils::or($row, ['website', 'website_url']);
        $country = Utils::or($row, ['country', 'country_name']);
        $address = Utils::or($row, ['address', 'street address', 'location']);
        $place   = Place::createFromMixed($address);

        // Create vendor
        $vendor = new static([
            'company_uuid' => session('company'),
            'name'         => $name,
            'phone'        => Utils::fixPhone($phone),
            'address'      => $place,
            'email'        => $email,
            'type'         => 'vendor',
            'country'      => Utils::getCountryCodeByName($country),
            'status'       => 'active',
            'website'      => $website,
        ]);

        // If place resolved
        if ($place) {
            $vendor->place_uuid = $place->uuid;
        }

        if ($saveInstance === true) {
            $vendor->save();
        }

        return $vendor;
    }
}
