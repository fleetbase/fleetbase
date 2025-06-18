<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class Plan extends Model
{
    use HasFactory;
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'plan';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'payment_gateway_id',
        'created_by_id',
        'updated_by_id',
       
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'payment_gateway_id' => 'integer',
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
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payment_gateway_id' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
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
     * Get the payment gateway that owns the plan.
     */
    public function paymentGateway()
    {
        return $this->belongsTo(PaymentGateway::class, 'payment_gateway_id');
    }

    /**
     * Get the user who created the plan.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Get the user who last updated the plan.
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

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

        // Global scope to exclude soft deleted records by default
        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $builder->where('deleted', 0);
        });
    }

    /**
     * Soft delete the model.
     *
     * @return bool
     */
    public function softDelete(): bool
    {
        $this->deleted = 1;
        $this->record_status = 0;
        if (auth()->check()) {
            $this->updated_by_id =  optional(auth()->user())->id();
        }
        return $this->save();
    }

    /**
     * Restore the soft deleted model.
     *
     * @return bool
     */
    public function restore(): bool
    {
        $this->deleted = 0;
        $this->record_status = 1;
        if (auth()->check()) {
            $this->updated_by_id = optional(auth()->user())->id();
        }
        return $this->save();
    }

    /**
     * Check if the model is soft deleted.
     *
     * @return bool
     */
    public function isDeleted(): bool
    {
        return $this->deleted === 1;
    }

    /**
     * Check if the model is active.
     *
     * @return bool
     */
    public function isActive(): bool
    {
        return $this->deleted === 0 && $this->record_status === 1;
    }
}
