<?php

namespace Fleetbase\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;
class PlanPricingRelation extends Model
{
    use HasFactory;
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'plan_pricing_relation';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'plan_id',
        'billing_cycle',
        'price_per_user',
        'price_per_driver',
        'currency',
        'created_by_id',
        'updated_by_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'plan_id' => 'integer',
        'price_per_user' => 'decimal:2',
        'price_per_driver' => 'decimal:2',
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
     * Available billing cycles.
     *
     * @var array<string>
     */
    public const BILLING_CYCLES = [
        'monthly' => 'Monthly',
        'quarterly' => 'Quarterly',
        'annual' => 'Annual',
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
     * Scope a query by billing cycle.
     *
     * @param Builder $query
     * @param string $cycle
     * @return Builder
     */
    public function scopeByBillingCycle(Builder $query, string $cycle): Builder
    {
        return $query->where('billing_cycle', $cycle);
    }

    /**
     * Scope a query by currency.
     *
     * @param Builder $query
     * @param string $currency
     * @return Builder
     */
    public function scopeByCurrency(Builder $query, string $currency): Builder
    {
        return $query->where('currency', $currency);
    }

    /**
     * Get the plan that this pricing relation belongs to.
     */
    public function plan()
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    /**
     * Get the user who created this pricing relation.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Get the user who last updated this pricing relation.
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
     * Get the human-readable billing cycle name.
     *
     * @return string
     */
    public function getBillingCycleNameAttribute(): string
    {
        return self::BILLING_CYCLES[$this->billing_cycle] ?? $this->billing_cycle;
    }

    /**
     * Calculate total price for given number of users and drivers.
     *
     * @param int $users
     * @param int $drivers
     * @return float
     */
    public function calculateTotalPrice(int $users = 1, int $drivers = 0): float
    {
        return ($this->price_per_user * $users) + ($this->price_per_driver * $drivers);
    }

    /**
     * Get formatted price per user.
     *
     * @return string
     */
    public function getFormattedPricePerUserAttribute(): string
    {
        return $this->currency . ' ' . number_format($this->price_per_user, 2);
    }

    /**
     * Get formatted price per driver.
     *
     * @return string
     */
    public function getFormattedPricePerDriverAttribute(): string
    {
        return $this->currency . ' ' . number_format($this->price_per_driver, 2);
    }

    /**
     * Check if the pricing is for monthly billing.
     *
     * @return bool
     */
    public function isMonthly(): bool
    {
        return $this->billing_cycle === 'monthly';
    }

    /**
     * Check if the pricing is for quarterly billing.
     *
     * @return bool
     */
    public function isQuarterly(): bool
    {
        return $this->billing_cycle === 'quarterly';
    }

    /**
     * Check if the pricing is for annual billing.
     *
     * @return bool
     */
    public function isAnnual(): bool
    {
        return $this->billing_cycle === 'annual';
    }

    /**
     * Get all billing cycles as options for forms.
     *
     * @return array
     */
    public static function getBillingCycleOptions(): array
    {
        return self::BILLING_CYCLES;
    }
}
