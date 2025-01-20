<?php

namespace Fleetbase\FleetOps\Console\Commands;

use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class DispatchAdhocOrders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetops:dispatch-adhoc {--sandbox} {--testing}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Dispatch & ping adhoc orders where no driver is assigned, only if order isn\'t assigned after 2 minutes';

    /**
     * Execute the console command.
     *
     * Processes and dispatches ad-hoc orders based on their scheduled dispatch time and driver availability.
     * Orders without an assigned driver and that have surpassed the dispatch time threshold are considered for dispatch.
     * The command supports sandbox and testing modes for different operational environments.
     */
    public function handle(): void
    {
        date_default_timezone_set('UTC');

        $sandboxMode = Utils::castBoolean($this->option('sandbox'));
        $this->info('Running in ' . ($sandboxMode ? 'sandbox' : 'production') . ' mode.');

        $orders = $this->getDispatchableOrders();

        $this->alert($orders->count() . ' orders found for ad-hoc dispatch. Current Time: ' . Carbon::now()->toDateTimeString());

        foreach ($orders as $order) {
            $pickup   = $order->getPickupLocation();
            $distance = $order->getAdhocPingDistance();

            if (!Utils::isPoint($pickup)) {
                $this->error('Invalid pickup location for order ' . $order->public_id);
                continue;
            }

            $drivers = $this->getNearbyDriversForOrder($order, $pickup, $distance);

            $this->line('Checking order ' . $order->public_id . ' for nearby drivers within ' . $distance . ' meters.');

            if ($drivers->count()) {
                $order->dispatch(true);
                $this->info('Order ' . $order->public_id . ' dispatched successfully to ' . $drivers->count() . ' nearby drivers.');
                foreach ($drivers as $driver) {
                    $this->info('Pinging driver ' . $driver->name . ' (' . $driver->public_id . ') ...');
                }
            } else {
                $this->warn('No available drivers found for order ' . $order->public_id);
            }
        }
    }

    /**
     * Fetches ad-hoc dispatchable orders based on certain criteria.
     *
     * Retrieves orders that are marked as ad-hoc and have not been dispatched yet. The orders
     * are filtered by their scheduled dispatch time, order status, and whether a driver has been
     * assigned to them. The method also applies filters based on sandbox mode.
     *
     * @return Collection returns a collection of orders that meet the criteria
     */
    public function getDispatchableOrders(): Collection
    {
        $sandbox  = Utils::castBoolean($this->option('sandbox'));
        $interval = 4;

        return Order::on($sandbox ? 'sandbox' : 'mysql')
            ->withoutGlobalScopes()
            ->where(['adhoc' => 1, 'dispatched' => 1, 'started' => 0])
            ->whereDate('dispatched_at', '<=', Carbon::now()->subMinutes($interval)->toDateTimeString())
            ->whereNull('driver_assigned_uuid')
            ->whereNull('deleted_at')
            ->where('status', '!=', 'canceled')
            ->whereHas('company', function ($q) {
                $q->whereHas('users', function ($q) {
                    $q->whereHas('driver', function ($q) {
                        $q->where(['status' => 'active', 'online' => 1]);
                        $q->whereNull('deleted_at');
                    });
                });
            })
            ->whereHas('payload')
            ->with(['company', 'payload'])
            ->get();
    }

    /**
     * Fetches nearby drivers for a given order based on the pickup location and distance.
     *
     * Retrieves drivers who are within a specified distance from the pickup location of the order.
     * The method supports a testing mode to simulate driver availability.
     *
     * @param Order $order    the order for which drivers are being sought
     * @param Point $pickup   the geographic point representing the pickup location
     * @param int   $distance the maximum distance (in meters) within which drivers should be located
     *
     * @return Collection returns a collection of nearby drivers
     */
    public function getNearbyDriversForOrder(Order $order, Point $pickup, int $distance): Collection
    {
        $testing = Utils::castBoolean($this->option('testing'));

        if ($testing) {
            // one for testing when cannoty be geospatially accurate
            $drivers = Driver::where(['status' => 'active', 'online' => 1])
                ->where(function ($q) use ($order) {
                    $q->where('company_uuid', $order->company_uuid);
                    $q->orWhereHas('user', function ($q) use ($order) {
                        $q->where('company_uuid', $order->company_uuid);
                    });
                })
                ->whereNull('deleted_at')
                ->withoutGlobalScopes()
                ->get();
        } else {
            $drivers = Driver::where(['status' => 'active', 'online' => 1])
                ->where(function ($q) use ($order) {
                    $q->where('company_uuid', $order->company_uuid);
                    $q->orWhereHas('user', function ($q) use ($order) {
                        $q->where('company_uuid', $order->company_uuid);
                    });
                })
                ->whereNull('deleted_at')
                ->distanceSphere('location', $pickup, $distance)
                ->distanceSphereValue('location', $pickup)
                ->withoutGlobalScopes()
                ->get();
        }

        return $drivers;
    }
}
