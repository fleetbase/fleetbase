<?php

namespace App\Models;

use Fleetbase\Models\Model;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\TracksApiCredential;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialTrait;

class ServiceArea extends Model
{
    use HasUuid,
        HasPublicId,
        TracksApiCredential,
        HasApiModelBehavior,
        SpatialTrait;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'service_areas';

    /**
     * The type of public Id to generate
     *
     * @var string
     */
    protected $publicIdType = 'service_area';

    /**
     * These attributes that can be queried
     *
     * @var array
     */
    protected $searchableColumns = ['name', 'description'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'company_uuid',
        'name',
        'status',
        'color',
        'stroke_color',
        'border',
        'location',
        'address',
        'telephone',
        'country',
        'type',
        'location_ref'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'border' => 'array',
        'address' => 'array'
    ];

    /**
     * Spatial fields
     *
     * @var array
     */
    protected $spatialFields = [
        'location'
    ];
}
