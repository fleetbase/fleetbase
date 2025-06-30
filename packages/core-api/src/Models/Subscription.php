<?php

namespace Fleetbase\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class Subscription extends Model
{
    use HasFactory;
    const DELETED_AT = null;

    protected $fillable = [
        'company_uuid',
        'user_uuid',
        'payment_id',
        'gocardless_subscription_id',
        'gocardless_mandate_id',
        'interval_unit',
        'interval',
        'day_of_month',
        'status',
        'start_date',
        'end_date',
        'billing_request_id',
        'billing_request_flow_id',
        'upcoming_payments_count',
        'payment_reference',
        'metadata',
        'cancelled_at',
        'paused_at',
        'created_by_id',
        'updated_by_id',
        'deleted',
        'record_status',
    ];

    protected $casts = [
        'metadata' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
        'cancelled_at' => 'datetime',
        'paused_at' => 'datetime',
        'deleted' => 'boolean',
        'record_status' => 'boolean',
        'upcoming_payments_count' => 'integer',
        'interval' => 'integer',
        'day_of_month' => 'integer',
    ];

    protected $dates = [
        'start_date',
        'end_date',
        'cancelled_at',
        'paused_at',
        'created_at',
        'updated_at',
        
    ];

    // Define status constants
    const STATUS_PENDING_APPROVAL = 'pending_customer_approval';
    const STATUS_APPROVAL_DENIED = 'customer_approval_denied';
    const STATUS_ACTIVE = 'active';
    const STATUS_FINISHED = 'finished';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_PAUSED = 'paused';

    // Define interval unit constants
    const INTERVAL_WEEKLY = 'weekly';
    const INTERVAL_MONTHLY = 'monthly';
    const INTERVAL_YEARLY = 'yearly';

    protected static function boot()
    {
        parent::boot();
        
        // Auto-generate UUID if not provided
        static::addGlobalScope('active', function ($query) {
            return $query->where('deleted', 0)
                        ->where('record_status', 1);
        });
    }

    // ===============================================
    // RELATIONSHIPS
    // ===============================================

    /**
     * Get the company that owns the subscription
     */
    public function company()
    {
        return $this->belongsTo(Company::class, 'company_uuid', 'uuid');
    }

    /**
     * Get the user that owns the subscription
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_uuid', 'uuid');
    }

    /**
     * Get the payment associated with the subscription
     */
    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * Get the user who created this subscription
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Get the user who last updated this subscription
     */
    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    /**
     * Get GoCardless mandate (if you have a mandate model)
     */
    public function gocardlessMandate()
    {
        return $this->belongsTo(GocardlessMandate::class, 'gocardless_mandate_id', 'gocardless_mandate_id');
    }

    /**
     * Get GoCardless payments for this subscription
     */
    public function gocardlessPayments()
    {
        return $this->hasMany(GocardlessPayment::class, 'gocardless_subscription_id', 'gocardless_subscription_id');
    }

    // ===============================================
    // QUERY SCOPES
    // ===============================================

    /**
     * Scope to get only active subscriptions
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE)
                    ->where('record_status', 1)
                    ->where('deleted', 0);
    }

    /**
     * Scope to get inactive subscriptions
     */
    public function scopeInactive($query)
    {
        return $query->whereIn('status', [
            self::STATUS_CANCELLED,
            self::STATUS_FINISHED,
            self::STATUS_PAUSED
        ]);
    }

    /**
     * Scope to get pending subscriptions
     */
    public function scopePending($query)
    {
        return $query->whereIn('status', [
            self::STATUS_PENDING_APPROVAL,
            self::STATUS_APPROVAL_DENIED
        ]);
    }

    /**
     * Scope for a specific company
     */
    public function scopeForCompany($query, $companyUuid)
    {
        return $query->where('company_uuid', $companyUuid);
    }

    /**
     * Scope for a specific user
     */
    public function scopeForUser($query, $userUuid)
    {
        return $query->where('user_uuid', $userUuid);
    }

    /**
     * Scope for monthly subscriptions
     */
    public function scopeMonthly($query)
    {
        return $query->where('interval_unit', self::INTERVAL_MONTHLY);
    }

