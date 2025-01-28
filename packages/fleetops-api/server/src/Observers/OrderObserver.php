<?php

namespace Fleetbase\FleetOps\Observers;

use Fleetbase\FleetOps\Models\Order;

class OrderObserver
{
    /**
     * Handle the Order "updated" event.
     *
     * @return void
     */
    public function updated(Order $order)
    {
        $order->setDriverLocationAsPickup();

        if ($order->wasChanged('driver_assigned_uuid')) {
            $order->notifyDriverAssigned();
        }
    }

    /**
     * Handle the Order "deleted" event.
     *
     * @return void
     */
    public function deleted(Order $order)
    {
        if ($order->isIntegratedVendorOrder()) {
            $order->facilitator->provider()->callback('onDeleted', $order);
        }
    }
}
