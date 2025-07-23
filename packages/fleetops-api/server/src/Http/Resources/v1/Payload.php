<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Models\Model;
use Fleetbase\Support\Http;
use Illuminate\Support\Collection;

class Payload extends FleetbaseResource
{
    /**
     * Transform the resource into an array.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return array
     */
    public function toArray($request)
    {
        $withRouteETA = $request->has('with_route_eta');

        return [
            'id'                    => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'                  => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'             => $this->when(Http::isInternalRequest(), $this->public_id),
            'current_waypoint_uuid' => $this->when(Http::isInternalRequest(), $this->current_waypoint_uuid),
            'pickup_uuid'           => $this->when(Http::isInternalRequest(), $this->pickup_uuid),
            'dropoff_uuid'          => $this->when(Http::isInternalRequest(), $this->dropoff_uuid),
            'return_uuid'           => $this->when(Http::isInternalRequest(), $this->return_uuid),
            'current_waypoint'      => $this->when(!Http::isInternalRequest() && $this->currentWaypoint, data_get($this, 'currentWaypoint.public_id')),
            'pickup'                => $this->getPlace($this->pickup),
            'dropoff'               => $this->getPlace($this->dropoff),
            'return'                => new Place($this->return),
            'waypoints'             => $this->getWaypointsWithProperIds($withRouteETA),
            'entities'              => Entity::collection($this->entities),
            'route_segments'        => $this->when(Http::isInternalRequest(), $this->routeSegments),
            'cod_amount'            => $this->cod_amount ?? null,
            'cod_currency'          => $this->cod_currency ?? null,
            'cod_payment_method'    => $this->cod_payment_method ?? null,
            'meta'                  => $this->meta ?? [],
            'updated_at'            => $this->updated_at,
            'created_at'            => $this->created_at,
        ];
    }

    private function getPlace(?Model $place, bool $withRouteETA = false): Place
    {
        if ($place && $withRouteETA) {
            $place->eta = $this->tracker()->getWaypointETA($place);
        }

        return new Place($place);
    }

    /**
     * Get waypoints with proper IDs by working directly with waypoint models
     */
    private function getWaypointsWithProperIds(bool $withRouteETA = false): Collection
    {
        // Fetch all waypoint models for this payload, ordered by their order field
        $waypointModels = \Fleetbase\FleetOps\Models\Waypoint::where('payload_uuid', $this->uuid)
            ->whereNull('deleted_at') // Exclude soft-deleted waypoints
            ->with(['place', 'trackingNumber']) // Load relationships
            ->orderBy('order') // Order by waypoint order
            ->get();

        // Convert waypoint models to resources
        return $waypointModels->map(function ($waypointModel) use ($withRouteETA) {
            // Create a new resource using the waypoint model directly
            $resource = new WaypointDirect($waypointModel);
            
            // Add ETA if requested
            if ($withRouteETA && $waypointModel->place) {
                $resource->eta = $this->tracker()->getWaypointETA($waypointModel->place);
            }
            
            return $resource;
        });
    }

    // Keep the old method for backward compatibility if needed
    private function getWaypoints(bool $withRouteETA = false): Collection
    {
        if ($this->waypoints instanceof Collection) {
            return $this->waypoints->map(function ($waypoint) use ($withRouteETA) {
                $waypoint->payload_uuid = $this->uuid;
                if ($withRouteETA) {
                    $waypoint->eta = $this->tracker()->getWaypointETA($waypoint);
                }

                return $waypoint;
            });
        }

        return collect();
    }

    /**
     * Transform the resource into an webhook payload.
     *
     * @return array
     */
    public function toWebhookPayload()
    {
        return [
            'id'                 => $this->public_id,
            'pickup'             => new Place($this->pickup),
            'dropoff'            => new Place($this->dropoff),
            'return'             => new Place($this->return),
            'waypoints'          => static::waypoints($this->waypoints),
            'entities'           => Entity::collection($this->entities ?? []),
            'cod_amount'         => $this->cod_amount ?? null,
            'cod_currency'       => $this->cod_currency ?? null,
            'cod_payment_method' => $this->cod_payment_method ?? null,
            'meta'               => $this->meta ?? [],
            'updated_at'         => $this->updated_at,
            'created_at'         => $this->created_at,
        ];
    }
}