<?php

use App\Http\Controllers\DriverPortalController;
use Illuminate\Support\Facades\Route;

Route::prefix('driver-portal')->group(function () {
    Route::get('{publicId}', [DriverPortalController::class, 'context']);
    Route::post('apply', [DriverPortalController::class, 'apply']);
    Route::post('request-code', [DriverPortalController::class, 'requestCode']);
    Route::post('verify-code', [DriverPortalController::class, 'verifyCode']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [DriverPortalController::class, 'me']);
        Route::post('me', [DriverPortalController::class, 'me']);
        Route::get('payout-options', [DriverPortalController::class, 'payoutOptions']);
        Route::post('payout-options', [DriverPortalController::class, 'payoutOptions']);
        Route::get('payout-branches', [DriverPortalController::class, 'payoutBranches']);
        Route::post('payout-branches', [DriverPortalController::class, 'payoutBranches']);
        Route::patch('me/profile', [DriverPortalController::class, 'updateProfile']);
        Route::patch('me/payout-profile', [DriverPortalController::class, 'updatePayoutProfile']);
        Route::patch('me/vehicle', [DriverPortalController::class, 'updateVehicle']);
        Route::post('me/toggle-online', [DriverPortalController::class, 'toggleOnline']);
        Route::post('me/orders/{id}/accept', [DriverPortalController::class, 'acceptOrder']);
        Route::post('me/orders/{id}/reject', [DriverPortalController::class, 'rejectOrder']);
        Route::post('me/orders/{id}/arrived-pickup', [DriverPortalController::class, 'arrivedAtPickup']);
        Route::post('me/orders/{id}/select-current', [DriverPortalController::class, 'selectCurrentOrder']);
        Route::post('me/orders/{id}/status', [DriverPortalController::class, 'updateOrderStatus']);
    });
});
