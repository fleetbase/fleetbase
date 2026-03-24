<?php

use App\Http\Controllers\OpsDashboardController;
use Illuminate\Support\Facades\Route;

Route::prefix('ops')->group(function () {
    Route::get('dashboard/summary', [OpsDashboardController::class, 'summary']);

    Route::get('orders', [OpsDashboardController::class, 'listOrders']);
    Route::get('orders/{id}', [OpsDashboardController::class, 'showOrder']);
    Route::post('orders', [OpsDashboardController::class, 'createOrder']);
    Route::post('orders/{id}/assign-driver', [OpsDashboardController::class, 'assignDriver']);
    Route::post('orders/{id}/status', [OpsDashboardController::class, 'updateOrderStatus']);
    Route::post('orders/{id}/advance-stage', [OpsDashboardController::class, 'advanceOrderStage']);

    Route::get('drivers', [OpsDashboardController::class, 'listDrivers']);
    Route::get('drivers/{id}', [OpsDashboardController::class, 'showDriver']);
    Route::post('drivers', [OpsDashboardController::class, 'createDriver']);
    Route::patch('drivers/{id}', [OpsDashboardController::class, 'updateDriver']);
    Route::post('drivers/{id}/availability', [OpsDashboardController::class, 'setDriverAvailability']);
    Route::post('drivers/{id}/assign-vehicle', [OpsDashboardController::class, 'assignVehicle']);
    Route::post('drivers/{id}/payout-batches', [OpsDashboardController::class, 'createDriverPayoutBatch']);
    Route::post('drivers/{id}/approve', [OpsDashboardController::class, 'approveDriver']);
    Route::post('drivers/{id}/reject', [OpsDashboardController::class, 'rejectDriver']);

    Route::get('vehicles', [OpsDashboardController::class, 'listVehicles']);
    Route::get('vehicles/{id}', [OpsDashboardController::class, 'showVehicle']);
    Route::post('vehicles', [OpsDashboardController::class, 'createVehicle']);
    Route::patch('vehicles/{id}', [OpsDashboardController::class, 'updateVehicle']);

    Route::get('team', [OpsDashboardController::class, 'listTeam']);
    Route::post('team', [OpsDashboardController::class, 'createTeamMember']);
    Route::post('team/{id}/role', [OpsDashboardController::class, 'assignTeamRole']);
    Route::get('roles/presets', [OpsDashboardController::class, 'rolePresets']);

    Route::get('settings', [OpsDashboardController::class, 'getSettings']);
    Route::patch('settings', [OpsDashboardController::class, 'updateSettings']);
});
