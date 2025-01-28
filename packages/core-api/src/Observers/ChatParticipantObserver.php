<?php

namespace Fleetbase\Observers;

use Fleetbase\Events\ChatParticipantAdded;
use Fleetbase\Events\ChatParticipantRemoved;
use Fleetbase\Models\ChatLog;
use Fleetbase\Models\ChatParticipant;

class ChatParticipantObserver
{
    /**
     * Handle the ChatParticipant "created" event.
     *
     * @return void
     */
    public function created(ChatParticipant $chatParticipant)
    {
        event(new ChatParticipantAdded($chatParticipant));
        ChatLog::participantAdded(ChatParticipant::current($chatParticipant->chat_channel_uuid), $chatParticipant);
    }

    /**
     * Handle the ChatParticipant "deleted" event.
     *
     * @return void
     */
    public function deleted(ChatParticipant $chatParticipant)
    {
        event(new ChatParticipantRemoved($chatParticipant));
        $currentParticipant = ChatParticipant::current($chatParticipant->chat_channel_uuid, true);
        // hotfix for leaving chat
        if (session('user') === $chatParticipant->user_uuid) {
            $currentParticipant = $chatParticipant;
        }
        ChatLog::participantRemoved($currentParticipant, $chatParticipant);
    }
}
