<?php

namespace Fleetbase\FleetOps\Observers;

use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\Models\User;

class UserObserver
{
    /**
     * Handle the User "deleted" event.
     *
     * @return void
     */
    public function deleted(User $user)
    {
        // if the user deleted is a driver, delete their driver record to
        Driver::where('user_uuid', $user->uuid)->delete();
    }
}
