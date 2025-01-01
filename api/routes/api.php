<?php

// In routes/api.php or where your API routes are defined
use App\Http\Controllers\Api\v1\CustomOrderController;

use Illuminate\Support\Facades\Route;
Route::prefix('v1')
->middleware(['fleetbase.api', Fleetbase\FleetOps\Http\Middleware\TransformLocationMiddleware::class])
->namespace('Api\v1')
->group(function ($router) {

    Route::get('/orders', [CustomOrderController::class, 'query']);
    // Route::get('/orders', [CustomOrderController::class, 'query']);
    Route::post('/orders/{id}/start', [CustomOrderController::class, 'startOrder']);
    // Add other order-related routes here
});