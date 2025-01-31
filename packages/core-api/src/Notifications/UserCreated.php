<?php

namespace Fleetbase\Notifications;

use Fleetbase\Models\Company;
use Fleetbase\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

/**
 * Class UserCreated.
 */
class UserCreated extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * The user that has been created.
     */
    public ?User $user;

    /**
     * The company the user belongs to.
     */
    public ?Company $company;

    /**
     * The time the notification was sent.
     */
    public ?string $sentAt;

    /**
     * The ID of the notification.
     */
    public ?string $notificationId;

    /**
     * The notification name.
     */
    public static string $name = 'User Created';

    /**
     * The notification description.
     */
    public static string $description = 'Notification when a new user has been added to your organization.';

    /**
     * The notification package.
     */
    public static string $package = 'core';

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct(User $user, Company $company)
    {
        $this->user           = $user;
        $this->company        = $company;
        $this->sentAt         = Carbon::now()->toDateTimeString();
        $this->notificationId = uniqid('notification_');
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array
     */
    public function via($notifiable)
    {
        return ['mail', 'database', 'broadcast'];
    }

    /**
     * Get the mail representation of the notification.
     *
     * @return MailMessage
     */
    public function toMail($notifiable)
    {
        return (new MailMessage())
            ->subject('New User Added to Your Organization')
            ->line('A new user has been added to your organization.')
            ->line('Name: ' . $this->user->name)
            ->line('Email: ' . $this->user->email)
            ->line('Phone: ' . $this->user->phone);
    }

    /**
     * Get the broadcastable representation of the notification.
     *
     * @return BroadcastMessage
     */
    public function toBroadcast($notifiable)
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array
     */
    public function toArray($notifiable)
    {
        return [
            'notification_id' => $this->notificationId,
            'sent_at'         => $this->sentAt,
            'subject'         => 'New User Added to Your Organization',
            'message'         => 'A new user (' . $this->user->name . ') has been added to your organization (' . $this->company->name . ').',
            'id'              => $this->user->uuid,
            'email'           => $this->user->email,
            'phone'           => $this->user->phone,
            'companyId'       => $this->company->uuid,
            'company'         => $this->company->name,
        ];
    }
}
