<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Support\Utils;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\SendsWebhooks;

class ChatLog extends Model
{
    use HasUuid;
    use HasPublicId;
    use SendsWebhooks;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'chat_logs';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'chat_log';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'company_uuid',
        'chat_channel_uuid',
        'initiator_uuid',
        'event_type',
        'content',
        'subjects',
        'meta',
        'status',
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['resolved_content'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'subjects' => Json::class,
        'meta'     => Json::class,
    ];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function company()
    {
        return $this->belongsTo(Company::class, 'company_uuid', 'uuid');
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
    public function initiator()
    {
        return $this->belongsTo(ChatParticipant::class, 'initiator_uuid', 'uuid');
    }

    /**
     * Resolves subjects into their corresponding model instances.
     *
     * This method processes an array of subjects, each formatted as 'type:identifier',
     * and converts them into their respective model instances. It uses the `Utils::getMutationType`
     * method to determine the model class based on the subject's type and then queries the
     * model by its UUID.
     *
     * @return array An array of resolved model instances. Unresolvable subjects are skipped.
     */
    public function resolveSubjects(): array
    {
        $subjects         = data_get($this, 'subjects', []);
        $resolvedSubjects = [];
        foreach ($subjects as $subject) {
            if (strpos($subject, ':') === false) {
                continue;
            }

            $segments      = explode(':', $subject);
            $type          = $segments[0];
            $id            = $segments[1];
            $typeClass     = Utils::getMutationType($type);
            $modelInstance = app($typeClass)->where('uuid', $id)->first();
            if ($modelInstance) {
                $resolvedSubjects[] = $modelInstance;
            }
        }

        return $resolvedSubjects;
    }

    /**
     * Retrieves the log content with placeholders replaced by subject properties.
     *
     * This method takes the log content, which may contain placeholders in the format
     * '{subject.X.property}', where 'X' is the subject's index in the resolved subjects
     * array and 'property' is the property name of the subject's model. It replaces each
     * placeholder with the corresponding property value from the resolved subject.
     * If a subject or property is not found, the placeholder remains unchanged.
     *
     * @return string the log content with placeholders replaced by actual subject property values
     */
    public function getContent(): string
    {
        $content  = $this->content;
        $subjects = $this->resolveSubjects();

        return preg_replace_callback('/\{subject\.(\d+)\.(\w+)\}/', function ($matches) use ($subjects) {
            $index    = $matches[1];
            $variable = $matches[2];

            // Check if the subject at the specified index exists and has the property
            if (isset($subjects[$index]) && isset($subjects[$index]->{$variable})) {
                return $subjects[$index]->{$variable};
            }

            // If subject or variable not found, return the original placeholder
            return $matches[0];
        }, $content);
    }

    /**
     * Get's the resolved content.
     */
    public function getResolvedContentAttribute(): string
    {
        return $this->getContent();
    }

    /**
     * Creates a chat log entry when a participant is removed from a chat.
     *
     * This static method logs the event of a participant being removed from a chat.
     * It records the details of the initiator (the user who removed another participant)
     * and the participant who was removed.
     *
     * @param ChatParticipant $initiator          the participant who initiated the removal
     * @param ChatParticipant $removedParticipant the participant who was removed
     *
     * @return \Illuminate\Database\Eloquent\Model the chat log entry that was created
     */
    public static function participantRemoved(ChatParticipant $initiator, ChatParticipant $removedParticipant)
    {
        $content  = '{subject.0.name} has removed {subject.1.name} from this chat.';
        $subjects = ['user:' . $initiator->user_uuid, 'user:' . $removedParticipant->user_uuid];
        $type     = 'removed_participant';

        // If initiator removing themself
        $initiatorIsRemovingSelf = $initiator->uuid === $removedParticipant->uuid;
        if ($initiatorIsRemovingSelf) {
            $content  = '{subject.0.name} has left the chat.';
            $subjects = ['user:' . $initiator->user_uuid];
        }

        return static::create([
            'company_uuid'      => $initiator->company_uuid,
            'initiator_uuid'    => $initiator->uuid,
            'chat_channel_uuid' => $initiator->chat_channel_uuid,
            'event_type'        => $type,
            'content'           => $content,
            'subjects'          => $subjects,
            'status'            => 'complete',
        ]);
    }

    /**
     * Creates a chat log entry when a participant is added to a chat.
     *
     * This static method logs the event of a participant being added to a chat.
     * It includes details of the initiator (the user who added the participant)
     * and the participant who was added.
     *
     * @param ChatParticipant $initiator        the participant who initiated the addition
     * @param ChatParticipant $addedParticipant the participant who was added
     *
     * @return \Illuminate\Database\Eloquent\Model the chat log entry that was created
     */
    public static function participantAdded(ChatParticipant $initiator, ChatParticipant $addedParticipant)
    {
        $content  = '{subject.0.name} has added {subject.1.name} to this chat.';
        $subjects = ['user:' . $initiator->user_uuid, 'user:' . $addedParticipant->user_uuid];
        $type     = 'added_participant';

        // If intiator is the added and the creator of the chat channel the log message should be created chat
        $initiatorIsParticipant = $initiator->uuid === $addedParticipant->uuid;
        if ($initiatorIsParticipant) {
            $chatChannel = ChatChannel::where('uuid', $initiator->chat_channel_uuid)->first();
            if ($chatChannel) {
                $content  = '{subject.0.name} has created a new chat.';
                $subjects = ['user:' . $initiator->user_uuid];
                $type     = 'created_chat';
            }
        }

        return static::create([
            'company_uuid'      => $initiator->company_uuid,
            'initiator_uuid'    => $initiator->uuid,
            'chat_channel_uuid' => $initiator->chat_channel_uuid,
            'event_type'        => $type,
            'content'           => $content,
            'subjects'          => $subjects,
            'status'            => 'complete',
        ]);
    }

    /**
     * Creates a chat log entry when a message is deleted.
     *
     * This static method logs the event of a message being deleted from a chat.
     * It records the details of the initiator who deleted the message and the
     * unique identifier of the deleted message.
     *
     * @param ChatParticipant $initiator the participant who deleted the message
     * @param mixed           $messageId the unique identifier of the message that was deleted
     *
     * @return \Illuminate\Database\Eloquent\Model the chat log entry that was created
     */
    public static function messageDeleted(ChatParticipant $initiator, $messageId)
    {
        $content  = '{subject.0.name} has deleted a message.';
        $subjects = ['user:' . $initiator->user_uuid, 'message:' . $messageId];

        return static::create([
            'company_uuid'      => $initiator->company_uuid,
            'initiator_uuid'    => $initiator->uuid,
            'chat_channel_uuid' => $initiator->chat_channel_uuid,
            'event_type'        => 'deleted_message',
            'content'           => $content,
            'subjects'          => $subjects,
            'status'            => 'complete',
        ]);
    }

    /**
     * Creates a chat log entry when a chat is started.
     *
     * This static method logs the event of a new chat being started.
     * It records the details of the participant who initiated the chat.
     *
     * @param ChatParticipant $initiator the participant who started the chat
     *
     * @return \Illuminate\Database\Eloquent\Model the chat log entry that was created
     */
    public static function chatStarted(ChatParticipant $initiator)
    {
        $content  = '{subject.0.name} has started this chat.';
        $subjects = ['user:' . $initiator->user_uuid];

        return static::create([
            'company_uuid'      => $initiator->company_uuid,
            'initiator_uuid'    => $initiator->uuid,
            'chat_channel_uuid' => $initiator->chat_channel_uuid,
            'event_type'        => 'started_chat',
            'content'           => $content,
            'subjects'          => $subjects,
            'status'            => 'complete',
        ]);
    }

    /**
     * Creates a chat log entry when a chat is ended.
     *
     * This static method logs the event of a chat being ended.
     * It records the details of the participant who ended the chat.
     *
     * @param ChatParticipant $initiator the participant who ended the chat
     *
     * @return \Illuminate\Database\Eloquent\Model the chat log entry that was created
     */
    public static function chatEnded(ChatParticipant $initiator)
    {
        $content  = '{subject.0.name} has ended this chat.';
        $subjects = ['user:' . $initiator->user_uuid];

        return static::create([
            'company_uuid'      => $initiator->company_uuid,
            'initiator_uuid'    => $initiator->uuid,
            'chat_channel_uuid' => $initiator->chat_channel_uuid,
            'event_type'        => 'ended_chat',
            'content'           => $content,
            'subjects'          => $subjects,
            'status'            => 'complete',
        ]);
    }
}
