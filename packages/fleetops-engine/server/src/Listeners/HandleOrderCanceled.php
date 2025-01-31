<?php

namespace Fleetbase\FleetOps\Listeners;

use Fleetbase\FleetOps\Events\OrderCanceled;
use Fleetbase\FleetOps\Flow\Activity;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Notifications\OrderCanceled as OrderCanceledNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class HandleOrderCanceled implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     *
     * @param object $event
     *
     * @return void
     */
    public function handle(OrderCanceled $event)
    {
        /** @var \Fleetbase\FleetOps\Models\Order $order */
        $order    = $event->getModelRecord();
        $location = $order->getLastLocation();

        // Create order cancel activity
        $activity = $order->config()->getCanceledActivity();

        // Update order activity
        $order->setStatus($activity->status);
        $order->createActivity($activity, $location);

        if ($order->isIntegratedVendorOrder()) {
            $order->facilitator->provider()->callback('onCanceled', $order);
        }

        // Notify driver assigned order was canceled
        if ($order->hasDriverAssigned) {
            /** @var \Fleetbase\Models\Driver */
            $driver = Driver::where('uuid', $order->driver_assigned_uuid)->withoutGlobalScopes()->first();

            if ($driver) {
                $driver->notify(new OrderCanceledNotification($order));
            }
        }
    }
}
