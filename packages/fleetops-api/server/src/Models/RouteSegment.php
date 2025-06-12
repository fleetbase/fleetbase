<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Models\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class RouteSegment extends Model
{
    use SoftDeletes;

    protected $table = 'route_segments';

    protected $fillable = [
        'uuid',
        'order_id',
        'payload_id',
        'from_waypoint_id',
        'to_waypoint_id',
        'public_id',
        'record_status',
        'deleted',
        'created_by_id',
        'updated_by_id',
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
