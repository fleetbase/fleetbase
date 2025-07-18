<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FailedWebhook extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'failed_webhooks';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'event_type',
        'event_data',
        'error_message',
        'created_by_id',
        'updated_by_id',
        'deleted',
        'record_status',
    ];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;
} 