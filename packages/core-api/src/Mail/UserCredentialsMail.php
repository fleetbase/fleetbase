<?php

namespace Fleetbase\Mail;

use Fleetbase\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserCredentialsMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * The plaintext password being sent.
     */
    private string $plaintextPassword;

    /**
     * The user record the password belongs to.
     */
    private User $user;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(string $plaintextPassword, User $user)
    {
        $this->plaintextPassword = $plaintextPassword;
        $this->user              = $user;
    }

    /**
     * Get the message content definition.
     */
    public function envelope(): Envelope
    {
        $this->user->loadMissing('company');

        return new Envelope(
            subject: 'Your login credentials for ' . $this->user->company_name . ' on ' . config('app.name'),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'fleetbase::mail.user-credentials',
            with: [
                'user'              => $this->user,
                'plaintextPassword' => $this->plaintextPassword,
                'currentHour'       => now()->hour,
            ]
        );
    }
}
