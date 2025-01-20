<?php

namespace Fleetbase\FleetOps\Providers;

use Fleetbase\Providers\CoreServiceProvider;
use Fleetbase\Support\NotificationRegistry;
use Fleetbase\Support\Utils;

if (!Utils::classExists(CoreServiceProvider::class)) {
    throw new \Exception('FleetOps cannot be loaded without `fleetbase/core-api` installed!');
}

/**
 * NotificationServiceProvider service provider.
 */
class NotificationServiceProvider extends CoreServiceProvider
{
    /**
     * Bootstrap any package services.
     *
     * @return void
     *
     * @throws \Exception if the `fleetbase/core-api` package is not installed
     */
    public function boot()
    {
        // Register Notifications
        NotificationRegistry::register([
            \Fleetbase\FleetOps\Notifications\OrderAssigned::class,
            \Fleetbase\FleetOps\Notifications\OrderCanceled::class,
            \Fleetbase\FleetOps\Notifications\OrderDispatched::class,
            \Fleetbase\FleetOps\Notifications\OrderDispatchFailed::class,
            \Fleetbase\FleetOps\Notifications\OrderPing::class,
        ]);

        // Register Notifiables
        NotificationRegistry::registerNotifiable([
            \Fleetbase\FleetOps\Models\Contact::class,
            \Fleetbase\FleetOps\Models\Driver::class,
            \Fleetbase\FleetOps\Models\Vendor::class,
            \Fleetbase\FleetOps\Models\Fleet::class,
        ]);
    }
}
