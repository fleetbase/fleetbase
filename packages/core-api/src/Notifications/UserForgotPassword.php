<?php

namespace Fleetbase\Notifications;

use Fleetbase\Models\VerificationCode;
use Fleetbase\Support\Utils;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserForgotPassword extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Instance of the verification code for the password reset.
     */
    public ?VerificationCode $verificationCode;

    /**
     * The URL where the user can reset their password.
     */
    public string $url;

    /**
     * Create a new notification instance.
     *
     * @return void
     */
    public function __construct(?VerificationCode $verificationCode)
    {
        $this->verificationCode = $verificationCode;
        $this->url              = Utils::consoleUrl('auth/reset-password/' . $verificationCode->uuid, ['code' => $verificationCode->code]);
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
     * Get the mail representation of the notification.
     *
     * @return MailMessage
     */
    public function toMail($notifiable)
    {
        return (new MailMessage())
            ->subject('Your password reset link for ' . config('app.name'))
            ->greeting('Hello, ' . $notifiable->name)
            ->line('Looks like you (or someone phishy) has requested to reset your password. If you did not request a password reset link, ignore this email. If you have indeed forgot your password click the button below to reset your password using the code provided below.')
            ->line('Your password reset code:  ' . $this->verificationCode->code)
            ->action('Reset Password', $this->url);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array
     */
    public function toArray($notifiable)
    {
        return [
            'code' => $this->verificationCode->code,
        ];
    }
}
