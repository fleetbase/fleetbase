<?php

use Illuminate\Support\Str;

$host = env('DB_HOST', '127.0.0.1');
$database = env('DB_DATABASE', 'fleetbase');
$username = env('DB_USERNAME', 'fleetbase');
$password = env('DB_PASSWORD', '');

if ($databaseUrl = getenv('DATABASE_URL')) {
    $url = parse_url($databaseUrl);

    $host = $url['host'];
    $username = $url['user'];
    if (isset($url['pass'])) {
        $password = $url['pass'];
    }
    $database = substr($url['path'], 1);
}

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

$mysql_options = [];

if (env('APP_ENV') === 'local') {
    $mysql_options[PDO::ATTR_EMULATE_PREPARES] = true;
}

return [
    /*
    |--------------------------------------------------------------------------
    | Default Database Connection Name
    |--------------------------------------------------------------------------
    |
    | Here you may specify which of the database connections below you wish
    | to use as your default connection for all database work. Of course
    | you may use many connections at once using the Database library.
    |
    */

    'default' => env('DB_CONNECTION', 'mysql'),

    /*
    |--------------------------------------------------------------------------
    | Database Connections
    |--------------------------------------------------------------------------
    |
    | Here are each of the database connections setup for your application.
    | Of course, examples of configuring each database platform that is
    | supported by Laravel is shown below to make development simple.
    |
    |
    | All database work in Laravel is done through the PHP PDO facilities
    | so make sure you have the driver for your particular database of
    | choice installed on your machine before you begin development.
    |
    */

    'connections' => [
        'sqlite' => [
            'driver' => 'sqlite',
            'url' => env('DATABASE_URL'),
            'database' => env('DB_DATABASE', database_path('database.sqlite')),
            'prefix' => '',
            'foreign_key_constraints' => env('DB_FOREIGN_KEYS', true),
        ],

        'mysql' => [
            'driver' => 'mysql',
            'host' => $host,
            'port' => env('DB_PORT', '3306'),
            'database' => $database,
            'username' => $username,
            'password' => $password,
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'engine' => null,
            'options' => $mysql_options,
        ],

        'sandbox' => [
            'driver' => 'mysql',
            'host' => $host,
            'port' => env('SANDBOX_DB_PORT', '3306'),
            'database' => $database . '_sandbox',
            'username' => $username,
            'password' => $password,
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'engine' => null,
            'options' => $mysql_options,
        ],

        'frontend' => [
            'driver' => 'mysql',
            'host' => $host,
            'port' => env('FRONTEND_DB_PORT', '3306'),
            'database' => $database . '_frontend',
            'username' => $username,
            'password' => $password,
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'engine' => null,
            'options' => $mysql_options,
        ],

        'greenfreight' => [
            'driver' => 'mysql',
            'host' => $host,
            'port' => env('GREENFREIGHT_DB_PORT', '3306'),
            'database' => $database . '_greenfreight',
            'username' => $username,
            'password' => $password,
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'engine' => null,
            'options' => $mysql_options,
        ],

        'storefront' => [
            'driver' => 'mysql',
            'host' => $host,
            'port' => env('STOREFRONT_DB_PORT', '3306'),
            'database' => $database . '_storefront',
            'username' => $username,
            'password' => $password,
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'engine' => null,
            'options' => $mysql_options,
        ],

        'pgsql' => [
            'driver' => 'pgsql',
            'url' => env('DATABASE_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'forge'),
            'username' => env('DB_USERNAME', 'forge'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8mb4',
            'prefix' => '',
            'prefix_indexes' => true,
            'schema' => 'public',
            'sslmode' => 'prefer',
        ],

        'sqlsrv' => [
            'driver' => 'sqlsrv',
            'url' => env('DATABASE_URL'),
            'host' => env('DB_HOST', 'localhost'),
            'port' => env('DB_PORT', '1433'),
            'database' => env('DB_DATABASE', 'forge'),
            'username' => env('DB_USERNAME', 'forge'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8mb4',
            'prefix' => '',
            'prefix_indexes' => true,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Migration Repository Table
    |--------------------------------------------------------------------------
    |
    | This table keeps track of all the migrations that have already run for
    | your application. Using this information, we can determine which of
    | the migrations on disk haven't actually been run in the database.
    |
    */

    'migrations' => 'migrations',

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

    'redis' => [
        'client' => env('REDIS_CLIENT', 'phpredis'),

        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => env('REDIS_PREFIX', Str::slug(env('APP_NAME', 'fleetbase'), '_') . '_database_'),
        ],

        'default' => [
            'host' => $redis_host,
            'password' => $redis_password,
            'port' => env('REDIS_PORT', 6379),
            'database' => $redis_database,
        ],

        'sql' => [
            'host' => $redis_host,
            'password' => $redis_password,
            'port' => env('REDIS_PORT', 6379),
            'database' => $redis_database . '_sql_cache',
        ],

        'cache' => [
            'host' => $redis_host,
            'password' => $redis_password,
            'port' => env('REDIS_PORT', 6379),
            'database' => $redis_database . '_cache',
        ],

        'geocode-cache' => [
            'host' => $redis_host,
            'password' => $redis_password,
            'port' => env('REDIS_PORT', 6379),
            'database' => $redis_database . '_geocode_cache',
        ],
    ],
];
