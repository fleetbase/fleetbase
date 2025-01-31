<?php

namespace Fleetbase\FleetOps\Casts;

use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialExpression;
use Fleetbase\LaravelMysqlSpatial\Types\GeometryInterface;
use Fleetbase\LaravelMysqlSpatial\Types\MultiPolygon as SpatialMultiPolygon;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;

class MultiPolygon implements CastsAttributes
{
    /**
     * Cast the given value.
     *
     * @param \Illuminate\Database\Eloquent\Model $model
     * @param string                              $key
     * @param array                               $attributes
     */
    public function get($model, $key, $value, $attributes)
    {
        return $value;
    }

    /**
     * Prepare the given value for storage.
     *
     * @param \Illuminate\Database\Eloquent\Model $model
     * @param string                              $key
     * @param array                               $attributes
     */
    public function set($model, $key, $value, $attributes)
    {
        if ($value instanceof GeometryInterface) {
            $model->geometries[$key] = $value;

            return new SpatialExpression($value);
        }

        if ($value instanceof SpatialMultiPolygon) {
            $model->geometries[$key] = $value;

            return $value;
        }

        if (Utils::isGeoJson($value)) {
            $value                   = Utils::createGeometryObjectFromGeoJson($value);
            $model->geometries[$key] = $value;

            return $value;
        }

        if ($value instanceof SpatialExpression) {
            $model->geometries[$key] = $value;

            return $value;
        }

        throw new \Exception('Invalid MultiPolygon provided for ' . $key);
    }
}
