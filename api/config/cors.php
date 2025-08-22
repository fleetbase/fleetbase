<?php

use Fleetbase\Support\Utils;

$auto_allocation_host = explode(',', env('AUTO_ALLOCATION_HOST'));

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(['http://localhost:4200', env('CONSOLE_HOST'), Utils::addWwwToUrl(env('CONSOLE_HOST')), ...$auto_allocation_host]),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['x-compressed-json', 'access-console-sandbox', 'access-console-sandbox-key'],


    'max_age' => 0,

    'supports_credentials' => true,

];
