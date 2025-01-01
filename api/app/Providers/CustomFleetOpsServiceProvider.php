<?php

namespace App\Providers;

use Fleetbase\FleetOps\Providers\FleetOpsServiceProvider as BaseServiceProvider;
use Illuminate\Support\Facades\Route;

class CustomFleetOpsServiceProvider extends BaseServiceProvider
{
    public function boot()
    {
        // Call parent boot method but skip route registration


        // Register our custom routes instead
        $this->registerCustomRoutes();
    }

    protected function registerCustomRoutes()
    {
        Route::prefix('api')
            ->middleware('api')
            ->group(function () {
                Route::prefix('v1')->group(function () {
                    // Override the specific route you want to customize
                    Route::post('/orders/{id}/start', 'App\Http\Controllers\Api\v1\CustomOrderController@driverAcceptance')
                        ->name('orders.driverAcceptance'); // Give it the same name as Fleetbase's route
                });
            });
    }
}
