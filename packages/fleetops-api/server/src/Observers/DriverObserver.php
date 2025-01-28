<?php

namespace Fleetbase\FleetOps\Observers;

use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\Models\User;

class DriverObserver
{
    /**
     * Handle the Driver "creating" event.
     *
     * @return void
     */
    public function creating(Driver $driver)
    {
        // if the driver has no default location set one
        if (empty($driver->location)) {
            $driver->location = new Point(0, 0);
        }
    }

    /**
     * Handle the Driver "deleting" event.
     *
     * @return void
     */
    public function deleting(Driver $driver)
    {
        // Unassign the vehicle from the driver
        $driver->vehicle_uuid = null;
    }

    /**
     * Handle the Driver "deleted" event.
     *
     * @return void
     */
    public function deleted(Driver $driver)
    {
        // Unassign them from any order they are assigned to
        Order::where(['driver_assigned_uuid' => $driver->uuid])->update(['driver_assigned_uuid' => null]);

        // If the driver had a user account with the role driver and type user delete it
        $user = User::where(['uuid' => $driver->user_uuid, 'type' => 'user'])->first();
        if ($user && $user->hasRole('Driver')) {
            $user->delete();
        }
    }
}
