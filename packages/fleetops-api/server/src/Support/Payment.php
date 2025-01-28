<?php

namespace Fleetbase\FleetOps\Support;

use Stripe\StripeClient;

class Payment
{
    /**
     * Get the StripeClient instance.
     */
    public static function getStripeClient(array $options = []): ?StripeClient
    {
        return new StripeClient([
            'api_key' => config('services.stripe.secret'),
            ...$options,
        ]);
    }
}
