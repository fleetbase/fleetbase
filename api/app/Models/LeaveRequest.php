<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Fleetbase\Models\User;
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
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'meta' => 'array', // Cast JSON meta field to array
    ];

    protected $dates = ['deleted_at']; // Enable soft deletes

    public function user()
{
    return $this->belongsTo(User::class, 'user_uuid', 'uuid'); // Assuming 'user_uuid' in leave_requests maps to 'uuid' in users table
}
}
