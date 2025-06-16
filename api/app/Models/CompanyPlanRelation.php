<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class CompanyPlanRelation extends Model
{
    use HasFactory;
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'company_plan_relation';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        
        'company_uuid',
        'user_uuid',
        'plan_pricing_id',
        'no_of_web_users',
        'no_of_app_users',
        'total_amount',
        'cancelled_at',
        'cancellation_reason',
        'auto_renew',
        'expires_at',
        'status',
        'created_by_id',
        'updated_by_id',
        
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'company_id' => 'integer',
        'company_uuid' => 'string',
        'user_uuid' => 'string',
        'plan_pricing_id' => 'integer',
        'no_of_web_users' => 'integer',
        'no_of_app_users' => 'integer',
        'total_amount' => 'decimal:2',
        'cancelled_at' => 'datetime',
        'cancellation_reason' => 'json',
        'auto_renew' => 'boolean',
        'expires_at' => 'datetime',
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
     * Available subscription statuses.
     *
     * @var array<string>
     */
    public const STATUSES = [
        'pending' => 'Pending',
        'active' => 'Active',
        'expired' => 'Expired',
        'cancelled' => 'Cancelled',
        'suspended' => 'Suspended',
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
                $model->created_by = auth()->id();
                $model->updated_by = auth()->id();
            }
        });

        static::updating(function ($model) {
            if (auth()->check()) {
                $model->updated_by = auth()->id();
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
     * Scope a query by status.
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
     * Scope a query to only include active subscriptions.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeActiveSubscriptions(Builder $query): Builder
    {
        return $query->where('status', 'active')
                    ->where('expires_at', '>', now());
    }

    /**
     * Scope a query to only include expired subscriptions.
     *
     * @param Builder $query
     * @return Builder
     */
    public function scopeExpiredSubscriptions(Builder $query): Builder
    {
        return $query->where('expires_at', '<=', now())
                    ->whereIn('status', ['active', 'expired']);
    }

    /**
     * Scope a query to only include subscriptions expiring soon.
     *
     * @param Builder $query
     * @param int $days
     * @return Builder
     */
    public function scopeExpiringSoon(Builder $query, int $days = 7): Builder
    {
        return $query->where('status', 'active')
                    ->whereBetween('expires_at', [now(), now()->addDays($days)]);
    }

    /**
     * Get the company that this subscription belongs to.
     */
    public function company()
    {
        return $this->belongsTo(Company::class, 'company_uuid', 'uuid');
    }

    /**
     * Get the user that this subscription belongs to.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_uuid', 'uuid');
    }

    /**
     * Get the plan pricing relation.
     */
    public function planPricing()
    {
        return $this->belongsTo(PlanPricingRelation::class, 'plan_pricing_id');
    }

    /**
     * Get the plan through plan pricing relation.
     */
    public function plan()
    {
        return $this->hasOneThrough(
            Plan::class,
            PlanPricingRelation::class,
            'id',
            'id',
            'plan_pricing_id',
            'plan_id'
        );
    }

    /**
     * Get the user who created this subscription.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated this subscription.
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
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
            $this->updated_by = auth()->id();
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
            $this->updated_by = auth()->id();
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
            $this->updated_by = auth()->id();
        }
        return $this->save();
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
     * Get the total number of users.
     *
     * @return int
     */
    public function getTotalUsersAttribute(): int
    {
        return $this->no_of_web_users + $this->no_of_app_users;
    }

    /**
     * Get formatted total amount.
     *
     * @return string
     */
    public function getFormattedTotalAmountAttribute(): string
    {
        $currency = $this->planPricing->currency ?? 'USD';
        return $currency . ' ' . number_format($this->total_amount, 2);
    }

    /**
     * Check if subscription is active and not expired.
     *
     * @return bool
     */
    public function isActive(): bool
    {
        return $this->status === 'active' && $this->expires_at > now();
    }

    /**
     * Check if subscription is expired.
     *
     * @return bool
     */
    public function isExpired(): bool
    {
        return $this->expires_at <= now() || $this->status === 'expired';
    }

    /**
     * Check if subscription is cancelled.
     *
     * @return bool
     */
    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    /**
     * Check if subscription is suspended.
     *
     * @return bool
     */
    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }

    /**
     * Check if subscription is expiring soon.
     *
     * @param int $days
     * @return bool
     */
    public function isExpiringSoon(int $days = 7): bool
    {
        return $this->isActive() && $this->expires_at <= now()->addDays($days);
    }

    /**
     * Get days until expiration.
     *
     * @return int
     */
    public function getDaysUntilExpirationAttribute(): int
    {
        return max(0, now()->diffInDays($this->expires_at, false));
    }

    /**
     * Cancel the subscription.
     *
     * @param array $reason
     * @return bool
     */
    public function cancel(array $reason = []): bool
    {
        $this->status = 'cancelled';
        $this->cancelled_at = now();
        $this->cancellation_reason = $reason;
        $this->auto_renew = false;
        
        if (auth()->check()) {
            $this->updated_by = auth()->id();
        }
        
        return $this->save();
    }

    /**
     * Suspend the subscription.
     *
     * @return bool
     */
    public function suspend(): bool
    {
        $this->status = 'suspended';
        
        if (auth()->check()) {
            $this->updated_by = auth()->id();
        }
        
        return $this->save();
    }

    /**
     * Activate the subscription.
     *
     * @return bool
     */
    public function activate(): bool
    {
        $this->status = 'active';
        
        if (auth()->check()) {
            $this->updated_by = auth()->id();
        }
        
        return $this->save();
    }

    /**
     * Extend subscription by given period.
     *
     * @param int $months
     * @return bool
     */
    public function extend(int $months = 1): bool
    {
        $this->expires_at = $this->expires_at->addMonths($months);
        
        if (auth()->check()) {
            $this->updated_by = auth()->id();
        }
        
        return $this->save();
    }

    /**
     * Renew subscription based on plan pricing.
     *
     * @return bool
     */
    public function renew(): bool
    {
        if (!$this->planPricing) {
            return false;
        }

        // Extend based on billing cycle
        switch ($this->planPricing->billing_cycle) {
            case 'monthly':
                $this->expires_at = now()->addMonth();
                break;
            case 'quarterly':
                $this->expires_at = now()->addMonths(3);
                break;
            case 'annual':
                $this->expires_at = now()->addYear();
                break;
        }

        $this->status = 'active';
        
        if (auth()->check()) {
            $this->updated_by = auth()->id();
        }
        
        return $this->save();
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


}
