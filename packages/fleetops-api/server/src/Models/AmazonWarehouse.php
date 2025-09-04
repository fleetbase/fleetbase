<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Casts\Json;
use Fleetbase\FleetOps\Casts\Point;
use Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialTrait;
use Fleetbase\LaravelMysqlSpatial\Types\Point as SpatialPoint;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Fleetbase\Traits\SendsWebhooks;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class AmazonWarehouse extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use Searchable;
    use SendsWebhooks;
    use TracksApiCredential;
    use SpatialTrait;
    use SoftDeletes;
    use LogsActivity;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'amazon_warehouses';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'amazon_warehouse';

     /**
     * The attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['name', 'street1', 'street2', 'country', 'province', 'district', 'city', 'postal_code', 'phone', 'code'];

    /**
     * The attributes that are spatial columns.
     *
     * @var array
     */
    protected $spatialFields = ['location'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        '_key',
        '_import_id',
        'company_uuid',
        'owner_uuid',
        'owner_type',
        'avatar_url',
        'name',
        'type',
        'street1',
        'street2',
        'city',
        'province',
        'postal_code',
        'neighborhood',
        'district',
        'building',
        'security_access_code',
        'country',
        'location',
        'meta',
        'phone',
        'code'
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['country_name', 'address', 'address_html'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [
        'id',
        '_key',
        'connect_company_uuid',
        'owner_uuid',
        'owner_type',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'meta'          => Json::class,
        'location'      => Point::class,
    ];
}
