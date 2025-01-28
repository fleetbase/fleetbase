<?php

namespace Fleetbase\FleetOps\Console\Commands;

use Fleetbase\FleetOps\Events\DriverSimulatedLocationChanged;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Support\OSRM;
use Fleetbase\FleetOps\Support\Utils;
use Illuminate\Console\Command;

class SimulateOrderRouteNavigation extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetops:simulate-navigation {order} {driver?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Simulates a driver navigating an order route.';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        ini_set('memory_limit', '-1');
        ini_set('max_execution_time', 0);

        $orderId = $this->argument('order');
        $order   = Order::where('public_id', $orderId)->orWhere('uuid', $orderId)->first();
        if (!$order) {
            return $this->error('Order not found to simulate driving for.');
        }

        // If driver provided
        $driverId = $this->argument('driver');
        if ($driverId) {
            $driver = Driver::where('public_id', $driverId)->orWhere('uuid', $driverId)->first();
            if (!$driver) {
                $this->error('The driver specified was not found, defaulting to driver assigned to order.');
            }
        }

        // Get the order driver
        $order->loadAssignedDriver();
        $driver = $order->driverAssigned;
        if (!$driver) {
            return $this->error('No driver found to simulate the order.');
        }

        // Inform
        $this->info('Preparing to simulate route for order ' . $order->public_id . ' using driver ' . $driver->name . ' (' . $driver->public_id . ')');

        // Get the order Pickup and Dropoff Waypoints
        $pickup  = $order->payload->getPickupOrFirstWaypoint();
        $dropoff = $order->payload->getDropoffOrLastWaypoint();
        $this->info('Order pickup point located at: ' . $pickup->address);
        $this->info('Order dropoff point located at: ' . $dropoff->address);

        // Convert order Pickup/Dropoff Place Waypoint's to Point's
        $start = Utils::getPointFromMixed($pickup);
        $end   = Utils::getPointFromMixed($dropoff);
        $this->info('Found route starting point: ' . (string) $start . ' and route ending point: ' . (string) $end);

        // Send points to OSRM
        $route = OSRM::getRoute($start, $end);
        $this->info('Requesting route from OSRM.');

        // Create simulation events
        if (isset($route['code']) && $route['code'] === 'Ok') {
            // Get the route geometry to decode
            $routeGeometry = data_get($route, 'routes.0.geometry');
            $this->info('Received route geometry from OSRM.');

            // Decode the waypoints if needed
            $waypoints = OSRM::decodePolyline($routeGeometry);
            $this->info('Decoded OSRM route geometry.');

            // Loop through waypoints to calculate the heading for each point
            for ($i = 0; $i < count($waypoints) - 1; $i++) {
                $point1 = $waypoints[$i];
                $point2 = $waypoints[$i + 1];

                $heading = Utils::calculateHeading($point1, $point2);

                // Directly add the 'heading' property to the Point object
                $point1->heading = $heading;
            }

            // Dispatch the event for each waypoint
            foreach ($waypoints as $index => $waypoint) {
                $additionalData = ['index' => $index];
                if (data_get($waypoint, 'heading')) {
                    $additionalData['heading'] = data_get($waypoint, 'heading');
                }

                $this->info('Simulating driver reaching waypoint #' . ($index + 1) . ' at ' . (string) $waypoint);
                event(new DriverSimulatedLocationChanged($driver, $waypoint, $additionalData));
                sleep(3);
            }
        }

        $this->info('Route navigation simulation completed.');

        return Command::SUCCESS;
    }

    /**
     * Prompt for missing input arguments using the returned questions.
     *
     * @return array<string, string>
     */
    protected function promptForMissingArgumentsUsing(): array
    {
        return [
            'order' => 'Which order ID should be used to simulate driving the route for?',
        ];
    }
}
