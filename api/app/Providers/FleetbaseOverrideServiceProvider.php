<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class FleetbaseOverrideServiceProvider extends ServiceProvider
{
    public function boot()
    {
        // This should load AFTER Fleetbase's routes
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
                });
            });
    }
}