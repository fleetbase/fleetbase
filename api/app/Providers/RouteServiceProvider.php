<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ActivityReportController;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * Define your route model bindings, pattern filters, etc.
     *
     * @return void
     */
    public function boot()
    {
        $this->routes(
            function () {
                Route::get(
                    '/health',
                    function (Request $request) {
                        return response()->json(
                            [
                                'status' => 'ok',
                                'time' => microtime(true) - $request->attributes->get('request_start_time')
                            ]
                        );
                    }
                );

                // Ruta para manejar verificación de 2FA
                Route::get(
                    '/int/v1/two-fa/check',
                    function (Request $request) {
                        return response()->json([
                            'isTwoFaEnabled' => false,
                            'twoFaSession' => null
                        ]);
                    }
                );

                // Ruta para reportes de actividades por sección (LIPU-101)
                Route::get(
                    '/int/v1/activity/reports-by-section',
                    [ActivityReportController::class, 'reportsBySection']
                );
            }
        );
    }
}
