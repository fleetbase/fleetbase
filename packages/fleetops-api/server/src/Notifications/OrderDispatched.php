<?php

namespace Fleetbase\FleetOps\Notifications;

use Fleetbase\Events\ResourceLifecycleEvent;
use Fleetbase\FleetOps\Http\Resources\v1\Order as OrderResource;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Support\Utils;
use Illuminate\Broadcasting\Channel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Apn\ApnChannel;
use NotificationChannels\Apn\ApnMessage;
use NotificationChannels\Fcm\FcmChannel;
use NotificationChannels\Fcm\FcmMessage;
use NotificationChannels\Fcm\Resources\Notification as FcmNotification;

class OrderDispatched extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * The order instance this notification is for.
     *
     * @var \Fleetbase\Models\Order
     */
    public $order;

    /**
     * Notification name.
     */
    public static string $name = 'Order Dispatched';

    /**
     * Notification description.
     */
    public static string $description = 'Notify when an order has been dispatched.';

    /**
     * Notification package.
     */
    public static string $package = 'fleet-ops';

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct(Order $order)
    {
        $this->order = $order->setRelations([]);
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array
     */
    public function via($notifiable)
    {
        return ['broadcast', 'mail', FcmChannel::class, ApnChannel::class];
    }

    /**
     * Get the type of the notification being broadcast.
     *
     * @return string
     */
    public function broadcastType()
    {
        return 'order.dispatched';
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return Channel|array
     */
    public function broadcastOn()
    {
        return [
            new Channel('company.' . session('company', data_get($this->order, 'company.uuid'))),
            new Channel('company.' . data_get($this->order, 'company.public_id')),
            new Channel('api.' . session('api_credential')),
            new Channel('order.' . $this->order->uuid),
            new Channel('order.' . $this->order->public_id),
            new Channel('driver.' . data_get($this->order, 'driverAssigned.uuid')),
            new Channel('driver.' . data_get($this->order, 'driverAssigned.public_id')),
        ];
    }

    /**
     * Get notification as array.
     *
     * @return void
     */
    public function toArray()
    {
        $order = new OrderResource($this->order);

        return [
            'title' => 'Order ' . $this->order->public_id . ' has been dispatched!',
            'body'  => 'An order has just been dispatched to you and is ready to be started.',
            'data'  => [
                'id'    => $this->order->public_id,
                'type'  => 'order_dispatched',
                'order' => $order->toWebhookPayload(),
            ],
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     *
     * @return BroadcastMessage
     */
    public function toBroadcast($notifiable)
    {
        $model        = $this->order;
        $resource     = new OrderResource($model);
        $resourceData = [];

        if ($resource) {
            if (method_exists($resource, 'toWebhookPayload')) {
                $resourceData = $resource->toWebhookPayload();
            } elseif (method_exists($resource, 'toArray')) {
                $resourceData = $resource->toArray(request());
            }
        }

        $resourceData = ResourceLifecycleEvent::transformResourceChildrenToId($resourceData);

        $data = [
            'id'          => uniqid('event_'),
            'api_version' => config('api.version'),
            'event'       => 'order.dispatched',
            'created_at'  => now()->toDateTimeString(),
            'data'        => $resourceData,
        ];

        return new BroadcastMessage($data);
    }

    /**
     * Get the mail representation of the notification.
     *
     * @return MailMessage
     */
    public function toMail($notifiable)
    {
        $message = (new MailMessage())
            ->subject('Order ' . $this->order->public_id . ' has been dispatched!')
            ->line('An order has just been dispatched to you and is ready to be started.');

        $message->action('View Details', Utils::consoleUrl('', ['shift' => 'fleet-ops/orders/view/' . $this->order->public_id]));

        return $message;
    }

    /**
     * Get the firebase cloud message representation of the notification.
     *
     * @return array
     */
    public function toFcm($notifiable)
    {
        return (new FcmMessage(notification: new FcmNotification(
            title: 'Order ' . $this->order->public_id . ' has been dispatched!',
            body: 'An order has just been dispatched to you and is ready to be started.',
        )))
        ->data(['id' => $this->order->public_id, 'type' => 'order_dispatched'])
        ->custom([
            'android' => [
                'notification' => [
                    'color' => '#4391EA',
                ],
                'fcm_options' => [
                    'analytics_label' => 'analytics',
                ],
            ],
            'apns' => [
                'fcm_options' => [
                    'analytics_label' => 'analytics',
                ],
            ],
        ]);
    }

    /**
     * Get the apns message representation of the notification.
     *
     * @return array
     */
    public function toApn($notifiable)
    {
        $message = ApnMessage::create()
            ->badge(1)
            ->title('Order ' . $this->order->public_id . ' has been dispatched!')
            ->body('An order has just been dispatched to you and is ready to be started..')
            ->custom('type', 'order_dispatched')
            ->custom('id', $this->order->public_id)
            ->action('view_order', ['id' => $this->order->public_id]);

        return $message;
    }
}
