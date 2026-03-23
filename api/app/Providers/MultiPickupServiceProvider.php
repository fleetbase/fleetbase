<?php

namespace App\Providers;

use App\Http\Controllers\TrackingController;
use App\MultiPickup\Support\NearbyPickupScanner;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class MultiPickupServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::prefix('api/v1')
            ->middleware('api')
            ->group(base_path('routes/multi-pickup.php'));

        Route::get('/track', [TrackingController::class, 'show'])->name('multi-pickup.track');

        $this->callAfterResolving(Schedule::class, function (Schedule $schedule) {
            $schedule->call(fn () => app(NearbyPickupScanner::class)->run())
                ->everyTwoMinutes()
                ->name('multi-pickup:scan-nearby-pickups')
                ->withoutOverlapping();
        });
    }
}
