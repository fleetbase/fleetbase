<?php

namespace Fleetbase\FleetOps\Listeners;

use Fleetbase\Events\UserRemovedFromCompany;
use Fleetbase\FleetOps\Models\Driver;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class HandleUserRemovedFromCompany implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     *
     * @param object $event
     *
     * @return void
     */
    public function handle(UserRemovedFromCompany $event)
    {
        // If user has driver record assosciated to the company, remove it
        Driver::where(
            [
                'company_uuid' => $event->company->uuid,
                'user_uuid'    => $event->user->uuid,
            ]
        )->delete();
    }
}
