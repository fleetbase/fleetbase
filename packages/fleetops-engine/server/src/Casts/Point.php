<?php

namespace Fleetbase\FleetOps\Casts;

use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialExpression;
use Fleetbase\LaravelMysqlSpatial\Types\GeometryInterface;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Query\Expression;

/**
 * Class Point
 * Custom Eloquent cast for handling Point spatial data.
 */
class Point implements CastsAttributes
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
        if (static::isRawPoint($value)) {
            return Utils::rawPointToPoint($value);
        }

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
        if ($value instanceof Expression) {
            return $value;
        }

        if ($value instanceof GeometryInterface) {
            $model->geometries[$key] = $value;

            return new SpatialExpression($value);
        }

        if (Utils::isGeoJson($value)) {
            $value                   = Utils::createSpatialExpressionFromGeoJson($value);
            $model->geometries[$key] = $value;

            return $value;
        }

        if (Utils::isCoordinates($value)) {
            $point                   = Utils::getPointFromCoordinates($value);
            $model->geometries[$key] = $point;

            return $point;
        }

        if ($value instanceof SpatialExpression) {
            $model->geometries[$key] = $value;

            return $value;
        }

        return static::createEmptySpatialExpression();
    }

    /**
     * Creates an empty Point as a SpatialExpression.
     */
    public static function createEmptySpatialExpression(): SpatialExpression
    {
        $value = json_encode([
            'type'        => 'Point',
            'coordinates' => [0, 0],
            'bbox'        => [0, 0, 0, 0],
        ]);

        return Utils::createSpatialExpressionFromGeoJson($value);
    }

    /**
     * Convert coordinates and bounding box values to float.
     *
     * @return array
     */
    public static function coordinatesBboxToFloat(array $geometry)
    {
        foreach ($geometry as $key => $value) {
            if (in_array($key, ['coordinates', 'bbox']) && is_array($value)) {
                foreach ($value as $index => $value) {
                    $geometry[$key][$index] = (float) $value;
                }
            }
        }

        return $geometry;
    }

    /**
     * Check if the given data is a raw Point object.
     */
    public static function isRawPoint($data): bool
    {
        if (is_string($data)) {
            return preg_match('/[\x00-\x1f]/', $data, $matches) === 1;
        }

        return false;
    }

    /**
     * Convert a hexadecimal string to a regular string.
     *
     * @param string $hex
     *
     * @return string
     */
    public static function hex2str($hex)
    {
        $str = '';
        for ($i = 0; $i < strlen($hex); $i += 2) {
            $str .= chr(hexdec(substr($hex, $i, 2)));
        }

        return $str;
    }
}
