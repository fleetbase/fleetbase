<?php

namespace Fleetbase\FleetOps\Support;

use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Models\Payload;
use Fleetbase\FleetOps\Models\Place;
use Fleetbase\FleetOps\Models\Waypoint;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Class OrderTracker.
 *
 * Provides functionality to track an order's progress, calculate ETA, and retrieve various order-related data.
 */
class OrderTracker
{
    /** @var Order The order being tracked */
    protected Order $order;

    /** @var Payload The payload associated with the order */
    protected Payload $payload;

    /** @var Driver The driver assigned to the order */
    protected ?Driver $driver;

    /** @var bool Flag to indicate if the order has multiple dropoff points */
    protected bool $isMultipleDropOrder = false;

    /**
     * Constructor for OrderTracker.
     *
     * @param Order $order the order to track
     */
    public function __construct(Order $order)
    {
        $order->loadAssignedDriver();

        $this->order   = $order;
        $this->payload = $order->getPayload(function ($payload) {
            $payload->loadMissing(['pickup', 'dropoff', 'waypoints', 'waypointMarkers']);
        });
        $this->isMultipleDropOrder = $this->payload->isMultipleDropOrder;
        $this->driver              = $order->driverAssigned;
    }

    /**
     * Get the current location of the driver or starting point.
     *
     * @return Point|null the current location of the driver, or null if unavailable
     */
    public function getDriverCurrentLocation(): ?Point
    {
        if ($this->driver) {
            return $this->driver->location;
        }

        $startingPoint = $this->payload->getPickupOrCurrentWaypoint();
        if ($startingPoint) {
            return $startingPoint->location;
        }

        return null;
    }

    /**
     * Get the percentage progress of the order.
     *
     * @return int|float the percentage of the order progress
     */
    public function getOrderProgressPercentage(): int|float
    {
        $totalDistance     = $this->getTotalDistance();
        $completedDistance = $this->getCompletedDistance();
        $cannotUseDistance = $totalDistance == -1 || $completedDistance == -1 || $completedDistance === 0;

        // Get order percentage by activity if distance-based progress is not available
        if ($cannotUseDistance) {
            /** @var Collection $activities */
            $activities    = $this->order->orderConfig ? $this->order->orderConfig->activities() : collect();
            $totalActivity = $activities->count();
            if ($totalActivity === 0) {
                return 100; // No activities, so treat it as 100% complete
            }

            // Calculate completed activities
            $completedActivity = $activities->filter(function ($activity) {
                return $activity->isCompleted($this->order);
            })->count();

            // Return progress percentage based on completed activities
            return round(($completedActivity / $totalActivity) * 100, 2);
        }

        if ($totalDistance === 0) {
            return 100;
        }

        return round(($completedDistance / $totalDistance) * 100, 2);
    }

    /**
     * Get the total distance for the order.
     *
     * @return int|float the total distance of the order in meters
     */
    public function getTotalDistance(): int|float
    {
        $points   = $this->getAllDestinationPoints()->toArray();
        if (count($points) < 2) {
            return -1;
        }

        $response = OSRM::getRouteFromPoints($points);
        if (isset($response['code']) && $response['code'] === 'Ok') {
            $route = Arr::first($response['routes']);
            if ($route) {
                return data_get($route, 'distance', 0);
            }
        }

        return -1;
    }

    /**
     * Get the completed distance by the driver.
     *
     * @return float the completed distance in meters
     */
    public function getCompletedDistance(): float
    {
        $points = $this->getCompletedDestinationPoints()->toArray();
        if (count($points) < 2) {
            return -1;
        }

        $response = OSRM::getRouteFromPoints($points);
        if (isset($response['code']) && $response['code'] === 'Ok') {
            $route = Arr::first($response['routes']);
            if ($route) {
                return data_get($route, 'distance', 0);
            }
        }

        return -1;
    }

    /**
     * Get the estimated time of arrival (ETA) for the current destination.
     *
     * @return float the ETA in seconds or -1 if unable to calculate
     */
    public function getCurrentDestinationETA(): float
    {
        $start              = $this->getDriverCurrentLocation();
        $currentDestination = $this->getCurrentDestination();
        $end                = $currentDestination ? $currentDestination->location : null;
        if ($start == $end) {
            $nextDestination = $this->getNextDestination();
            if ($nextDestination) {
                $end = $nextDestination->location;
            }
        }

        if (!$start || !$end) {
            return -1;
        }

        $response = OSRM::getRoute($start, $end);
        if (isset($response['code']) && $response['code'] === 'Ok') {
            $route = Arr::first($response['routes']);
            if ($route) {
                return data_get($route, 'duration', -1);
            }
        }

        return -1;
    }

