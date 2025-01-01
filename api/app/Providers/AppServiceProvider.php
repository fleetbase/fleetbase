<?php

namespace App\Providers;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        Schema::defaultStringLength(255);
        $this->app->booted(function () {
            $this->overrideFleetbaseRoutes();
        });
    }

    protected function overrideFleetbaseRoutes()
    {
        // Clear any existing routes for this endpoint
        $routes = Route::getRoutes();
        $newRoutes = new \Illuminate\Routing\RouteCollection();
        
        // Copy all routes except the one we want to override
        foreach ($routes as $route) {
            if (!($route->uri() === 'api/v1/orders' && in_array('GET', $route->methods()))) {
                $newRoutes->add($route);
            }
        }
        
        // Add our new route
        $newRoute = Route::prefix('api/v1')
            ->middleware('api')
            ->get('/orders', 'App\Http\Controllers\Api\v1\CustomOrderController@query')
            ->name('orders.query');
            
        $newRoutes->add($newRoute);
        
        // Replace the route collection
        Route::setRoutes($newRoutes);
    }
    // protected function overrideFleetbaseRoutes()
    // {
    //     // Clear any existing routes for this endpoint
    //     $routes = Route::getRoutes();
    //     $newRoutes = new \Illuminate\Routing\RouteCollection();
        
    //     // Copy all routes except the one we want to override
    //     foreach ($routes as $route) {
    //         if (!($route->uri() === 'api/v1/orders' && in_array('GET', $route->methods()))) {
    //             $newRoutes->add($route);
    //         }
    //     }
        
    //     // Add our new route
    //     $newRoute = Route::prefix('api/v1')
    //         ->middleware('api')
    //         ->get('/orders', 'App\Http\Controllers\Api\v1\CustomOrderController@query')
    //         ->name('orders.query');

    //     $newRoute = Route::prefix('api/v1')
    //     ->middleware('api')
    //     ->post('/orders/{id}/start', 'App\Http\Controllers\Api\v1\CustomOrderController@driverAcceptance')
    //     ->name('orders.driverAcceptance');
            
    //     $newRoutes->add($newRoute);
        
    //     // Replace the route collection
    //     Route::setRoutes($newRoutes);
    // }
}