    /**
     * Scope for yearly subscriptions
     */
    public function scopeYearly($query)
    {
        return $query->where('interval_unit', self::INTERVAL_YEARLY);
    }

    /**
     * Scope for subscriptions due for renewal
     */
    public function scopeDueForRenewal($query, $days = 7)
    {
        $date = Carbon::now()->addDays($days);
        return $query->where('status', self::STATUS_ACTIVE)
                    ->whereDate('end_date', '<=', $date);
    }

    // ===============================================
    // ACCESSORS & MUTATORS
    // ===============================================

    /**
     * Get the subscription's display name
     */
    public function getDisplayNameAttribute()
    {
        $intervalText = $this->interval > 1 ? $this->interval . ' ' : '';
        $unitText = $this->interval_unit;
        if ($this->interval > 1) {
            $unitText = $unitText === 'monthly' ? 'months' : $unitText . 's';
        }
        
        return ucfirst($intervalText . $unitText) . ' Subscription';
    }

    /**
     * Check if subscription is active
     */
    public function getIsActiveAttribute()
    {
        return $this->status === self::STATUS_ACTIVE && 
               $this->record_status == 1 && 
               $this->deleted == 0;
    }

    /**
     * Check if subscription is cancelled
     */
    public function getIsCancelledAttribute()
    {
        return in_array($this->status, [self::STATUS_CANCELLED, self::STATUS_FINISHED]);
    }

    /**
     * Check if subscription is paused
     */
    public function getIsPausedAttribute()
    {
        return $this->status === self::STATUS_PAUSED;
    }

    /**
     * Check if subscription is pending
     */
    public function getIsPendingAttribute()
    {
        return in_array($this->status, [
            self::STATUS_PENDING_APPROVAL,
            self::STATUS_APPROVAL_DENIED
        ]);
    }

    /**
     * Get next billing date
     */
    public function getNextBillingDateAttribute()
    {
        if (!$this->is_active || !$this->start_date) {
            return null;
        }

        $startDate = Carbon::parse($this->start_date);
        $now = Carbon::now();

        // If start date is in the future, return start date
        if ($startDate->isFuture()) {
            return $startDate;
        }

        switch ($this->interval_unit) {
            case self::INTERVAL_WEEKLY:
                $nextDate = $startDate->copy();
                while ($nextDate->isPast()) {
                    $nextDate->addWeeks($this->interval);
                }
                return $nextDate;

            case self::INTERVAL_MONTHLY:
                $nextDate = $startDate->copy();
                while ($nextDate->isPast()) {
                    $nextDate->addMonths($this->interval);
                }
                
                // Set specific day of month if specified
                if ($this->day_of_month && $this->day_of_month <= $nextDate->daysInMonth) {
                    $nextDate->day($this->day_of_month);
                }
                return $nextDate;

            case self::INTERVAL_YEARLY:
                $nextDate = $startDate->copy();
                while ($nextDate->isPast()) {
                    $nextDate->addYears($this->interval);
                }
                return $nextDate;

            default:
                return null;
        }
    }

    /**
     * Get days until next billing
     */
    public function getDaysUntilNextBillingAttribute()
    {
        $nextBilling = $this->next_billing_date;
        return $nextBilling ? Carbon::now()->diffInDays($nextBilling, false) : null;
    }

    /**
     * Get subscription duration in days
     */
    public function getDurationInDaysAttribute()
    {
        if (!$this->start_date) {
            return null;
        }

        $endDate = $this->end_date ? Carbon::parse($this->end_date) : Carbon::now();
        return Carbon::parse($this->start_date)->diffInDays($endDate);
    }

    // ===============================================
    // BUSINESS LOGIC METHODS
    // ===============================================

    /**
     * Cancel the subscription
     */
    public function cancel($reason = null)
    {
        $this->update([
            'status' => self::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'metadata' => array_merge($this->metadata ?? [], [
                'cancellation_reason' => $reason,
                'cancelled_by' => auth()->id(),
                'cancelled_at' => now()->toISOString(),
            ])
        ]);

        return $this;
    }

