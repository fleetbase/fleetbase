<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\SendsWebhooks;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class ChatParticipant extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use SendsWebhooks;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'chat_participants';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'chat_participant';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['company_uuid', 'chat_channel_uuid', 'user_uuid'];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['is_online', 'last_seen_at'];

    /**
     * The relationships to always load along with the model.
     *
     * @var array
     */
    protected $with = ['user'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [];

    public function user(): BelongsTo|Builder
    {
        return $this->belongsTo(User::class, 'user_uuid', 'uuid')->withTrashed();
    }

    public function chatChannel(): BelongsTo
    {
        return $this->belongsTo(ChatChannel::class, 'chat_channel_uuid', 'uuid');
    }

    /**
     * Retrieves the current chat participant based on the active session user.
     *
     * This static method queries and returns the ChatParticipant instance corresponding
     * to the user currently stored in the session. It uses the 'user_uuid' stored in the
     * session to find the matching participant. If no matching participant is found,
     * or if the session does not have a 'user' set, the method returns null.
     *
     * @param bool $withTrashed include deleted records
     *
     * @return ChatParticipant|null the ChatParticipant instance for the current session user, or null if not found
     */
    public static function current(string $chatChannelId, bool $withTrashed = false): ?ChatParticipant
    {
        $query = static::where(['user_uuid' => session('user'), 'chat_channel_uuid' => $chatChannelId]);
        if ($withTrashed) {
            $query->withTrashed();
        }

        return $query->first();
    }

    /**
     * Get when the participant was last seen.
     */
    public function getLastSeenAtAttribute(): ?Carbon
    {
        return $this->user ? $this->user->lastSeenAt() : null;
    }

    /**
     * Get whether the participant is online or not.
     */
    public function getIsOnlineAttribute(): bool
    {
        return $this->user ? $this->user->isOnline() : false;
    }

    /**
     * Get the chat participant's user name.
     */
    public function getNameAttribute(): ?string
    {
        return $this->user ? $this->user->name : null;
    }
}
