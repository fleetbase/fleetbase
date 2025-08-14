<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Fleetbase\Models\User;
use Fleetbase\FleetOps\Models\Driver;
class LeaveRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'leave_requests'; // Define table name explicitly

    protected $primaryKey = 'id'; // Primary key

    public $incrementing = true; // Auto-incrementing primary key

    protected $keyType = 'int'; // Primary key type

    protected $fillable = [
        '_key',
        'uuid',
        'public_id',
        'internal_id',
        'company_uuid',
        'user_uuid',
        'driver_uuid',
        'start_date',
        'end_date',
        'reason',
        'status',
        'approved_by',
        'meta',
        'leave_type',
        'created_by_id',
        'updated_by_id',
        'unavailability_type',
        'vehicle_uuid'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'meta' => 'array', // Cast JSON meta field to array
    ];

    protected $appends = ['processed_by_name'];

    protected $dates = ['deleted_at']; // Enable soft deletes

    public function user()
    {
        return $this->belongsTo(User::class, 'user_uuid', 'uuid'); // Assuming 'user_uuid' in leave_requests maps to 'uuid' in users table
    }
    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by', 'id');
    }

    public function getProcessedByNameAttribute()
    {
        return $this->processedBy?->name ?? null;
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class, 'driver_uuid', 'uuid'); 
    }
}
