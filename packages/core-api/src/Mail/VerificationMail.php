<?php

namespace Fleetbase\Mail;

use Fleetbase\Models\VerificationCode;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
// use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\SerializesModels;

class VerificationMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * The verification code to email.
     */
    private VerificationCode $verificationCode;

    /**
     * Custom content to render if supplied.
     */
    private ?string $content;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(VerificationCode $verificationCode, ?string $content = null)
    {
        $this->verificationCode = $verificationCode;
        $this->content          = $content;
    }

    /**
     * Get the message content definition.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->verificationCode->code . ' is your ' . config('app.name') . ' verification code',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'fleetbase::mail.verification',
            with: [
                'appName'     => config('app.name'),
                'currentHour' => now()->hour,
                'user'        => $this->verificationCode->subject,
                'code'        => $this->verificationCode->code,
                'type'        => $this->verificationCode->for,
                'content'     => $this->content,
            ]
        );
    }
}
