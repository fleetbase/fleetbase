<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use App\Http\Resources\FuelReport as FuelReportResource;
use Fleetbase\FleetOps\Http\Resources\v1\FuelReport as BaseFuelReportResource;
use App\Models\FuelReport as FuelReportModel;
use Fleetbase\FleetOps\Models\FuelReport as BaseFuelReportModel;
use Fleetbase\FleetOps\Http\Middleware\TransformLocationMiddleware;
use App\Http\Controllers\Api\v1\LeaveRequestController;

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
                        //language routes
                    Route::get('/languages', 'App\Http\Controllers\Api\v1\LanguageController@index')
                        ->name('languages.index');
                    Route::prefix('drivers')->group(function () {
                        Route::post('/login-with-sms', 'App\Http\Controllers\Api\v1\DriverController@loginWithPhone')
                            ->name('drivers.login-with-sms');
                        Route::post('/verify-code', 'App\Http\Controllers\Api\v1\DriverController@verifyCode')
                            ->name('drivers.verify-code');
                    });
                   
                    
                    Route::middleware(['fleetbase.api', TransformLocationMiddleware::class])
                    ->group(function () {
                        Route::prefix('expense-reports')->group(function () {
                            Route::post('/', 'App\Http\Controllers\Api\v1\ExpenseReportController@create')
                                ->name('expense-reports.create');
                            Route::get('/', 'App\Http\Controllers\Api\v1\ExpenseReportController@list')
                                ->name('expense-reports.list');
                            Route::delete('/{id}', 'App\Http\Controllers\Api\v1\ExpenseReportController@delete')
                                ->name('expense-reports.delete');
                            Route::put('/{id}', 'App\Http\Controllers\Api\v1\ExpenseReportController@update')
                                ->name('expense-reports.update');
                        });
                        
                        Route::prefix('parking-areas')->group(function () {
                            Route::get('/create', 'App\Http\Controllers\Api\v1\ParkingAreaController@insert')
                                ->name('parking-areas.create');
                            Route::post('/', 'App\Http\Controllers\Api\v1\ParkingAreaController@nearest')
                                ->name('parking-areas');
                            Route::get('/list', 'App\Http\Controllers\Api\v1\ParkingAreaController@list')
                                ->name('parking-areas.list');
                        });

                        Route::post('/orders/{id}/start', 'App\Http\Controllers\Api\v1\CustomOrderController@driverAcceptance')
                            ->name('orders.driverAcceptance');
                        Route::post('/orders/{id}/update-activity', 'App\Http\Controllers\Api\v1\CustomOrderController@driverActivity')
                            ->name('orders.driverActivity');
                            
                        Route::middleware('auth:sanctum')->group(function () {
                            Route::prefix('leave-requests')->group(function () {
                                Route::post('/create', 'App\Http\Controllers\Api\v1\LeaveRequestController@store')
                                    ->name('leave-requests.create');
                                Route::put('/{id}', 'App\Http\Controllers\Api\v1\LeaveRequestController@update')
                                    ->name('leave-requests.update');
                                Route::get('/list', 'App\Http\Controllers\Api\v1\LeaveRequestController@list')
                                    ->name('leave-requests.list');
                                Route::delete('/{id}', 'App\Http\Controllers\Api\v1\LeaveRequestController@destroy')
                                    ->name('leave-requests.destroy');
                            });
                        });
                    });
                    
                    // Shift assignment routes with appropriate middleware
                    Route::middleware(['fleetbase.api', TransformLocationMiddleware::class])
                        ->prefix('shift-assignments')
                        ->group(function () {
                            // Public data endpoint (no additional auth middleware)
                            Route::get('/data', 'App\Http\Controllers\Api\v1\ShiftAssignmentController@getShiftAssignmentData')
                                ->name('shift-assignments.data');
                                
                            // Protected endpoints (with auth middleware)
                            Route::get('/current-week', 'App\Http\Controllers\Api\v1\ShiftAssignmentController@getCurrentWeekData')
                                ->name('shift-assignments.current-week');
                                
                            Route::get('/next-week', 'App\Http\Controllers\Api\v1\ShiftAssignmentController@getNextWeekData')
                                ->name('shift-assignments.next-week');
                                
                            Route::get('/available-drivers', 'App\Http\Controllers\Api\v1\ShiftAssignmentController@getAvailableDrivers')
                                ->name('shift-assignments.available-drivers');
                        });
                });
            });
    }
}
