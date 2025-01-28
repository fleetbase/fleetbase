<?php

namespace Fleetbase\FleetOps\Observers;

use Fleetbase\FleetOps\Models\Fleet;

class FleetObserver
{
    /**
     * Handle the Driver "deleted" event.
     *
     * @return void
     */
    public function deleted(Fleet $fleet)
    {
        // If the fleet being deleted is set as parent fleet, remove it as the parent fleet
        $subFleets = Fleet::where(['parent_fleet_uuid' => $fleet->uuid])->update(['parent_fleet_uuid' => null]);
    }
}
