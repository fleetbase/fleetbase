<?php

namespace Fleetbase\Traits;

use Fleetbase\Support\Utils;

trait TracksApiCredential
{
    /**
     * Boot the Uuid trait for the model.
     *
     * @return void
     */
    public static function bootTracksApiCredential()
    {
        static::creating(function ($model) {
            if (Utils::notEmpty($model->_key) || !$model->isFillable('_key')) {
                return;
            }

            // set the api key to the `_key` column
            $model->_key = session('api_key') ?? 'console';

            // set resource to current company session if applicable
            if (session('api_key') && $model->isFillable('company_uuid')) {
                $model->company_uuid = session('company');
            }
        });
    }
}