    /**
     * Pause the subscription
     */
    public function pause($reason = null)
    {
        $this->update([
            'status' => self::STATUS_PAUSED,
            'paused_at' => now(),
            'metadata' => array_merge($this->metadata ?? [], [
                'pause_reason' => $reason,
                'paused_by' => auth()->id(),
                'paused_at' => now()->toISOString(),
            ])
        ]);

        return $this;
    }

    /**
     * Resume the subscription
     */
    public function resume()
    {
        $this->update([
            'status' => self::STATUS_ACTIVE,
            'paused_at' => null,
            'metadata' => array_merge($this->metadata ?? [], [
                'resumed_by' => auth()->id(),
                'resumed_at' => now()->toISOString(),
            ])
        ]);

        return $this;
    }

    /**
     * Mark subscription as finished
     */
    public function finish()
    {
        $this->update([
            'status' => self::STATUS_FINISHED,
            'end_date' => now()->toDateString(),
        ]);

        return $this;
    }

    /**
     * Activate the subscription
     */
    public function activate()
    {
        $this->update([
            'status' => self::STATUS_ACTIVE,
            'start_date' => $this->start_date ?? now()->toDateString(),
        ]);

        return $this;
    }

    /**
     * Update metadata
     */
    public function updateMetadata(array $metadata)
    {
        $this->update([
            'metadata' => array_merge($this->metadata ?? [], $metadata)
        ]);

        return $this;
    }

    /**
     * Get subscription status label
     */
    public function getStatusLabelAttribute()
    {
        return match($this->status) {
            self::STATUS_ACTIVE => 'Active',
            self::STATUS_CANCELLED => 'Cancelled',
            self::STATUS_PAUSED => 'Paused',
            self::STATUS_FINISHED => 'Finished',
            self::STATUS_PENDING_APPROVAL => 'Pending Approval',
            self::STATUS_APPROVAL_DENIED => 'Approval Denied',
            default => 'Unknown'
        };
    }

    /**
     * Get subscription status color for UI
     */
    public function getStatusColorAttribute()
    {
        return match($this->status) {
            self::STATUS_ACTIVE => 'green',
            self::STATUS_CANCELLED => 'red',
            self::STATUS_PAUSED => 'yellow',
            self::STATUS_FINISHED => 'gray',
            self::STATUS_PENDING_APPROVAL => 'blue',
            self::STATUS_APPROVAL_DENIED => 'red',
            default => 'gray'
        };
    }

    // ===============================================
    // STATIC HELPER METHODS
    // ===============================================

    /**
     * Get all available statuses
     */
    public static function getStatuses()
    {
        return [
            self::STATUS_PENDING_APPROVAL => 'Pending Approval',
            self::STATUS_APPROVAL_DENIED => 'Approval Denied',
            self::STATUS_ACTIVE => 'Active',
            self::STATUS_FINISHED => 'Finished',
            self::STATUS_CANCELLED => 'Cancelled',
            self::STATUS_PAUSED => 'Paused',
        ];
    }

    /**
     * Get all available interval units
     */
    public static function getIntervalUnits()
    {
        return [
            self::INTERVAL_WEEKLY => 'Weekly',
            self::INTERVAL_MONTHLY => 'Monthly',
            self::INTERVAL_YEARLY => 'Yearly',
        ];
    }

    /**
     * Create subscription from GoCardless data
     */
    public static function createFromGocardless(array $data, $companyUuid, $userUuid)
    {
        return self::create([
            'company_uuid' => $companyUuid,
            'user_uuid' => $userUuid,
            'gocardless_subscription_id' => $data['id'],
            'gocardless_mandate_id' => $data['links']['mandate'] ?? null,
            'interval_unit' => $data['interval_unit'],
            'interval' => $data['interval'] ?? 1,
            'day_of_month' => $data['day_of_month'] ?? null,
            'status' => $data['status'],
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null,
            'upcoming_payments_count' => $data['upcoming_payments_count'] ?? 0,
            'payment_reference' => $data['payment_reference'] ?? null,
            'metadata' => $data['metadata'] ?? null,
            'created_by_id' => auth()->id(),
            'record_status' => 1,
            'deleted' => 0,
        ]);
    }
}