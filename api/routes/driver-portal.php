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
        Route::patch('me/profile', [DriverPortalController::class, 'updateProfile']);
        Route::patch('me/vehicle', [DriverPortalController::class, 'updateVehicle']);
        Route::post('me/toggle-online', [DriverPortalController::class, 'toggleOnline']);
    });
});
