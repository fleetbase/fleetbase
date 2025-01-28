<?php

$redis_host = env('REDIS_HOST', '127.0.0.1');
$redis_database = env('REDIS_DATABASE', '0');
$redis_password = env('REDIS_PASSWORD', null);

if ($cacheUrl = getenv('CACHE_URL')) {
    $url = parse_url($cacheUrl);

    $redis_host = $url['host'];
    if (isset($url['pass'])) {
        $redis_password = $url['pass'];
    }
    $redis_database = isset($url['path']) ? substr($url['path'], 1) : 'cache';
}

/*
|--------------------------------------------------------------------------
| Redis Databases
|--------------------------------------------------------------------------
|
| Redis is an open source, fast, and advanced key-value store that also
| provides a richer body of commands than a typical key-value system
| such as APC or Memcached. Laravel makes it easy to dig right in.
|
*/
return [
    'client' => env('REDIS_CLIENT', 'phpredis'),

    'options' => [
        'cluster' => env('REDIS_CLUSTER', 'redis'),
        'prefix' => env('REDIS_PREFIX', \Illuminate\Support\Str::slug(env('APP_NAME', 'fleetbase'), '_') . '_database_'),
    ],

    'default' => [
        'url' => $cacheUrl,
        'host' => $redis_host,
        'password' => $redis_password,
        'port' => env('REDIS_PORT', 6379),
        'database' => $redis_database,
    ],

    'sql' => [
        'url' => $cacheUrl,
        'host' => $redis_host,
        'password' => $redis_password,
        'port' => env('REDIS_PORT', 6379),
        'database' => $redis_database . '_sql_cache',
    ],

    'cache' => [
        'url' => $cacheUrl,
        'host' => $redis_host,
        'password' => $redis_password,
        'port' => env('REDIS_PORT', 6379),
        'database' => $redis_database . '_cache',
    ],

    'geocode-cache' => [
        'url' => $cacheUrl,
        'host' => $redis_host,
        'password' => $redis_password,
        'port' => env('REDIS_PORT', 6379),
        'database' => $redis_database . '_geocode_cache',
    ],
];
