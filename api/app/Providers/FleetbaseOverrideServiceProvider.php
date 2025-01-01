<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use App\Http\Resources\FuelReport as FuelReportResource;
use Fleetbase\FleetOps\Http\Resources\v1\FuelReport as BaseFuelReportResource;
use App\Models\FuelReport as FuelReportModel;
use Fleetbase\FleetOps\Models\FuelReport as BaseFuelReportModel;

class FleetbaseOverrideServiceProvider extends ServiceProvider
{
    public function boot()
    {
        // This should load AFTER Fleetbase's routes
        $this->app->bind(BaseFuelReportResource::class, FuelReportResource::class);
        // Bind your custom FuelReport model
        $this->app->bind(BaseFuelReportModel::class, FuelReportModel::class);
        $this->loadRoutesAfter();
    }

    protected function loadRoutesAfter()
    {
        Route::prefix('api')
            ->middleware('api')
            ->group(function () {
                Route::prefix('v1')->group(function () {
                    // Override the specific route you want to customize
                    Route::get('/orders', 'App\Http\Controllers\Api\v1\CustomOrderController@query')
                        ->name('orders.query'); // Give it the same name as Fleetbase's route
                    Route::post('/orders/{id}/start', 'App\Http\Controllers\Api\v1\CustomOrderController@driverAcceptance')
                        ->name('orders.driverAcceptance'); // Give it the same name as Fleetbase's route
                    Route::prefix('drivers')->group(function () {
                        Route::post('/login-with-sms', 'App\Http\Controllers\Api\v1\DriverController@loginWithPhone')
                            ->name('drivers.login-with-sms');
                        Route::post('/verify-code', 'App\Http\Controllers\Api\v1\DriverController@verifyCode')
                            ->name('drivers.verify-code');
                    });
                    // Route::prefix('fuel-reports')->group(function () {
                    //     Route::get('/', 'App\Http\Controllers\Api\v1\FuelReportController@export')
                    //     ->name('fuel-reports.export');
                    //     Route::post('/', 'App\Http\Controllers\Api\v1\FuelReportController@create')
                    //     ->name('fuel-reports.create');
                    // });
                    
                });
            });
    }
}
