<?php

namespace Fleetbase\FleetOps\Notifications;

use Fleetbase\FleetOps\Events\OrderDispatchFailed as OrderDispatchFailedEvent;
use Fleetbase\FleetOps\Http\Resources\v1\Order as OrderResource;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Support\Utils;
use Illuminate\Broadcasting\Channel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderDispatchFailed extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * The order instance this notification is for.
     *
     * @var \Fleetbase\Models\Order
     */
    public $order;

    /**
     * Reason order dispatch failed.
     *
     * @var string
     */
    public $reason;

    /**
     * Notification name.
     */
    public static string $name = 'Order dispatch Failed';

    /**
     * Notification description.
     */
    public static string $description = 'Notify when an order dispatch has been failed.';

    /**
     * Notification package.
     */
    public static string $package = 'fleet-ops';

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct(Order $order, OrderDispatchFailedEvent $event)
    {
        $this->order  = $order->setRelations([]);
        $this->reason = $event->getReason();
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
     * Get the notification's delivery channels.
     *
     * @return array
     */
    public function via($notifiable)
    {
        return ['mail'];
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
            'title' => 'Order ' . $this->order->public_id . ' has dispatch has failed!',
            'body'  => $this->reason,
            'data'  => [
                'id'    => $this->order->public_id,
                'type'  => 'order_dispatch_failed',
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
        return (new MailMessage())
            ->subject('Order ' . $this->order->public_id . ' has dispatch has failed!')
            ->line($this->reason)
            ->action('View Details', Utils::consoleUrl('', ['shift' => 'fleet-ops/orders/view/' . $this->order->public_id]));
    }
}
