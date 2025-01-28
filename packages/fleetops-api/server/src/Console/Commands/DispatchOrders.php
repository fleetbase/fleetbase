<?php

namespace Fleetbase\FleetOps\Console\Commands;

use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Support\Utils;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class DispatchOrders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetops:dispatch-orders {--sandbox=false : Whether to use the sandbox database for testing purposes.}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Dispatches scheduled orders.';

    /**
     * Execute the console command.
     *
     * Processes and dispatches orders that are scheduled for today. Orders are
     * filtered based on their dispatch status, scheduled time, and other criteria.
     * The command allows for a sandbox mode for testing.
     */
    public function handle(): void
    {
        // Set UTC as default timezone
        date_default_timezone_set('UTC');

        $sandboxMode = Utils::castBoolean($this->option('sandbox'));
        $this->info('Running in ' . ($sandboxMode ? 'sandbox' : 'production') . ' mode.');

        // Get all scheduled dispatchable orders
        $orders = $this->getScheduledOrders($sandboxMode);

        $this->alert('Found ' . $orders->count() . ' orders scheduled for dispatch. Current Time: ' . Carbon::now()->toDateTimeString());

        // Dispatch each order
        foreach ($orders as $order) {
            if ($order->shouldDispatch()) {
                $order->dispatch();
                $this->info('Order ' . $order->public_id . ' dispatched successfully (' . $order->scheduled_at . ').');
            } else {
                $this->warn('Order ' . $order->public_id . ' is not ready for dispatch (' . $order->scheduled_at . ').');
            }
        }
    }

    /**
     * Fetches scheduled dispatchable orders.
     *
     * Retrieves orders that are scheduled for today and have not yet been dispatched.
     * Filters orders based on dispatch status, order status, and scheduled date.
     *
     * @param bool $sandboxMode whether to use the sandbox database
     *
     * @return \Illuminate\Database\Eloquent\Collection returns a collection of orders that meet the criteria
     */
    protected function getScheduledOrders(bool $sandboxMode): \Illuminate\Database\Eloquent\Collection
    {
        return Order::on($sandboxMode ? 'sandbox' : 'mysql')
            ->withoutGlobalScopes()
            ->where('dispatched', 0)
            ->whereIn('status', ['pending', 'created'])
            ->whereDate('scheduled_at', Carbon::today())
            ->whereNull('deleted_at')
            ->get();
    }
}
