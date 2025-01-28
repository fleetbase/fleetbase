<?php

use Geocoder\Provider\Chain\Chain;
use Geocoder\Provider\GoogleMaps\GoogleMaps;
use Http\Client\Curl\Client;

return [
    'cache' => [

        /*
        |-----------------------------------------------------------------------
        | Cache Store
        |-----------------------------------------------------------------------
        |
        | Specify the cache store to use for caching. The value "null" will use
        | the default cache store specified in /config/cache.php file.
        |
        | Default: null
        |
        */

        'store' => 'geocode',

        /*
        |-----------------------------------------------------------------------
        | Cache Duration
        |-----------------------------------------------------------------------
        |
        | Specify the cache duration in seconds. The default approximates a
        | "forever" cache, but there are certain issues with Laravel's forever
        | caching methods that prevent us from using them in this project.
        |
        | Default: 9999999 (integer)
        |
        */

        'duration' => 9999999,
    ],

    /*
    |---------------------------------------------------------------------------
    | Providers
    |---------------------------------------------------------------------------
    |
    | Here you may specify any number of providers that should be used to
    | perform geocaching operations. The `chain` provider is special,
    | in that it can contain multiple providers that will be run in
    | the sequence listed, should the previous provider fail. By
    | default the first provider listed will be used, but you
    | can explicitly call subsequently listed providers by
    | alias: `app('geocoder')->using('google_maps')`.
    |
    | Please consult the official Geocoder documentation for more info.
    | https://github.com/geocoder-php/Geocoder#providers
    |
    */
    'providers' => [
        Chain::class => [
            GoogleMaps::class => [
                config('services.google_maps.locale', env('GOOGLE_MAPS_LOCALE', 'us')),
                config('services.google_maps.api_key', env('GOOGLE_MAPS_API_KEY')),
            ]
        ],
    ],

    /*
    |---------------------------------------------------------------------------
    | Adapter
    |---------------------------------------------------------------------------
    |
    | You can specify which PSR-7-compliant HTTP adapter you would like to use.
    | There are multiple options at your disposal: CURL, Guzzle, and others.
    |
    | Please consult the official Geocoder documentation for more info.
    | https://github.com/geocoder-php/Geocoder#usage
    |
    | Default: Client::class (FQCN for CURL adapter)
    |
    */
    'adapter'  => Client::class,

    /*
    |---------------------------------------------------------------------------
    | Reader
    |---------------------------------------------------------------------------
    |
    | You can specify a reader for specific providers, like GeoIp2, which
    | connect to a local file-database. The reader should be set to an
    | instance of the required reader class or an array containing the reader
    | class and arguments.
    |
    | Please consult the official Geocoder documentation for more info.
    | https://github.com/geocoder-php/geoip2-provider
    |
    | Default: null
    |
    | Example:
    |   'reader' => [
    |       WebService::class => [
    |           env('MAXMIND_USER_ID'),
    |           env('MAXMIND_LICENSE_KEY')
    |       ],
    |   ],
    |
    */
    'reader' => null,

];
