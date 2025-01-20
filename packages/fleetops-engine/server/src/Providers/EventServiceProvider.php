<?php

namespace Fleetbase\FleetOps\Providers;

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
         * Order Events
         */
        \Fleetbase\FleetOps\Events\OrderCanceled::class       => [\Fleetbase\FleetOps\Listeners\HandleOrderCanceled::class, \Fleetbase\Listeners\SendResourceLifecycleWebhook::class],
        \Fleetbase\FleetOps\Events\OrderDispatched::class     => [\Fleetbase\FleetOps\Listeners\HandleOrderDispatched::class, \Fleetbase\Listeners\SendResourceLifecycleWebhook::class],
        \Fleetbase\FleetOps\Events\OrderDispatchFailed::class => [\Fleetbase\FleetOps\Listeners\HandleOrderDispatchFailed::class, \Fleetbase\Listeners\SendResourceLifecycleWebhook::class],
        \Fleetbase\FleetOps\Events\OrderDriverAssigned::class => [\Fleetbase\FleetOps\Listeners\HandleOrderDriverAssigned::class, \Fleetbase\Listeners\SendResourceLifecycleWebhook::class],
        \Fleetbase\FleetOps\Events\OrderCompleted::class      => [\Fleetbase\Listeners\SendResourceLifecycleWebhook::class],
        \Fleetbase\FleetOps\Events\OrderReady::class          => [\Fleetbase\FleetOps\Listeners\HandleOrderReady::class],

        /*
         * Core Events
         */
        \Fleetbase\Events\UserRemovedFromCompany::class => [\Fleetbase\FleetOps\Listeners\HandleUserRemovedFromCompany::class],
    ];
}
