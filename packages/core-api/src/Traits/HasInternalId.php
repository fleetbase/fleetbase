<?php

namespace Fleetbase\Traits;

use Fleetbase\Models\Company;
use Fleetbase\Support\Utils;
use Illuminate\Support\Str;

trait HasInternalId
{
    /**
     * Boot the public id trait for the model.
     *
     * @return void
     */
    public static function bootHasInternalId()
    {
        static::creating(function ($model) {
            if (is_string($model->internal_id)) {
                return;
            }

            $model->internal_id = static::generateInternalId($model->internal_id);
        });
    }

    /**
     * Generates an internal ID for this model.
     *
     * @return string
     */
    public static function makeInternalId($prepend = '', $append = '')
    {
        $id = $prepend . Utils::randomNumber(6) . $append;

        $exists = self::where('internal_id', $id)
            ->withTrashed()
            ->first();

        if ($exists) {
            return static::makeInternalId($prepend, $append);
        }

        return $id;
    }

    /**
     * Generates an internal ID for this model.
     *
     * @return string
     */
    public static function generateInternalId($initialInternalId = null, $append = null)
    {
        if (is_array($initialInternalId)) {
            $prepend = data_get($initialInternalId, 'prepend') ?? '';
            $append  = data_get($initialInternalId, 'append') ?? '';

            return static::makeInternalId($prepend, $append);
        }

        if (is_string($initialInternalId) && is_string($append)) {
            return static::makeInternalId($initialInternalId, $append);
        }

        if (session('company')) {
            // use company letters as a prepend
            $prepend = '';
            $append  = '';

            // get company record
            $company = Company::where('uuid', session('company'))->first();

            if ($company) {
                if (Str::contains($company->name, ' ')) {
                    $companyNameExploded = explode(' ', $company->name);
                    $prepend             = strtoupper(mb_substr($companyNameExploded[0], 0, 1, 'utf-8')) . strtoupper(mb_substr($companyNameExploded[1], 0, 1, 'utf-8'));
                }

                if (!$prepend) {
                    $prepend = strtoupper(mb_substr($company->name, 0, 2, 'utf-8'));
                }
            }

            return static::makeInternalId($prepend, $append);
        }

        return static::makeInternalId();
    }
}
