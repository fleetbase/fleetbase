<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class Payment extends Model
{
    use HasFactory;
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'payments';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'company_plan_id',
        'plan_id',
        'payment_type',
        'status',
        'amount',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'gocardless_payment_id',
        'gocardless_charge_date',
        'payment_method',
        'payment_metadata',
        'gocardless_customer_id',
        'paid_at',
        'next_payment_date',
        'failed_at',
        'charged_at',
        'paid_out_at',
        'failure_reason',
        'checkout_session_id',
        'checkout_redirect_url',
        'checkout_expires_at',
        'refund_details',
        'invoice_number',
        'created_by_id',
        'updated_by_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'company_plan_id' => 'integer',
        'plan_id' => 'integer',
        'amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'gocardless_charge_date' => 'datetime',
        'payment_metadata' => 'json',
        'paid_at' => 'datetime',
        'charged_at' => 'datetime',
        'paid_out_at' => 'datetime',
        'next_payment_date' => 'datetime', 
        'failed_at' => 'datetime',
        'failure_reason' => 'json',
        'checkout_expires_at' => 'datetime',
        'refund_details' => 'json',
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
     * Available payment types.
     *
     * @var array<string>
     */
    public const PAYMENT_TYPES = [
        'subscription' => 'Subscription',
        'one_time' => 'One Time',
        'setup_fee' => 'Setup Fee',
        'upgrade' => 'Upgrade',
        'refund' => 'Refund',
    ];

    /**
     * Available payment statuses.
     *
     * @var array<string>
     */
    public const STATUSES = [
        'pending' => 'Pending',
        'processing' => 'Processing',
        'completed' => 'Completed',
        'failed' => 'Failed',
        'cancelled' => 'Cancelled',
        'refunded' => 'Refunded',
        'partially_refunded' => 'Partially Refunded',
        'mandate_pending' => 'Mandate Pending',
        'mandate_approved' => 'Mandate Approved',
        'mandate_failed' => 'Mandate Failed',
        'mandate_cancelled' => 'Mandate Cancelled',
        'subscription_cancelled' => 'Subscription Cancelled',
        'subscription_paused' => 'Subscription Paused',
        'subscription_resumed' => 'Subscription Resumed',
        'subscription_creating' => 'Subscription Creating',
        'subscription_expired' => 'Subscription Expired',
        'subscription_active' => 'Subscription Active',
        'payment_failed' => 'Payment Failed',
        'insufficient_funds' => 'Insufficient Funds',
        'disputed' => 'Disputed',
        'on_hold' => 'On Hold',
        'expired' => 'Expired',

    ];

    /**
     * Available payment methods.
     *
     * @var array<string>
     */
    public const PAYMENT_METHODS = [
        'direct_debit' => 'Direct Debit',
        'bank_transfer' => 'Bank Transfer',
        'card' => 'Card',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Automatically set created_by and updated_by
        static::creating(function ($model) {
            if (auth()->check()) {
                $model->created_by_id = optional(auth()->user())->id();
                $model->updated_by_id = optional(auth()->user())->id();
            }
        });

        static::updating(function ($model) {
            if (auth()->check()) {
                $model->updated_by_id = optional(auth()->user())->id();
            }
        });

        // Generate invoice number if not provided
        static::creating(function ($model) {
            if (empty($model->invoice_number)) {
                $model->invoice_number = $model->generateInvoiceNumber();
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
     * Scope a query by payment status.
     *
     * @param Builder $query
     * @param string $status
     * @return Builder
     */
    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    /**
     * Scope a query by payment type.
     *
     * @param Builder $query
     * @param string $type
     * @return Builder
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('payment_type', $type);
    }

    /**
     * Scope a query by payment method.
     *
     * @param Builder $query
     * @param string $method
     * @return Builder
     */
    public function scopeByMethod(Builder $query, string $method): Builder
    {
        return $query->where('payment_method', $method);
    }

    /**
     * Scope a query to only include completed payments.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope a query to only include failed payments.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeFailed(Builder $query): Builder
    {
        return $query->where('status', 'failed');
    }

    /**
     * Scope a query to only include pending payments.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include refunded payments.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeRefunded(Builder $query): Builder
    {
        return $query->whereIn('status', ['refunded', 'partially_refunded']);
    }

    /**
     * Scope payments within date range.
     *
     * @param Builder $query
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @return Builder
     */
    public function scopeBetweenDates(Builder $query, Carbon $startDate, Carbon $endDate): Builder
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Get the company plan relation that this payment belongs to.
     */
    public function companyPlan()
    {
        return $this->belongsTo(CompanyPlanRelation::class, 'company_plan_id');
    }

    /**
     * Get the plan that this payment is for.
     */
    public function plan()
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    /**
     * Get the company through company plan relation.
     */
    public function company()
    {
        return $this->hasOneThrough(
            Company::class,
            CompanyPlanRelation::class,
            'id',
            'uuid',
            'company_plan_id',
            'company_uuid'
        );
    }

    /**
     * Get the user who created this payment.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Get the user who last updated this payment.
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    /**
     * Soft delete the record by setting deleted flag.
     *
     * @return bool
     */
    public function softDelete(): bool
    {
        $this->deleted = 1;
        if (auth()->check()) {
            $this->updated_by_id = optional(auth()->user())->id();
        }
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
        if (auth()->check()) {
            $this->updated_by_id = optional(auth()->user())->id();
        }
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
        if (auth()->check()) {
            $this->updated_by_id = optional(auth()->user())->id();
        }
        return $this->save();
    }

    /**
     * Get the human-readable payment type name.
     *
     * @return string
     */
    public function getPaymentTypeNameAttribute(): string
    {
        return self::PAYMENT_TYPES[$this->payment_type] ?? $this->payment_type;
    }

    /**
     * Get the human-readable status name.
     *
     * @return string
     */
    public function getStatusNameAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /**
     * Get the human-readable payment method name.
     *
     * @return string
     */
    public function getPaymentMethodNameAttribute(): string
    {
        return self::PAYMENT_METHODS[$this->payment_method] ?? $this->payment_method;
    }

    /**
     * Get formatted amount.
     *
     * @return string
     */
    public function getFormattedAmountAttribute(): string
    {
        return '$' . number_format($this->amount, 2);
    }

    /**
     * Get formatted total amount.
     *
     * @return string
     */
    public function getFormattedTotalAmountAttribute(): string
    {
        return '$' . number_format($this->total_amount, 2);
    }

    /**
     * Get the net amount (total - tax - fees).
     *
     * @return float
     */
    public function getNetAmountAttribute(): float
    {
        return $this->amount - ($this->discount_amount ?? 0);
    }

    /**
     * Check if payment is completed.
     *
     * @return bool
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Check if payment is failed.
     *
     * @return bool
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Check if payment is pending.
     *
     * @return bool
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if payment is processing.
     *
     * @return bool
     */
    public function isProcessing(): bool
    {
        return $this->status === 'processing';
    }

    /**
     * Check if payment is refunded.
     *
     * @return bool
     */
    public function isRefunded(): bool
    {
        return in_array($this->status, ['refunded', 'partially_refunded']);
    }

    /**
     * Check if payment is cancelled.
     *
     * @return bool
     */
    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    /**
     * Check if checkout session is expired.
     *
     * @return bool
     */
    public function isCheckoutExpired(): bool
    {
        return $this->checkout_expires_at && $this->checkout_expires_at <= now();
    }

    /**
     * Mark payment as completed.
     *
     * @return bool
     */
    public function markAsCompleted(): bool
    {
        $this->status = 'completed';
        $this->paid_at = now();
        $this->failed_at = null;
        $this->failure_reason = null;
        
        if (auth()->check()) {
            $this->updated_by_id = optional(auth()->user())->id();
        }
        
        return $this->save();
    }

    /**
     * Mark payment as failed.
     *
     * @param array $reason
     * @return bool
     */
    public function markAsFailed(array $reason = []): bool
    {
        $this->status = 'failed';
        $this->failed_at = now();
        $this->failure_reason = $reason;
        $this->paid_at = null;
        
        if (auth()->check()) {
            $this->updated_by_id = optional(auth()->user())->id();
        }
        
        return $this->save();
    }

    /**
     * Mark payment as processing.
     *
     * @return bool
     */
    public function markAsProcessing(): bool
    {
        $this->status = 'processing';
        
        if (auth()->check()) {
            $this->updated_by_id = optional(auth()->user())->id();
        }
        
        return $this->save();
    }

    /**
     * Cancel the payment.
     *
     * @return bool
     */
    public function cancel(): bool
    {
        $this->status = 'cancelled';
        
        if (auth()->check()) {
            $this->updated_by_id = optional(auth()->user())->id();
        }
        
        return $this->save();
    }

    /**
     * Process refund.
     *
     * @param float $amount
     * @param array $details
     * @return bool
     */
    public function processRefund(float $amount, array $details = []): bool
    {
        $refundDetails = $this->refund_details ?? [];
        $refundDetails[] = [
            'amount' => $amount,
            'processed_at' => now(),
            'details' => $details,
        ];
        
        $totalRefunded = collect($refundDetails)->sum('amount');
        
        if ($totalRefunded >= $this->total_amount) {
            $this->status = 'refunded';
        } else {
            $this->status = 'partially_refunded';
        }
        
        $this->refund_details = $refundDetails;
        
        if (auth()->check()) {
            $this->updated_by_id = optional(auth()->user())->id();
        }
        
        return $this->save();
    }

    /**
     * Generate invoice number.
     *
     * @return string
     */
    public function generateInvoiceNumber(): string
    {
        $prefix = 'INV';
        $year = now()->year;
        $month = now()->format('m');
        $sequence = str_pad($this->getNextSequenceNumber(), 4, '0', STR_PAD_LEFT);
        
        return "{$prefix}-{$year}{$month}-{$sequence}";
    }

    /**
     * Get next sequence number for invoice.
     *
     * @return int
     */
    protected function getNextSequenceNumber(): int
    {
        $yearMonth = now()->format('Ym');
        $lastPayment = static::where('invoice_number', 'like', "INV-{$yearMonth}-%")
            ->orderBy('id', 'desc')
            ->first();
        
        if (!$lastPayment) {
            return 1;
        }
        
        $lastSequence = (int) substr($lastPayment->invoice_number, -4);
        return $lastSequence + 1;
    }

    /**
     * Get total refunded amount.
     *
     * @return float
     */
    public function getTotalRefundedAttribute(): float
    {
        if (!$this->refund_details) {
            return 0;
        }
        
        return collect($this->refund_details)->sum('amount');
    }

    /**
     * Get all payment type options for forms.
     *
     * @return array
     */
    public static function getPaymentTypeOptions(): array
    {
        return self::PAYMENT_TYPES;
    }

    /**
     * Get all status options for forms.
     *
     * @return array
     */
    public static function getStatusOptions(): array
    {
        return self::STATUSES;
    }

    /**
     * Get all payment method options for forms.
     *
     * @return array
     */
    public static function getPaymentMethodOptions(): array
    {
        return self::PAYMENT_METHODS;
    }
}
