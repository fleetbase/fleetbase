<?php

namespace Fleetbase\FleetOps\Jobs;

use Fleetbase\FleetOps\Events\DriverSimulatedLocationChanged;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Class SimulateWaypointReached
 * Simulates the reaching of a waypoint for a given driver by dispatching an event.
 */
class SimulateWaypointReached implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * @var Driver the driver for whom the waypoint is being simulated
     */
    public Driver $driver;

    /**
     * @var Point the waypoint that the driver is simulated to have reached
     */
    public Point $waypoint;

    /**
     * @var array additional data
     */
    public array $additionalData = [];

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 60 * 15;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 20;

    /**
     * Create a new job instance.
     *
     * @param Driver $driver   the driver for whom the waypoint is being simulated
     * @param mixed  $waypoint the waypoint that the driver is simulated to have reached
     */
    public function __construct(Driver $driver, Point $waypoint, array $additionalData = [])
    {
        $this->driver         = $driver;
        $this->waypoint       = $waypoint;
        $this->additionalData = $additionalData;
    }

    /**
     * Execute the job.
     * Dispatches an event to notify that the driver has reached the simulated waypoint.
     */
    public function handle(): void
    {
        if (data_get($this->waypoint, 'heading')) {
            $this->additionalData['heading'] = data_get($this->waypoint, 'heading');
        }

        event(new DriverSimulatedLocationChanged($this->driver, $this->waypoint, $this->additionalData));
    }
}
