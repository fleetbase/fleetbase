<?php

use App\Http\Controllers\MultiPickupController;
use Illuminate\Support\Facades\Route;

Route::prefix('multi-pickup')->group(function () {
    Route::get('capacity/{riderId}', [MultiPickupController::class, 'getRiderCapacity']);
    Route::post('capacity/{riderId}/add', [MultiPickupController::class, 'addPackage']);
    Route::post('capacity/{riderId}/remove', [MultiPickupController::class, 'removePackage']);

    Route::get('nearby-pickups', [MultiPickupController::class, 'getNearbyPickups']);

    Route::get('orders/{orderId}/tracking', [MultiPickupController::class, 'tracking']);
    Route::post('orders/{orderId}/customer-confirm', [MultiPickupController::class, 'customerConfirm']);
    Route::get('orders/{orderId}/customer-confirmed', [MultiPickupController::class, 'isCustomerConfirmed']);

    Route::post('fleetbase-webhook', [MultiPickupController::class, 'fleetbaseWebhook']);
});

Route::prefix('logistics')->group(function () {
    Route::post('quotes', [MultiPickupController::class, 'quote']);
    Route::post('deliveries', [MultiPickupController::class, 'createDelivery']);
    Route::post('deliveries/{orderId}/status', [MultiPickupController::class, 'updateDeliveryStatus']);
    Route::post('deliveries/{orderId}/reassign', [MultiPickupController::class, 'reassignDelivery']);
});
