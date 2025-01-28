<?php

namespace Fleetbase\FleetOps\Rules;

use Fleetbase\FleetOps\Support\Utils;
use Illuminate\Contracts\Validation\Rule;

class ResolvablePoint implements Rule
{
    /**
     * Determine if the validation rule passes.
     *
     * @param string $attribute
     *
     * @return bool
     */
    public function passes($attribute, $value)
    {
        try {
            $point = Utils::getPointFromMixed($value);

            return $point instanceof \Fleetbase\LaravelMysqlSpatial\Types\Point;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get the validation error message.
     *
     * @return string
     */
    public function message()
    {
        return 'The :attribute must be a valid GeoJSON Point or a type (Place ID) that can be resolved to a Point.';
    }
}
