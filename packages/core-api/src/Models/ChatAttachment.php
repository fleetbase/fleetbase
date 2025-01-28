<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\SendsWebhooks;

class ChatAttachment extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use SendsWebhooks;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'chat_attachments';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'chat_attachment';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'company_uuid',
        'chat_channel_uuid',
        'chat_message_uuid',
        'sender_uuid',
        'file_uuid',
    ];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function sender()
    {
        return $this->belongsTo(ChatParticipant::class, 'sender_uuid', 'uuid');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function chatChannel()
    {
        return $this->belongsTo(ChatChannel::class, 'chat_channel_uuid', 'uuid');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function message()
    {
        return $this->belongsTo(ChatMessage::class, 'chat_message_uuid', 'uuid');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function file()
    {
        return $this->belongsTo(File::class, 'file_uuid', 'uuid');
    }
}
