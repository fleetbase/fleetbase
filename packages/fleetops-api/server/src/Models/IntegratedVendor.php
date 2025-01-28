<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Casts\Json;
use Fleetbase\FleetOps\Exceptions\IntegratedVendorException;
use Fleetbase\FleetOps\Support\IntegratedVendors;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;

class IntegratedVendor extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'integrated_vendors';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'integrated_vendor';

    /**
     * The database connection to use.
     *
     * @var string
     */
    protected $connection = 'mysql';

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = [];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        '_key',
        'public_id',
        'company_uuid',
        'created_by_uuid',
        'host',
        'namespace',
        'webhook_url',
        'provider',
        'sandbox',
        'options',
        'credentials',
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['name', 'status', 'type', 'photo_url', 'logo_url', 'service_types', 'supported_countries', 'provider_settings'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = ['credentials'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'credentials' => Json::class,
        'options'     => Json::class,
    ];

    /**
     * Lifecycle actions to run integrated vendor callbacks if applicable.
     *
     * @return void
     */
    public static function boot()
    {
        parent::boot();

        static::created(
            function ($model) {
                $provider = $model->provider();

                if ($provider && method_exists($provider, 'callback')) {
                    try {
                        $provider->callback('onCreated');
                    } catch (IntegratedVendorException $e) {
                        $model->delete();
                    }
                }
            }
        );

        static::updated(
            function ($model) {
                $provider = $model->provider();

                if ($provider && method_exists($provider, 'onUpdated')) {
                    $provider->callback('onUpdated');
                }
            }
        );

        static::deleted(
            function ($model) {
                $provider = $model->provider();

                if ($provider && method_exists($provider, 'onDeleted')) {
                    $provider->callback('onDeleted');
                }
            }
        );
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function createdBy()
    {
        return $this->belongsTo(\Fleetbase\Models\User::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function company()
    {
        return $this->belongsTo(\Fleetbase\Models\Company::class);
    }

    public function setWebhookUrlAttribute($webhookUrl = null)
    {
        if (empty($webhookUrl)) {
            $this->attributes['webhook_url'] = Utils::apiUrl('listeners/' . $this->provider);
        }

        $this->attributes['webhook_url'] = $webhookUrl;
    }

    public function getCredential(string $key)
    {
        return $this->credentials[$key];
    }

    public function api()
    {
        return IntegratedVendors::bridgeFromIntegratedVendor($this);
    }

    public function provider()
    {
        return IntegratedVendors::resolverFromIntegratedVendor($this);
    }

    public function serviceTypes()
    {
        return $this->provider()->getServiceTypes();
    }

    public function getServiceTypesAttribute()
    {
        return $this->serviceTypes();
    }

    public function countries()
    {
        return $this->provider()->getCountries();
    }

    public function getSupportedCountriesAttribute()
    {
        return $this->countries();
    }

    public function getProviderSettingsAttribute()
    {
        return $this->provider()->toArray();
    }

    public function getNameAttribute()
    {
        return $this->provider()->getName();
    }

    public function getPhotoUrlAttribute()
    {
        return $this->provider()->getLogo();
    }

    public function getLogoUrlAttribute()
    {
        return $this->provider()->getLogo();
    }

    public function getStatusAttribute()
    {
        return 'active';
    }

    public function getTypeAttribute()
    {
        return 'integrated-vendor';
    }
}
