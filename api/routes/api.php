<?php

// In routes/api.php or where your API routes are defined
use App\Http\Controllers\Api\v1\CustomOrderController;

use Illuminate\Support\Facades\Route;
Route::group(['prefix' => 'v1', 'middleware' => ['api']], function () {

    Route::get('/orders', [CustomOrderController::class, 'query']);
    // Add other order-related routes here
});