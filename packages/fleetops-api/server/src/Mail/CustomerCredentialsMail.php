<?php

namespace Fleetbase\FleetOps\Mail;

use Fleetbase\FleetOps\Models\Contact;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CustomerCredentialsMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * The plaintext password being sent.
     */
    private string $plaintextPassword;

    /**
     * The customer record the password belongs to.
     */
    private Contact $customer;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(string $plaintextPassword, Contact $customer)
    {
        $this->plaintextPassword = $plaintextPassword;
        $this->customer          = $customer;
    }

    /**
     * Get the message content definition.
     */
    public function envelope(): Envelope
    {
        $this->customer->loadMissing('company');

        return new Envelope(
            subject: 'Your login credentials for ' . $this->customer->company->name . ' on ' . config('app.name'),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $user = $this->customer->getUser();
        $this->customer->setRelation('user', $user);

        return new Content(
            markdown: 'fleetops::mail.customer-credentials',
            with: [
                'customer'          => $this->customer,
                'plaintextPassword' => $this->plaintextPassword,
                'customerPortalUrl' => $this->getCustomerPortalAccessUrl(),
                'currentHour'       => now()->hour,
            ]
        );
    }

    /**
     * Get the customer portal URL if available.
     */
    private function getCustomerPortalAccessUrl(): ?string
    {
        $customerPortalConfig = Setting::lookupFromCompany('customer-portal-config');
        $accessUrlSlug        = data_get($customerPortalConfig, 'accessUrlSlug');

        return $accessUrlSlug ? Utils::consoleUrl($accessUrlSlug) : null;
    }
}
