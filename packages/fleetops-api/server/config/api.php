<?php

return [
    /*
    |--------------------------------------------------------------------------
    | API Events
    |--------------------------------------------------------------------------
    */

    'events' => [
        // order events
        'order.created',
        'order.updated',
        'order.deleted',
        'order.dispatched',
        'order.dispatch_failed',
        'order.completed',
        'order.failed',
        'order.driver_assigned',
        'order.completed',

        // payload events
        'payload.created',
        'payload.updated',
        'payload.deleted',

        // entity events
        'entity.created',
        'entity.updated',
        'entity.deleted',
        'entity.driver_assigned',

        // driver events
        'driver.created',
        'driver.updated',
        'driver.deleted',
        'driver.assigned',
        // 'driver.entered_zone',
        // 'driver.exited_zone',

        // fleet events
        'fleet.created',
        'fleet.updated',
        'fleet.deleted',

        // purchase_rate events
        'purchase_rate.created',
        'purchase_rate.updated',
        'purchase_rate.deleted',

        // contact events
        'contact.created',
        'contact.updated',
        'contact.deleted',

        // place events
        'place.created',
        'place.updated',
        'place.deleted',

        // service_area events
        'service_area.created',
        'service_area.updated',
        'service_area.deleted',

        // service_quote events
        'service_quote.created',
        'service_quote.updated',
        'service_quote.deleted',

        // service_rate events
        'service_rate.created',
        'service_rate.updated',
        'service_rate.deleted',

        // tracking_number events
        'tracking_number.created',
        'tracking_number.updated',
        'tracking_number.deleted',

        // tracking_status events
        'tracking_status.created',
        'tracking_status.updated',
        'tracking_status.deleted',

        // vehicle events
        'vehicle.created',
        'vehicle.updated',
        'vehicle.deleted',

        // vendor events
        'vendor.created',
        'vendor.updated',
        'vendor.deleted',

        // zone events
        'zone.created',
        'zone.updated',
        'zone.deleted',
    ],

    /*
    |--------------------------------------------------------------------------
    | Proof of Delivery Methods
    |--------------------------------------------------------------------------
    */

    'pod_methods' => 'scan,signature,photo',

    /*
    |--------------------------------------------------------------------------
    | API/Webhook Versions
    |--------------------------------------------------------------------------
    */

    'versions' => ['2020-09-30', '2024-03-12'],
    'version' => '2024-03-12',
];
