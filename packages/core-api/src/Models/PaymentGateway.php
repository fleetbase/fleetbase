<?php

namespace Fleetbase\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class PaymentGateway extends Model
{
    use HasFactory;
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'payment_gateway';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'created_by_id',
        'updated_by_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
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
     * Get the user who created this payment gateway.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Get the user who last updated this payment gateway.
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
        $this->deleted = true;
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
        $this->record_status = !$this->record_status;
        if (auth()->check()) {
            $this->updated_by_id = optional(auth()->user())->id();
        }
        return $this->save();
    }
}
