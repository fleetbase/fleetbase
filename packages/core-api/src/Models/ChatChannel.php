<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Http\Resources\ChatAttachment as ChatAttachmentResource;
use Fleetbase\Http\Resources\ChatLog as ChatLogResource;
use Fleetbase\Http\Resources\ChatMessage as ChatMessageResource;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasMetaAttributes;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Fleetbase\Traits\SendsWebhooks;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Collection;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class ChatChannel extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use HasSlug;
    use HasMetaAttributes;
    use Searchable;
    use SendsWebhooks;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'chat_channels';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'chat';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'company_uuid',
        'created_by_uuid',
        'name',
        'slug',
        'meta',
    ];

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['name'];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['title', 'last_message'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'meta'          => Json::class,
    ];

    /**
     * @var SlugOptions
     */
    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    /** on boot make creator a participant */
    public static function boot()
    {
        parent::boot();
        static::created(function ($model) {
            ChatParticipant::create([
                'company_uuid'      => $model->company_uuid,
                'user_uuid'         => $model->created_by_uuid,
                'chat_channel_uuid' => $model->uuid,
            ]);
        });
    }

    /**
     * @return BelongsTo
     */
    public function company()
    {
        return $this->belongsTo(Company::class, 'company_uuid', 'uuid');
    }

    public function createdBy(): BelongsTo|Builder
    {
        return $this->belongsTo(User::class, 'created_by_uuid', 'uuid')->withTrashed();
    }

    public function lastMessage(): HasOne|Builder
    {
        return $this->hasOne(ChatMessage::class, 'chat_channel_uuid', 'uuid')->latest();
    }

    public function participants(): HasMany|Builder
    {
        return $this->hasMany(ChatParticipant::class, 'chat_channel_uuid', 'uuid')->whereHas('user');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'chat_channel_uuid', 'uuid');
    }

    public function attachments(): HasMany|Builder
    {
        return $this->hasMany(ChatAttachment::class, 'chat_channel_uuid', 'uuid')->whereNull('chat_message_uuid');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(ChatLog::class, 'chat_channel_uuid', 'uuid');
    }

    /**
     * Accessor to get the 'last_message' attribute for the chat.
     *
     * This method retrieves the last message of the chat. It uses the 'lastMessage'
     * relationship, which should be defined to return the latest message in the chat.
     *
     * @return ChatMessage|null the content of the last message in the chat, or null if no messages are available
     */
    public function getLastMessageAttribute(): ?ChatMessage
    {
        return $this->lastMessage()->first();
    }

    /**
     * Accessor to get the 'title' attribute for the chat.
     *
     * This method returns the name of the chat if it's set. If the name is not set, it constructs
     * the title by concatenating the names of the chat's participants, up to a specified limit to avoid performance issues
     * with large numbers of participants. In cases where there are no participant names or the chat name is empty,
     * a default title ('Untitled Chat') is provided.
     *
     * @return string the title of the chat based on its name or its participants' names
     */
    public function getTitleAttribute(): string
    {
        $title = $this->name;
        if (empty($title)) {
            $participants = $this->relationLoaded('participants') ?
            $this->participants :
            $this->participants()->get();

            $participantNames = $participants->map(function ($chatParticipant) {
                return $chatParticipant->name;
            })->filter()->slice(0, 4);

            $title = $participantNames->implode(', ');

            if (empty($title)) {
                $title = 'Untitled Chat';
            }
        }

        return $title;
    }

    /**
     * Retrieves unread messages for a given user within this chat channel.
     *
     * This method finds the chat participant record based on the user's UUID and this chat channel's UUID.
     * If the participant exists, it fetches their unread messages by invoking `getUnreadMessagesForParticipant`.
     * Returns an empty collection if the participant does not exist.
     *
     * @param User $user the user for whom to retrieve unread messages
     *
     * @return Collection a collection of unread messages; may be empty
     */
    public function getUnreadMessagesForUser(User $user): Collection
    {
        $chatParticipant = ChatParticipant::where(['user_uuid' => $user->uuid, 'chat_channel_uuid' => $this->uuid])->first();
        if ($chatParticipant) {
            return $this->getUnreadMessagesForParticipant($chatParticipant);
        }

        return collect();
    }

    /**
     * Retrieves unread messages for a specific chat participant.
     *
     * This method returns messages from this chat channel that do not have a receipt recorded for the given participant,
     * effectively returning messages that the participant has not yet read.
     *
     * @param ChatParticipant $chatParticipant the chat participant whose unread messages are to be retrieved
     *
     * @return Collection a collection of unread messages; may be empty
     */
    public function getUnreadMessagesForParticipant(ChatParticipant $chatParticipant): Collection
    {
        return $this->messages()->where('sender_uuid', '!=', $chatParticipant->uuid)->whereDoesntHave('receipts', function ($query) use ($chatParticipant) {
            $query->where('participant_uuid', $chatParticipant->uuid);
        });
    }

    /**
     * Retrieves the count of unread messages for a given user within this chat channel.
     *
     * This method identifies the chat participant record using the user's UUID and the chat channel's UUID.
     * It then counts the unread messages for that participant by checking messages that lack a receipt for this participant.
     * If the participant is not found in this channel, it returns a count of zero.
     *
     * @param User $user the user for whom to count unread messages
     *
     * @return int the count of unread messages
     */
    public function getUnreadMessageCountForUser(User $user): int
    {
        $chatParticipant = ChatParticipant::where(['user_uuid' => $user->uuid, 'chat_channel_uuid' => $this->uuid])->first();
        if ($chatParticipant) {
            return $this->messages()->where('sender_uuid', '!=', $chatParticipant->uuid)->whereDoesntHave('receipts', function ($query) use ($chatParticipant) {
                $query->where('participant_uuid', $chatParticipant->uuid);
            })->count();
        }

        return 0;
    }

    /**
     * Accessor to get the 'feed' attribute for the chat.
     *
     * This method aggregates and returns a feed of different types of chat-related
     * data, including messages, attachments, and logs, sorted in chronological order.
     * It provides a unified view of the chat channel activity.
     *
     * @return Collection the aggregated feed of chat activities
     */
    public function getFeedAttribute(): Collection
    {
        $messages = $this->messages()->get()->map(function ($message) {
            return ['type' => 'message', 'data' => $message, 'created_at' => $message->created_at];
        });

        $attachments = $this->attachments()->get()->map(function ($attachment) {
            return ['type' => 'attachment', 'data' => $attachment, 'created_at' => $attachment->created_at];
        });

        $logs = $this->logs()->get()->map(function ($log) {
            return ['type' => 'log', 'data' => $log, 'created_at' => $log->created_at];
        });

        $feed = collect([...$messages, ...$attachments, ...$logs])->sortBy('created_at')->values();

        return $feed;
    }

    /**
     * Accessor to get the 'resource_feed' attribute for the chat.
     *
     * This method aggregates messages, attachments, and logs related to the chat,
     * transforms them into their respective HTTP resources, and returns them as a unified feed.
     * Each item in the feed is an array containing the type (message, attachment, log),
     * the corresponding HTTP resource, and the creation timestamp. The feed is sorted in
     * descending order of creation time, ensuring the most recent activities are listed first.
     * This method is particularly useful for generating standardized API responses
     * that encapsulate the diverse activities within a chat channel.
     *
     * @return Collection the aggregated and resource-formatted feed of chat activities
     */
    public function getResourceFeedAttribute(): Collection
    {
        $messages = $this->messages()->get()->map(function ($message) {
            return ['type' => 'message', 'data' => new ChatMessageResource($message), 'created_at' => $message->created_at];
        });

        $attachments = $this->attachments()->get()->map(function ($attachment) {
            return ['type' => 'attachment', 'data' => new ChatAttachmentResource($attachment), 'created_at' => $attachment->created_at];
        });

        $logs = $this->logs()->get()->map(function ($log) {
            return ['type' => 'log', 'data' => new ChatLogResource($log), 'created_at' => $log->created_at];
        });

        $feed = collect([...$messages, ...$attachments, ...$logs])->sortBy('created_at')->values();

        return $feed;
    }
}
