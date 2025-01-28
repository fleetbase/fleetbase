<?php

namespace Fleetbase\Casts;

use Fleetbase\Models\File;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Support\Str;

class CustomValue implements CastsAttributes
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
        $type = data_get($attributes, 'value_type', 'text');
        if (in_array($type, ['object', 'array'])) {
            return Json::decode($value);
        }

        // Resolve file values to File Model
        if (is_string($value) && Str::startsWith($value, 'file:')) {
            $fileId = explode(':', $value)[1];
            if (Str::isUuid($fileId)) {
                $file = File::where('uuid', $fileId)->first();
                if ($file) {
                    $value = json_encode($file);
                }
            }
        }

        return $value;
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
        $type = data_get($attributes, 'value_type', 'text');
        if (in_array($type, ['object', 'array'])) {
            return json_encode($value);
        }

        return $value;
    }
}
