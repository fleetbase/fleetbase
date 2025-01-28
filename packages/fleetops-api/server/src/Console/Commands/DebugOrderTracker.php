<?php

namespace Fleetbase\FleetOps\Console\Commands;

use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Support\OrderTracker;
use Illuminate\Console\Command;

class DebugOrderTracker extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetops:debug-order-tracker';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Debug implementation of order tracker.';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $order = Order::where('public_id', 'order_n227274')->first();
        if ($order) {
            $tracker = new OrderTracker($order);
            dd($tracker->getOrderProgressPercentage());
        }

        return Command::SUCCESS;
    }
}
