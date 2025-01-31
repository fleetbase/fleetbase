<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\Support\Http;

class VehicleWithoutDriver extends FleetbaseResource
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
            'id'                     => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'                   => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'              => $this->when(Http::isInternalRequest(), $this->public_id),
            'internal_id'            => $this->internal_id,
            'name'                   => $this->display_name,
            'display_name'           => $this->when(Http::isInternalRequest(), $this->display_name),
            'vin'                    => $this->vin ?? null,
            'devices'                => $this->whenLoaded('devices', fn () => $this->devices),
            'photo_url'              => $this->photo_url,
            'avatar_url'             => $this->avatar_url,
            'make'                   => $this->make,
            'model'                  => $this->model,
            'year'                   => $this->year,
            'trim'                   => $this->trim,
            'type'                   => $this->type,
            'plate_number'           => $this->plate_number,
            'vin'                    => $this->vin,
            'vin_data'               => $this->vin_data,
            'status'                 => $this->status,
            'online'                 => $this->online,
            'location'               => data_get($this, 'location', new Point(0, 0)),
            'heading'                => (int) data_get($this, 'heading', 0),
            'altitude'               => (int) data_get($this, 'altitude', 0),
            'speed'                  => (int) data_get($this, 'speed', 0),
            'meta'                   => data_get($this, 'meta', []),
            'updated_at'             => $this->updated_at,
            'created_at'             => $this->created_at,
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
            'id'           => $this->public_id,
            'internal_id'  => $this->internal_id,
            'name'         => $this->name,
            'vin'          => data_get($this, 'vin'),
            'photo'        => data_get($this, 'photoUrl'),
            'make'         => data_get($this, 'make'),
            'model'        => data_get($this, 'model'),
            'year'         => data_get($this, 'year'),
            'trim'         => data_get($this, 'trim'),
            'type'         => data_get($this, 'type'),
            'plate_number' => data_get($this, 'plate_number'),
            'vin_data'     => $this->vin_data,
            'status'       => $this->status,
            'online'       => $this->online,
            'meta'         => $this->meta,
            'updated_at'   => $this->updated_at,
            'created_at'   => $this->created_at,
        ];
    }
}
