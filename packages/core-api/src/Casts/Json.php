<?php

namespace Fleetbase\Casts;

use Fleetbase\Support\Utils;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;

class Json implements CastsAttributes
{
    /**
     * Cast the given value.
     *
     * @param \Illuminate\Database\Eloquent\Model $model
     * @param string                              $key
     * @param array                               $attributes
     *
     * @return array
     */
    public function get($model, $key, $value, $attributes)
    {
        return static::decode($value);
    }

    /**
     * Prepare the given value for storage.
     *
     * @param \Illuminate\Database\Eloquent\Model $model
     * @param string                              $key
     * @param array                               $value
     * @param array                               $attributes
     *
     * @return string
     */
    public function set($model, $key, $value, $attributes)
    {
        return json_encode($value);
    }

    /**
     * Unwrap JSON string and unescape JSON and decode JSON.
     *
     * @param string $json
     *
     * @return string
     */
    public static function decode($json)
    {
        if (!Utils::isJson($json)) {
            return $json;
        }

        // $json = stripslashes($json);
        return json_decode($json, true);
    }
}
