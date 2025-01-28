<?php

namespace Fleetbase\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use NotificationChannels\Apn\ApnChannel;
use NotificationChannels\Apn\ApnMessage;
use NotificationChannels\Fcm\FcmChannel;
use NotificationChannels\Fcm\FcmMessage;
use NotificationChannels\Fcm\Resources\Notification as FcmNotification;

/**
 * Class TestPushNotification.
 *
 * A test push notification class for sending notifications via FCM and APN channels.
 */
class TestPushNotification extends Notification
{
    use Queueable;

    /**
     * The title of the notification.
     */
    public string $title;

    /**
     * The message body of the notification.
     */
    public string $message;

    /**
     * Additional data to be sent with the notification.
     */
    public array $data = [];

    /**
     * TestPushNotification constructor.
     *
     * @param string $title   the title of the notification
     * @param string $message the message body of the notification
     */
    public function __construct(string $title, string $message)
    {
        $this->title   = $title;
        $this->message = $message;
        $this->data    = [
            'id'      => uniqid(),
            'message' => 'Test Push Notification',
            'type'    => 'test',
            'date'    => Carbon::now()->toDateTimeString(),
        ];
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array
     */
    public function via()
    {
        return [FcmChannel::class, ApnChannel::class];
    }

    /**
     * Get the firebase cloud message representation of the notification.
     *
     * @return array
     */
    public function toFcm($notifiable)
    {
        return (new FcmMessage(notification: new FcmNotification(
            title: $this->title,
            body: $this->message,
        )))
        ->data($this->data)
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
            ->title($this->title)
            ->body($this->message);

        foreach ($this->data as $key => $value) {
            $message->custom($key, $value);
        }

        return $message;
    }
}
