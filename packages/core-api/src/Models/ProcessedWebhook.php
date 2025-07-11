<?php

namespace Fleetbase\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class ProcessedWebhook extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'processed_webhooks';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'webhook_id',
        'event_id', 
        'processed_at',
        'event_data',
        'created_by_id',
        'updated_by_id',
        'deleted',
        'record_status'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'processed_at' => 'datetime',
        'event_data' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted' => 'boolean',
        'record_status' => 'integer'
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [];

    /**
     * Boot method for model events
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-set processed_at if not provided
        static::creating(function ($model) {
            if (!$model->processed_at) {
                $model->processed_at = Carbon::now();
            }
        });
    }

    /**
     * Scope to get only active records (not deleted)
     */
    public function scopeActive($query)
    {
        return $query->where('deleted', 0);
    }

    /**
     * Scope to get only records with specific status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('record_status', $status);
    }

    /**
     * Scope to find by webhook ID
     */
    public function scopeByWebhookId($query, $webhookId)
    {
        return $query->where('webhook_id', $webhookId);
    }

    /**
     * Scope to find by event ID
     */
    public function scopeByEventId($query, $eventId)
    {
        return $query->where('event_id', $eventId);
    }

    /**
     * Check if a webhook has already been processed
     */
    public static function isAlreadyProcessed($webhookId, $eventId = null)
    {
        $query = static::where('webhook_id', $webhookId);
        
        if ($eventId) {
            $query->where('event_id', $eventId);
        }
        
        return $query->exists();
    }

    /**
     * Mark a webhook as processed
     */
    public static function markAsProcessed($webhookId, $eventId = null, $eventData = null, $createdById = null)
    {
        return static::create([
            'webhook_id' => $webhookId,
            'event_id' => $eventId,
            'event_data' => $eventData,
            'created_by_id' => $createdById,
            'processed_at' => Carbon::now()
        ]);
    }

    /**
     * Get the user who created this record
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Get the user who last updated this record
     */
    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    /**
     * Get formatted processed date
     */
    public function getFormattedProcessedAtAttribute()
    {
        return $this->processed_at ? $this->processed_at->format('Y-m-d H:i:s') : null;
    }

    /**
     * Get event data as a specific key
     */
    public function getEventDataValue($key, $default = null)
    {
        return data_get($this->event_data, $key, $default);
    }

    /**
     * Check if record is active (not deleted)
     */
    public function isActive()
    {
        return $this->deleted === 0;
    }

    /**
     * Soft delete by setting deleted flag
     */
    public function softDelete()
    {
        return $this->update(['deleted' => 1]);
    }

    /**
     * Restore soft deleted record
     */
    public function restore()
    {
        return $this->update(['deleted' => 0]);
    }

    /**
     * Get recent processed webhooks
     */
    public function scopeRecent($query, $days = 7)
    {
        return $query->where('processed_at', '>=', Carbon::now()->subDays($days));
    }

    /**
     * Get processed webhooks by date range
     */
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('processed_at', [$startDate, $endDate]);
    }
}