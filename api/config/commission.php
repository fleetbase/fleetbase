<?php

return [
    'percentage' => (float) env('PLATFORM_COMMISSION_PERCENTAGE', 7),

    'max_packages_per_rider' => (int) env('MAX_PACKAGES_PER_RIDER', 3),

    'nearby_pickup_radius_km' => (float) env('NEARBY_PICKUP_RADIUS_KM', 2),

    'logistics_default_company_uuid' => env('LOGISTICS_DEFAULT_COMPANY_UUID'),

    'logistics_quote_ttl_minutes' => (int) env('LOGISTICS_QUOTE_TTL_MINUTES', 15),

    'logistics_quote_base_fee' => (int) env('LOGISTICS_QUOTE_BASE_FEE', 3000),

    'logistics_quote_per_km_fee' => (int) env('LOGISTICS_QUOTE_PER_KM_FEE', 500),

    'logistics_quote_service_fee' => (int) env('LOGISTICS_QUOTE_SERVICE_FEE', 1000),

    'logistics_quote_weight_included_grams' => (int) env('LOGISTICS_QUOTE_WEIGHT_INCLUDED_GRAMS', 3000),

    'logistics_quote_extra_kg_fee' => (int) env('LOGISTICS_QUOTE_EXTRA_KG_FEE', 250),

    'driver_earnings_percentage' => (float) env('DRIVER_EARNINGS_PERCENTAGE', 80),

    'nearby_pickup_pending_statuses' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('NEARBY_PICKUP_PENDING_STATUSES', 'created,pending'))
    ))),

    'payout_schedule' => env('PAYOUT_SCHEDULE', 'weekly'),

    'payout_day' => env('PAYOUT_DAY', 'friday'),

    'medusa_backend_url' => env('MEDUSA_BACKEND_URL'),

    'medusa_delivery_confirmed_path' => env('MEDUSA_DELIVERY_CONFIRMED_PATH', '/courier/delivery-confirmed'),

    'medusa_webhook_secret' => env('MEDUSA_WEBHOOK_SECRET'),

    'fleetbase_webhook_secret' => env('FLEETBASE_WEBHOOK_SECRET'),

    'africastalking_api_key' => env('AFRICASTALKING_API_KEY'),

    'africastalking_username' => env('AFRICASTALKING_USERNAME', 'sandbox'),

    'rider_notification_webhook_url' => env('MULTI_PICKUP_NOTIFY_WEBHOOK_URL'),
];
