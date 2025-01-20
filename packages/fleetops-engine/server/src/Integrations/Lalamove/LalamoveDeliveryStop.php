<?php

namespace Fleetbase\FleetOps\Integrations\Lalamove;

use Fleetbase\FleetOps\Models\Place;
use Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialExpression;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Illuminate\Support\Str;

class LalamoveDeliveryStop
{
    public $latitude;
    public $longitude;
    public $address;
    public $stopId;

    public function __construct($latitude, $longitude = null, ?string $address = '')
    {
        $this->stopId = (string) Str::uuid();

        if ($latitude instanceof Place) {
            $place = $latitude;

            $this->address = $place->address;

            if ($place->location instanceof SpatialExpression) {
                $wkt   = $place->location->getSpatialValue();
                $point = Point::fromWKT($wkt);

                $this->latitude  = $point->getLat();
                $this->longitude = $point->getLng();
            } else {
                $this->latitude  = $place->location->getLat();
                $this->longitude = $place->location->getLng();
            }
        } elseif ($latitude instanceof Point) {
            $point = $latitude;

            $this->latitude  = $point->getLat();
            $this->longitude = $point->getLng();
            $this->address   = $address ?? '';
        } else {
            $this->latitude  = $latitude;
            $this->longitude = $longitude;
            $this->address   = $address;
        }
    }

    public function __get(string $key)
    {
        $key = strtolower($key);

        if (isset($this->{$key})) {
            return $this->{$key};
        }

        return null;
    }

    public static function createFromPlace(Place $place)
    {
        $latitude  = $place->location->getLat();
        $longitude = $place->location->getLng();
        $address   = $place->address;

        return new static($latitude, $longitude, $address);
    }

    public static function createFromPoint(Point $point, string $address = '')
    {
        $latitude  = $point->getLat();
        $longitude = $point->getLng();

        return new static($latitude, $longitude, $address);
    }

    public function toPoint()
    {
        return new Point($this->latitude, $this->longitude);
    }

    public function toJson()
    {
        return json_encode($this->toArray());
    }

    public function toArray()
    {
        return [
            'coordinates' => [
                'lat' => (string) $this->latitude,
                'lng' => (string) $this->longitude,
            ],
            'address' => $this->address,
        ];
    }
}
