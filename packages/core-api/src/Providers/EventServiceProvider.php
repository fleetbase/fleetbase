<?php

namespace Fleetbase\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event listener mappings for the application.
     *
     * @var array
     */
    protected $listen = [
        /*
         * Fleetbase Events
         */
        \Fleetbase\Events\ResourceLifecycleEvent::class => [\Fleetbase\Listeners\SendResourceLifecycleWebhook::class],
        \Fleetbase\Events\AccountCreated::class         => [\Fleetbase\Listeners\HandleAccountCreated::class],

        /*
         * Framework Events
         */
        \Illuminate\Notifications\Events\BroadcastNotificationCreated::class => [\Fleetbase\Listeners\TriggerPublicNotificationBroadcast::class],

        /*
         * Webhook Events
         */
        \Fleetbase\Webhook\Events\WebhookCallSucceededEvent::class   => [\Fleetbase\Listeners\LogSuccessfulWebhook::class],
        \Fleetbase\Webhook\Events\WebhookCallFailedEvent::class      => [\Fleetbase\Listeners\LogFailedWebhook::class],
        \Fleetbase\Webhook\Events\FinalWebhookCallFailedEvent::class => [\Fleetbase\Listeners\LogFinalWebhookAttempt::class],
    ];
}
