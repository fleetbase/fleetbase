<?php

namespace Fleetbase\FleetOps\Events;

use Fleetbase\Events\ResourceLifecycleEvent;

class OrderCompleted extends ResourceLifecycleEvent
{
    /**
     * The event name.
     *
     * @var string
     */
    public $eventName = 'completed';
}
