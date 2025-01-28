<?php

use Fleetbase\Support\Utils;

/*
|--------------------------------------------------------------------------
| Broadcast Connections
|--------------------------------------------------------------------------
|
| Here you may define all of the broadcast connections that will be used
| to broadcast events to other systems or over websockets. Samples of
| each available type of connection are provided inside this array.
|
*/

return [
    'socketcluster' => [
        'driver' => 'socketcluster',
        'options' => [
            'secure' => Utils::castBoolean(env('SOCKETCLUSTER_SECURE', false)),
            'host' => env('SOCKETCLUSTER_HOST', 'socket'),
            'port' => env('SOCKETCLUSTER_PORT', 8000),
            'path' => env('SOCKETCLUSTER_PATH', '/socketcluster/'),
            'query' => [],
        ],
    ],

    // for apple apn
    'apn' => [
        'key_id' => env('APN_KEY_ID'),
        'team_id' => env('APN_TEAM_ID'),
        'app_bundle_id' => env('APN_BUNDLE_ID'),
        'private_key_content' => env('APN_PRIVATE_KEY'),
        'production' => env('APN_PRODUCTION', true),
    ],
];
