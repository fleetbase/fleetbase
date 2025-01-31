<?php

namespace Fleetbase\FleetOps\Events;

use Fleetbase\Events\ResourceLifecycleEvent;

class OrderDriverAssigned extends ResourceLifecycleEvent
{
    /**
     * The event name.
     *
     * @var string
     */
    public $eventName = 'driver_assigned';
}
