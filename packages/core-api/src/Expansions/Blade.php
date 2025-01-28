<?php

namespace Fleetbase\Expansions;

use Fleetbase\Build\Expansion;
use Fleetbase\Support\Utils;
use Illuminate\Support\Carbon;

function args($expression)
{
    return array_map(function ($item) {
        return trim($item);
    }, is_array($expression) ? $expression : explode(',', $expression));
}

class Blade implements Expansion
{
    public static $method = 'extend';

    public static function target()
    {
        return Illuminate\Support\Facades\Blade::class;
    }

    public function assetFromS3()
    {
        return function ($path) {
            return Utils::assetFromS3($path);
        };
    }

    public function fontFromS3()
    {
        return function ($path) {
            return Utils::assetFromS3('fonts/' . $path);
        };
    }

    public function toTimeString()
    {
        return function ($dateString) {
            return Carbon::parse($dateString)->toTimeString();
        };
    }

    public function toDateTimeString()
    {
        return function ($dateString) {
            return Carbon::parse($dateString)->toDateTimeString();
        };
    }

    public function formatFromCarbon()
    {
        return function ($args) {
            list($dateString, $format) = args($args);

            // default format
            $format = $format ?? 'jS \o\f F, Y g:i:s a';

            return '<?= \Illuminate\Support\Carbon::parse(' . $dateString . ')->format(' . $format . ') ?>';
        };
    }

    public function getFromCarbonParse()
    {
        return function ($args) {
            list($dateString, $property) = args($args);

            // default property
            $property = $property ?? 'timestamp';

            return '<?= \Illuminate\Support\Carbon::parse(' . $dateString . ')->{' . $property . '} ?>';
        };
    }
}
