<?php

namespace Fleetbase\FleetOps\Notifications;

use Fleetbase\FleetOps\Http\Resources\v1\Order as OrderResource;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Support\Utils;
use Illuminate\Broadcasting\Channel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Apn\ApnChannel;
use NotificationChannels\Apn\ApnMessage;
use NotificationChannels\Fcm\FcmChannel;
use NotificationChannels\Fcm\FcmMessage;
use NotificationChannels\Fcm\Resources\Notification as FcmNotification;

class OrderCanceled extends Notification implements ShouldQueue
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
    public static string $name = 'Order Canceled';

    /**
     * Notification description.
     */
    public static string $description = 'Notify when an order has been canceled.';

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
            'title' => 'Order ' . $this->order->public_id . ' was canceled',
            'body'  => 'Order ' . $this->order->public_id . ' has been canceled.',
            'data'  => [
                'id'    => $this->order->public_id,
                'type'  => 'order_canceled',
                'order' => $order->toWebhookPayload(),
            ],
        ];
    }

    /**
     * Get the mail representation of the notification.
     *
     * @return MailMessage
     */
    public function toMail($notifiable)
    {
        $message = (new MailMessage())
            ->subject('Order ' . $this->order->public_id . ' was canceled')
            ->line('Order ' . $this->order->public_id . ' has been canceled.')
            ->line('No further action is necessary.');

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
            title: 'Order ' . $this->order->public_id . ' was canceled',
            body: 'No further action is necessary.',
        )))
        ->data(['id' => $this->order->public_id, 'type' => 'order_canceled'])
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
            ->title('Order ' . $this->order->public_id . ' was canceled')
            ->body('No further action is necessary.')
            ->custom('type', 'order_canceled')
            ->custom('id', $this->order->public_id)
            ->action('view_order', ['id' => $this->order->public_id]);

        return $message;
    }
}
