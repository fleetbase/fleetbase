<?php

use Fleetbase\Support\Utils;

$host = env('DB_HOST', '127.0.0.1');
$database = env('DB_DATABASE', 'fleetbase');
$username = env('DB_USERNAME', 'fleetbase');
$password = env('DB_PASSWORD', '');

if ($databaseUrl = getenv('DATABASE_URL')) {
    $url = Utils::parseUrl($databaseUrl);

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
    $url = Utils::parseUrl($cacheUrl);

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

if (extension_loaded('pdo_mysql')) {
    if (env('MYSQL_ATTR_SSL_CA')) {
        $mysql_options[PDO::MYSQL_ATTR_SSL_CA] = env('MYSQL_ATTR_SSL_CA');
    }
    if (env('MYSQL_ATTR_SSL_CERT')) {
        $mysql_options[PDO::MYSQL_ATTR_SSL_CERT] = env('MYSQL_ATTR_SSL_CERT');
    }
    if (env('MYSQL_ATTR_SSL_KEY')) {
        $mysql_options[PDO::MYSQL_ATTR_SSL_KEY] = env('MYSQL_ATTR_SSL_KEY');
    }
    // Setting default SSL verification behavior based on environment
    $mysql_options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = env('MYSQL_ATTR_SSL_VERIFY_SERVER_CERT', env('APP_ENV') === 'production');
}

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
return [
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
        'port' => env('SANDBOX_DB_PORT', env('DB_PORT', '3306')),
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
];