    public function getWaypointETA(Waypoint|Place $waypoint): float
    {
        if ($waypoint instanceof Waypoint) {
            $waypoint->loadMissing('place');
            $waypoint = $waypoint->place;
        }

        $start              = $this->getDriverCurrentLocation();
        $end                = $waypoint->location;
        $response           = OSRM::getRoute($start, $end);
        if (isset($response['code']) && $response['code'] === 'Ok') {
            $route = Arr::first($response['routes']);
            if ($route) {
                return data_get($route, 'duration', -1);
            }
        }

        return -1;
    }

    /**
     * Get the estimated time of arrival (ETA) for the completion of the order.
     *
     * @return float the ETA in seconds or -1 if unable to calculate
     */
    public function getCompletionETA(): float
    {
        $start    = $this->getDriverCurrentLocation();
        $end      = $this->payload->getDropoffOrLastWaypoint()->location;
        $response = OSRM::getRoute($start, $end);
        if (isset($response['code']) && $response['code'] === 'Ok') {
            $route = Arr::first($response['routes']);
            if ($route) {
                return data_get($route, 'duration', -1);
            }
        }

        return -1;
    }

    /**
     * Get the estimated completion time of the order.
     *
     * @return Carbon the estimated completion time
     */
    public function getEstimatedCompletionTime(): ?Carbon
    {
        $currentEtaCompletion = $this->getCompletionETA();

        return now()->addSeconds($currentEtaCompletion);
    }

    /**
     * Get the start time of the order.
     *
     * @return Carbon the time the order started
     */
    public function getOrderStartTime(): ?Carbon
    {
        return $this->order->started_at;
    }

    /**
     * Get the completion time of the order, if completed.
     *
     * @return \Illuminate\Support\Carbon|null the time the order was completed, or null if not completed
     */
    public function getOrderCompletionTime(): ?Carbon
    {
        return $this->order->completed_at;
    }

    /**
     * Get all destinations (pickup, waypoints, dropoff) for the order.
     *
     * @return Collection a collection of all destination places
     */
    public function getAllDestinations(): Collection
    {
        return collect([$this->payload->pickup, ...$this->payload->waypoints, $this->payload->dropoff])->filter();
    }

    /**
     * Get all destination points (pickup, waypoints, dropoff) as spatial points.
     *
     * @return Collection a collection of Point objects for each destination
     */
    public function getAllDestinationPoints(): Collection
    {
        return $this->getAllDestinations()->map(function (Place $place) {
            return $place->location;
        })->filter()->values();
    }

    /**
     * Get the current destination the driver is heading to.
     *
     * @return Place|null the current destination place object, or null if not available
     */
    public function getCurrentDestination(): ?Place
    {
        if ($this->isMultipleDropOrder) {
            if ($this->payload->waypoints) {
                $destination = null;

                if (Str::isUuid($this->payload->current_waypoint_uuid)) {
                    $destination = $this->payload->waypoints->firstWhere('uuid', $this->payload->current_waypoint_uuid);
                }

                if (!$destination) {
                    $destination = $this->payload->waypoints->first();
                }

                return $destination;
            }

            return null;
        }

        if ($this->order->status === 'created' || $this->order->status === 'dispatched' || $this->order->status === 'pending') {
            return $this->payload->pickup;
        }

        return $this->payload->dropoff;
    }

    /**
     * Get the completed destinations of the order.
     *
     * @return Collection a collection of completed destination places
     */
    public function getCompletedDestinations(): Collection
    {
        if ($this->isMultipleDropOrder) {
            return $this->payload->waypointMarkers->filter(
                function (Waypoint $waypoint) {
                    return $this->isWaypointCompleted($waypoint);
                }
            )->map(
                function (Waypoint $waypoint) {
                    $waypoint->loadMissing('place');

                    return $waypoint->place;
                }
            );
        }

        if ($this->order->status === 'created' || $this->order->status === 'dispatched' || $this->order->status === 'pending') {
            return collect();
        }

        if ($this->order->status === 'completed') {
            return collect([$this->getPickup(), $this->getDropoff()]);
        }

        return collect([$this->getPickup()]);
    }

    /**
     * Get the completed destination points as spatial points.
     *
     * @return Collection a collection of Point objects representing the completed destination points
     */
    public function getCompletedDestinationPoints(): Collection
    {
        return $this->getCompletedDestinations()->map(function (Place $place) {
            return $place->location;
        })->filter()->values();
    }

