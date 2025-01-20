<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\TracksApiCredential;

class Route extends Model
{
    use HasUuid;
    use TracksApiCredential;
    use HasApiModelBehavior;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'routes';

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
    protected $fillable = ['_key', 'company_uuid', 'order_uuid', 'details', 'total_time', 'total_distance'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'details' => Json::class,
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['payload', 'driver', 'order_status', 'order_public_id', 'order_internal_id', 'order_dispatched_at'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = ['order'];

    /**
     * Order for this Route.
     *
     * @var Model
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Payload for this routes order.
     *
     * @var Model
     */
    public function getPayloadAttribute()
    {
        return data_get($this, 'order.payload');
    }

    /**
     * Driver for this routes order.
     *
     * @var Model
     */
    public function getDriverAttribute()
    {
        return data_get($this, 'order.driverAssigned');
    }

    /**
     * Order status for this route.
     *
     * @var string
     */
    public function getOrderStatusAttribute()
    {
        return data_get($this, 'order.status');
    }

    /**
     * Order id for this route.
     *
     * @var string
     */
    public function getOrderPublicIdAttribute()
    {
        return data_get($this, 'order.public_id');
    }

    /**
     * Order internal id for this route.
     *
     * @var string
     */
    public function getOrderInternalIdAttribute()
    {
        return data_get($this, 'order.internal_id');
    }

    /**
     * Order internal id for this route.
     *
     * @var string
     */
    public function getOrderDispatchedAtAttribute()
    {
        return data_get($this, 'order.dispatched_at');
    }
}
