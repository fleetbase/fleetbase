<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'sendgrid' => [
        'api_key' => env('SENDGRID_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'stripe' => [
        'key' => env('STRIPE_KEY', env('STRIPE_API_KEY')),
        'secret' => env('STRIPE_SECRET', env('STRIPE_API_SECRET')),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],
    'snap_api' => [
        'url' => env('SNAP_API_URL'),
    ],
    'parking_radius_meter' => env('PARKING_RADIUS_METER', 500),
    'gocardless' => [
        'access_token' => env('GOCARDLESS_ACCESS_TOKEN'),
        'environment' => env('GOCARDLESS_ENVIRONMENT', 'sandbox'), // 'sandbox' or 'live'
        'webhook_secret' => env('GOCARDLESS_WEBHOOK_SECRET'),
        'api_url' => env('GOCARDLESS_API_URL', 'https://api-sandbox.gocardless.com'),
        'ssl_verify' => env('GOCARDLESS_SSL_VERIFY', true), // Set to false in development
        'timeout' => env('GOCARDLESS_TIMEOUT', 30),
        'currency' => env('GOCARDLESS_CURRENCY', 'EUR'),
    ],
    'chargebee' => [
        'site' => env('CHARGEBEE_SITE'),
        'site_name' => env('CHARGEBEE_SITE_NAME'),
        'api_key' => env('CHARGEBEE_API_KEY'),
        'webhook_secret' => env('CHARGEBEE_WEBHOOK_SECRET'),
        'web_users_addon_id' => env('CHARGEBEE_WEB_USERS_ADDON_ID'),
        'app_users_addon_id' => env('CHARGEBEE_APP_USERS_ADDON_ID'),
    ],
];