    /**
     * Get the next destination that the driver should go to.
     *
     * @return Place|null the next destination place, or null if not available
     */
    public function getNextDestination(): ?Place
    {
        if ($this->isMultipleDropOrder) {
            /** @var Waypoint $nextWaypoint */
            $nextWaypoint = $this->payload->waypointMarkers->filter(function (Waypoint $waypoint) {
                return $this->isWaypointNotCompleted($waypoint) && $this->isWaypointNotCurrentDestination($waypoint);
            })->first();

            if ($nextWaypoint) {
                $nextWaypoint->loadMissing('place');

                return $nextWaypoint->place;
            }
        }

        return $this->payload->dropoff;
    }

    /**
     * Check if a waypoint has been completed.
     *
     * @param Waypoint $waypoint the waypoint to check
     *
     * @return bool true if the waypoint is completed or canceled, otherwise false
     */
    public function isWaypointCompleted(Waypoint $waypoint): bool
    {
        $waypoint->loadMissing(['trackingNumber', 'trackingNumber.status']);
        $status = strtolower($waypoint->status_code);

        return $status === 'completed' || $status === 'canceled';
    }

    /**
     * Check if a waypoint is not completed.
     *
     * @param Waypoint $waypoint the waypoint to check
     *
     * @return bool true if the waypoint is not completed, otherwise false
     */
    public function isWaypointNotCompleted(Waypoint $waypoint): bool
    {
        return !$this->isWaypointCompleted($waypoint);
    }

    /**
     * Check if a waypoint is the current destination.
     *
     * @param Waypoint $waypoint the waypoint to check
     *
     * @return bool true if the waypoint is the current destination, otherwise false
     */
    public function isWaypointCurrentDestination(Waypoint $waypoint): bool
    {
        if (!$this->payload->current_waypoint_uuid) {
            $currentDestination = $this->getCurrentDestination();

            return $currentDestination->uuid === $waypoint->place_uuid;
        }

        return $waypoint->place_uuid === $this->payload->current_waypoint_uuid;
    }

    /**
     * Check if a waypoint is not the current destination.
     *
     * @param Waypoint $waypoint the waypoint to check
     *
     * @return bool true if the waypoint is not the current destination, otherwise false
     */
    public function isWaypointNotCurrentDestination(Waypoint $waypoint): bool
    {
        return !$this->isWaypointCurrentDestination($waypoint);
    }

    /**
     * Get the pickup location of the order.
     *
     * @return Place the pickup place of the order
     */
    public function getPickup(): ?Place
    {
        return $this->payload->pickup;
    }

    /**
     * Get the dropoff location of the order.
     *
     * @return Place the dropoff place of the order
     */
    public function getDropoff(): ?Place
    {
        return $this->payload->dropoff;
    }

    public function eta(): array
    {
        // Load missing waypoints and places
        $waypoints = $this->payload->getAllStops();

        // ETA's
        $eta = [];
        foreach ($waypoints as $waypoint) {
            $eta[$waypoint->uuid] = $this->getWaypointETA($waypoint);
        }

        return $eta;
    }

    /**
     * Get all key tracker information as an array.
     */
    public function toArray(): array
    {
        $estimatedCompletionTime = $this->getEstimatedCompletionTime();
        $orderProgressPercentage = $this->getOrderProgressPercentage();

        return [
            'driver_current_location'             => $this->getDriverCurrentLocation(),
            'progress_percentage'                 => $orderProgressPercentage,
            'total_distance'                      => $this->getTotalDistance(),
            'completed_distance'                  => $this->getCompletedDistance(),
            'current_destination_eta'             => $this->getCurrentDestinationETA(),
            'completion_eta'                      => $this->getCompletionETA(),
            'estimated_completion_time'           => $estimatedCompletionTime,
            'estimated_completion_time_formatted' => $estimatedCompletionTime instanceof Carbon ? $estimatedCompletionTime->format('M jS, Y H:i') : null,
            'start_time'                          => $this->getOrderStartTime(),
            'completion_time'                     => $this->getOrderCompletionTime(),
            'current_destination'                 => $this->getCurrentDestination(),
            'next_destination'                    => $this->getNextDestination(),
            'first_waypoint_completed'            => $orderProgressPercentage > 10,
            'last_waypoint_completed'             => $orderProgressPercentage === 100 || $this->order->status === 'completed',
        ];
    }
}
