<?php

namespace Fleetbase\Events;

use Fleetbase\Support\Utils;
use Illuminate\Broadcasting\Channel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class BroadcastNotificationCreated implements ShouldBroadcastNow
{
    use Queueable;
    use SerializesModels;

    /**
     * The notifiable entity who received the notification.
     */
    public $notifiable;

    /**
     * The notification instance.
     */
    public Notification $notification;

    /**
     * The notification data.
     *
     * @var array
     */
    public $data = [];

    /**
     * Create a new event instance.
     *
     * @return void
     */
    public function __construct($notifiable, Notification $notification, array $data = [])
    {
        $this->data         = $data;
        $this->notifiable   = $notifiable;
        $this->notification = $notification;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array
     */
    public function broadcastOn()
    {
        $broadcastOn         = $this->notification->broadcastOn();
        $notificableChannels = $this->getNotifiableChannels();
        $channels            = array_merge($broadcastOn, $notificableChannels);

        return collect($channels)->all();
    }

    /**
     * Get the broadcast channel name for the event.
     *
     * @return array|string
     */
    protected function getNotifiableChannels()
    {
        $channels = [];

        // get channels from notifiable
        if (method_exists($this->notifiable, 'receivesBroadcastNotificationsOn')) {
            $defaultBroadcastChannel = $this->notifiable->receivesBroadcastNotificationsOn($this->notification);

            if (is_string($defaultBroadcastChannel)) {
                $channels[] = new Channel($defaultBroadcastChannel);
            }

            if (is_array($defaultBroadcastChannel)) {
                $channels[] = array_merge($channels, $defaultBroadcastChannel);
            }
        }

        $modelName   = Str::snake(Utils::classBasename($this->notifiable));
        $channelKeys = ['uuid', 'public_id', $this->notifiable->getKey()];

        foreach ($channelKeys as $key) {
            if (data_get($this->notifiable, $key)) {
                $channels[] = new Channel($modelName . '.' . data_get($this->notifiable, $key));
            }
        }

        return $channels;
    }

    /**
     * Get the data that should be sent with the broadcasted event.
     *
     * @return array
     */
    public function broadcastWith()
    {
        if (method_exists($this->notification, 'broadcastWith')) {
            return $this->notification->broadcastWith();
        }

        return array_merge($this->data, [
            'id'   => $this->notification->id,
            'type' => $this->broadcastType(),
        ]);
    }

    /**
     * Get the type of the notification being broadcast.
     *
     * @return string
     */
    public function broadcastType()
    {
        if (method_exists($this->notification, 'broadcastType')) {
            return $this->notification->broadcastType();
        }

        return get_class($this->notification);
    }
}
