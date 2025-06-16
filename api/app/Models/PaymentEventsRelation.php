<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class PaymentEventsRelation extends Model
{
    use HasFactory;
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'payment_events_relation';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'payment_id',
        'event_type',
        'event_data',
        'event_date',
        'gateway_event_id',
        'event_status',
        'error_message',
        'created_by_id',
        'updated_by_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'payment_id' => 'integer',
        'event_date' => 'datetime',
        'created_by_id' => 'integer',
        'updated_by_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [];

    /**
     * Common payment event types.
     *
     * @var array<string>
     */
    public const EVENT_TYPES = [
        'payment_created' => 'Payment Created',
        'payment_confirmed' => 'Payment Confirmed',
        'payment_cancelled' => 'Payment Cancelled',
        'payment_failed' => 'Payment Failed',
        'payment_charged_back' => 'Payment Charged Back',
        'payment_refunded' => 'Payment Refunded',
        'payment_partially_refunded' => 'Payment Partially Refunded',
        'mandate_created' => 'Mandate Created',
        'mandate_submitted' => 'Mandate Submitted',
        'mandate_active' => 'Mandate Active',
        'mandate_cancelled' => 'Mandate Cancelled',
        'mandate_failed' => 'Mandate Failed',
        'mandate_expired' => 'Mandate Expired',
        'payout_paid' => 'Payout Paid',
        'subscription_created' => 'Subscription Created',
        'subscription_payment_created' => 'Subscription Payment Created',
        'webhook_received' => 'Webhook Received',
        'webhook_processed' => 'Webhook Processed',
        'webhook_failed' => 'Webhook Failed',
    ];

    /**
     * Common event statuses.
     *
     * @var array<string>
     */
    public const EVENT_STATUSES = [
        'pending' => 'Pending',
        'processing' => 'Processing',
        'completed' => 'Completed',
        'failed' => 'Failed',
        'cancelled' => 'Cancelled',
        'error' => 'Error',
        'success' => 'Success',
        'warning' => 'Warning',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Automatically set created_by
        static::creating(function ($model) {
            if (auth()->check()) {
                $model->created_by_id = optional(auth()->user())->id();
            }
        });

        // Set event_date if not provided
        static::creating(function ($model) {
            if (empty($model->event_date)) {
                $model->event_date = now();
            }
        });
    }

    /**
     * Scope a query to only include active records.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('deleted', 0)
                    ->where('record_status', 1);
    }

    /**
     * Scope a query to only include non-deleted records.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeNotDeleted(Builder $query): Builder
    {
        return $query->where('deleted', 0);
    }

    /**
     * Scope a query by event type.
     *
     * @param Builder $query
     * @param string $eventType
     * @return Builder
     */
    public function scopeByEventType(Builder $query, string $eventType): Builder
    {
        return $query->where('event_type', $eventType);
    }

    /**
     * Scope a query by event status.
     *
     * @param Builder $query
     * @param string $status
     * @return Builder
     */
    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('event_status', $status);
    }

    /**
     * Scope a query to only include successful events.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeSuccessful(Builder $query): Builder
    {
        return $query->whereIn('event_status', ['completed', 'success']);
    }

    /**
     * Scope a query to only include failed events.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeFailed(Builder $query): Builder
    {
        return $query->whereIn('event_status', ['failed', 'error']);
    }

    /**
     * Scope a query to only include pending events.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('event_status', 'pending');
    }

    /**
     * Scope events within date range.
     *
     * @param Builder $query
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @return Builder
     */
    public function scopeBetweenDates(Builder $query, Carbon $startDate, Carbon $endDate): Builder
    {
        return $query->whereBetween('event_date', [$startDate, $endDate]);
    }

    /**
     * Scope events for today.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeToday(Builder $query): Builder
    {
        return $query->whereDate('event_date', today());
    }

    /**
     * Scope events by gateway event ID.
     *
     * @param Builder $query
     * @param string $gatewayEventId
     * @return Builder
     */
    public function scopeByGatewayEventId(Builder $query, string $gatewayEventId): Builder
    {
        return $query->where('gateway_event_id', $gatewayEventId);
    }

    /**
     * Get the payment that this event belongs to.
     */
    public function payment()
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }

    /**
     * Get the user who created this event.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Soft delete the record by setting deleted flag.
     *
     * @return bool
     */
    public function softDelete(): bool
    {
        $this->deleted = 1;
        return $this->save();
    }

    /**
     * Restore the soft deleted record.
     *
     * @return bool
     */
    public function restore(): bool
    {
        $this->deleted = 0;
        return $this->save();
    }

    /**
     * Toggle the record status.
     *
     * @return bool
     */
    public function toggleStatus(): bool
    {
        $this->record_status = $this->record_status == 1 ? 0 : 1;
        return $this->save();
    }

    /**
     * Get the human-readable event type name.
     *
     * @return string
     */
    public function getEventTypeNameAttribute(): string
    {
        return self::EVENT_TYPES[$this->event_type] ?? $this->event_type;
    }

    /**
     * Get the human-readable event status name.
     *
     * @return string
     */
    public function getEventStatusNameAttribute(): string
    {
        return self::EVENT_STATUSES[$this->event_status] ?? $this->event_status;
    }

    /**
     * Get parsed event data as array.
     *
     * @return array
     */
    public function getParsedEventDataAttribute(): array
    {
        try {
            return json_decode($this->event_data, true) ?? [];
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Check if event is successful.
     *
     * @return bool
     */
    public function isSuccessful(): bool
    {
        return in_array($this->event_status, ['completed', 'success']);
    }

    /**
     * Check if event is failed.
     *
     * @return bool
     */
    public function isFailed(): bool
    {
        return in_array($this->event_status, ['failed', 'error']);
    }

    /**
     * Check if event is pending.
     *
     * @return bool
     */
    public function isPending(): bool
    {
        return $this->event_status === 'pending';
    }

    /**
     * Check if event is processing.
     *
     * @return bool
     */
    public function isProcessing(): bool
    {
        return $this->event_status === 'processing';
    }

    /**
     * Check if event has error message.
     *
     * @return bool
     */
    public function hasError(): bool
    {
        return !empty($this->error_message);
    }

    /**
     * Mark event as completed.
     *
     * @return bool
     */
    public function markAsCompleted(): bool
    {
        $this->event_status = 'completed';
        $this->error_message = null;
        return $this->save();
    }

    /**
     * Mark event as failed.
     *
     * @param string $errorMessage
     * @return bool
     */
    public function markAsFailed(string $errorMessage = ''): bool
    {
        $this->event_status = 'failed';
        if (!empty($errorMessage)) {
            $this->error_message = $errorMessage;
        }
        return $this->save();
    }

    /**
     * Mark event as processing.
     *
     * @return bool
     */
    public function markAsProcessing(): bool
    {
        $this->event_status = 'processing';
        return $this->save();
    }

    /**
     * Update event data.
     *
     * @param array $data
     * @return bool
     */
    public function updateEventData(array $data): bool
    {
        $currentData = $this->parsed_event_data;
        $mergedData = array_merge($currentData, $data);
        $this->event_data = json_encode($mergedData);
        return $this->save();
    }

    /**
     * Create a new payment event.
     *
     * @param int $paymentId
     * @param string $eventType
     * @param array $eventData
     * @param string $gatewayEventId
     * @param string $status
     * @return static
     */
    public static function createEvent(
        int $paymentId,
        string $eventType,
        array $eventData = [],
        string $gatewayEventId = '',
        string $status = 'pending'
    ): self {
        return self::create([
            'payment_id' => $paymentId,
            'event_type' => $eventType,
            'event_data' => json_encode($eventData),
            'gateway_event_id' => $gatewayEventId,
            'event_status' => $status,
            'event_date' => now(),
        ]);
    }

    /**
     * Get events timeline for a payment.
     *
     * @param int $paymentId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function getPaymentTimeline(int $paymentId)
    {
        return self::where('payment_id', $paymentId)
            ->active()
            ->orderBy('event_date', 'asc')
            ->get();
    }

    /**
     * Check if gateway event already exists.
     *
     * @param string $gatewayEventId
     * @return bool
     */
    public static function gatewayEventExists(string $gatewayEventId): bool
    {
        return self::where('gateway_event_id', $gatewayEventId)
            ->notDeleted()
            ->exists();
    }

    /**
     * Get latest event for payment.
     *
     * @param int $paymentId
     * @return static|null
     */
    public static function getLatestEventForPayment(int $paymentId): ?self
    {
        return self::where('payment_id', $paymentId)
            ->active()
            ->latest('event_date')
            ->first();
    }

    /**
     * Get event statistics for a date range.
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @return array
     */
    public static function getEventStatistics(Carbon $startDate, Carbon $endDate): array
    {
        $events = self::betweenDates($startDate, $endDate)
            ->active()
            ->get();

        return [
            'total_events' => $events->count(),
            'successful_events' => $events->where('event_status', 'completed')->count(),
            'failed_events' => $events->whereIn('event_status', ['failed', 'error'])->count(),
            'pending_events' => $events->where('event_status', 'pending')->count(),
            'event_types' => $events->groupBy('event_type')->map->count(),
            'event_statuses' => $events->groupBy('event_status')->map->count(),
        ];
    }

    /**
     * Get all event type options for forms.
     *
     * @return array
     */
    public static function getEventTypeOptions(): array
    {
        return self::EVENT_TYPES;
    }

    /**
     * Get all event status options for forms.
     *
     * @return array
     */
    public static function getEventStatusOptions(): array
    {
        return self::EVENT_STATUSES;
    }

    /**
     * Log a webhook event.
     *
     * @param int $paymentId
     * @param string $webhookType
     * @param array $webhookData
     * @param string $gatewayEventId
     * @return static
     */
    public static function logWebhookEvent(
        int $paymentId,
        string $webhookType,
        array $webhookData,
        string $gatewayEventId
    ): self {
        return self::createEvent(
            $paymentId,
            'webhook_received',
            [
                'webhook_type' => $webhookType,
                'webhook_data' => $webhookData,
                'received_at' => now()->toISOString(),
            ],
            $gatewayEventId,
            'completed'
        );
    }
}
