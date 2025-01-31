<?php

namespace Fleetbase\Events;

use Fleetbase\Http\Resources\ChatParticipant as ChatParticipantResource;
use Fleetbase\Models\ChatChannel;
use Fleetbase\Models\ChatParticipant;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class ChatParticipantRemoved implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public string $eventId;
    public Carbon $createdAt;
    public ?ChatChannel $chatChannel;
    public ChatParticipant $chatParticipant;

    /**
     * Create a new event instance.
     *
     * @return void
     */
    public function __construct(ChatParticipant $chatParticipant)
    {
        $this->eventId             = uniqid('event_');
        $this->createdAt           = Carbon::now();
        $this->chatChannel         = $chatParticipant->chatChannel;
        $this->chatParticipant     = $chatParticipant->load('user');
    }

    /**
     * The event's broadcast name.
     *
     * @return string
     */
    public function broadcastAs()
    {
        return 'chat.removed_participant';
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return Channel|array
     */
    public function broadcastOn()
    {
        $channels = [
            new Channel('chat.' . $this->chatChannel->uuid),
            new Channel('chat.' . $this->chatChannel->public_id),
            new Channel('user.' . $this->chatParticipant->user_uuid),
        ];

        if ($this->chatParticipant->user) {
            $channels[] = new Channel('user.' . $this->chatParticipant->user->public_id);
        }

        return $channels;
    }

    /**
     * Get the data to broadcast.
     *
     * @return array
     */
    public function broadcastWith()
    {
        $resource = new ChatParticipantResource($this->chatParticipant);

        return [
            'id'          => $this->eventId,
            'event'       => $this->broadcastAs(),
            'created_at'  => $this->createdAt->toDateTimeString(),
            'channel_id'  => $this->chatChannel->public_id,
            'data'        => $resource ? $resource->toArray(request()) : [],
        ];
    }
}
