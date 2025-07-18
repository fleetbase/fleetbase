<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Models\Model;

use Illuminate\Support\Str;

class RouteSegment extends Model
{
    protected $table = 'route_segments';

    protected $fillable = [
        'uuid',
        'order_id',
        'payload_id',
        'from_waypoint_id',
        'to_waypoint_id',
        'public_id',
        'cr_id',
        'shipper_accounts',
        'equipment_type',
        'vr_creation_date_time',
        'vr_cancellation_date_time',
        'trailer_id',
        'operator_id',
        'record_status',
        'deleted',
        'created_by_id',
        'updated_by_id',
        'company_uuid',
        'tender_status',
        'facility_sequence',
        'stop_1_yard_arrival',
        'stop_1_yard_departure',
        'stop_2_yard_arrival',
        'stop_2_yard_departure',
        'stop_3_yard_arrival',
        'stop_3_yard_departure',
        'driver_type',
        'truck_filter'
    ];

    protected static function boot()
    {
        parent::boot();

        // Automatically generate UUID if not set
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Relationships
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function payload()
    {
        return $this->belongsTo(Payload::class);
    }

    public function fromWaypoint()
    {
        return $this->belongsTo(Waypoint::class, 'from_waypoint_id');
    }

    public function toWaypoint()
    {
        return $this->belongsTo(Waypoint::class, 'to_waypoint_id');
    }
}
