<?php

namespace Fleetbase\Traits;

use Fleetbase\Observers\WebhookEventsObserver;

trait SendsWebhooks
{
    /**
     * Boot the public id trait for the model.
     *
     * @return void
     */
    public static function bootSendsWebhooks()
    {
        static::observe(new WebhookEventsObserver());
    }
}
