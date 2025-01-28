<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\SendsWebhooks;

class ChatReceipt extends Model
{
    use HasUuid;
    use SendsWebhooks;
    use HasApiModelBehavior;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'chat_receipts';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'chat_receipt';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'company_uuid',
        'chat_message_uuid',
        'participant_uuid',
        'read_at',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'read_at'          => 'datetime',
    ];

    /**
     * Set `read_at` when creating.
     *
     * @return void
     */
    public static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->read_at = now();
        });
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function participant()
    {
        return $this->belongsTo(ChatParticipant::class, 'participant_uuid', 'uuid');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function chatMessage()
    {
        return $this->belongsTo(ChatMessage::class, 'chat_message_uuid', 'uuid');
    }

    /**
     * Get the receipt participants name.
     */
    public function getParticipantNameAttribute(): ?string
    {
        return $this->participant ? $this->participant->name : null;
    }
}
