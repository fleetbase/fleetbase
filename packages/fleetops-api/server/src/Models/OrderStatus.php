<?php

namespace Fleetbase\FleetOps\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;

class OrderStatus extends Model
{
    use HasFactory;

    protected $table = 'order_statuses';

    protected $primaryKey = 'uuid';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'uuid',
        'company_uuid',
        'code',
        'name',
        'record_status',
        'deleted',
        'created_by_id',
        'updated_by_id',
        'created_at',
        'updated_at',
    ];

    protected static function boot()
    {
        parent::boot();

        // Automatically generate UUID on create
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }
}
