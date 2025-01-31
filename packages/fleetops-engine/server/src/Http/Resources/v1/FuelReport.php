<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\Support\Http;

class FuelReport extends FleetbaseResource
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
        return [
            'id'                => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'              => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'         => $this->when(Http::isInternalRequest(), $this->public_id),
            'reported_by_uuid'  => $this->when(Http::isInternalRequest(), $this->reported_by_uuid),
            'driver_uuid'       => $this->when(Http::isInternalRequest(), $this->driver_uuid),
            'vehicle_uuid'      => $this->when(Http::isInternalRequest(), $this->vehicle_uuid),
            'reporter_name'     => $this->when(Http::isInternalRequest(), $this->reporter_name),
            'driver_name'       => $this->when(Http::isInternalRequest(), $this->driver_name),
            'vehicle_name'      => $this->when(Http::isInternalRequest(), $this->vehicle_name),
            'reporter'          => $this->whenLoaded('reporter', fn () => $this->reporter),
            'vehicle'           => $this->whenLoaded('vehicle', fn () => new Vehicle($this->vehicle)),
            'driver'            => $this->whenLoaded('driver', fn () => new Driver($this->driver)),
            'odometer'          => $this->odometer,
            'amount'            => $this->amount,
            'currency'          => $this->currency,
            'volume'            => $this->volume,
            'metric_unit'       => $this->metric_unit,
            'type'              => $this->type,
            'status'            => $this->status,
            'location'          => $this->location ?? new Point(0, 0),
            'updated_at'        => $this->updated_at,
            'created_at'        => $this->created_at,
        ];
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
            'reporter'           => data_get($this, 'reportedBy.public_id'),
            'driver'             => data_get($this, 'driver.public_id'),
            'vehicle'            => data_get($this, 'vehicle.public_id'),
            'report_name'        => $this->report,
            'odometer'           => $this->odometer,
            'amount'             => $this->amount,
            'currency'           => $this->currency,
            'volume'             => $this->volume,
            'metric_unit'        => $this->metric_unit,
            'type'               => $this->type,
            'status'             => $this->status,
            'location'           => $this->location ?? new Point(0, 0),
            'updated_at'         => $this->updated_at,
            'created_at'         => $this->created_at,
        ];
    }
}
