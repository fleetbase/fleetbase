<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Models\Setting;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class InstallerController extends Controller
{
    /**
     * Checks to see if this is the first time Fleetbase is being used by checking if any organizations exists.
     *
     * @return \Illuminate\Http\Response
     */
    public function initialize()
    {
        $shouldInstall = false;
        $shouldOnboard = false;
        $defaultTheme  = Setting::lookup('branding.default_theme', 'dark');

        try {
            DB::connection()->getPdo();
            if (!DB::connection()->getDatabaseName()) {
                $shouldInstall = true;
            } else {
                if (Schema::hasTable('companies')) {
                    if (DB::table('companies')->count() == 0) {
                        $shouldOnboard = true;
                    }
                } else {
                    $shouldInstall = true;
                }
            }
        } catch (\Exception $e) {
            $shouldInstall = true;
        }

        return response()->json(
            [
                'shouldInstall' => $shouldInstall,
                'shouldOnboard' => $shouldOnboard,
                'defaultTheme'  => $defaultTheme,
            ]
        );
    }

    public function createDatabase()
    {
        ini_set('memory_limit', '-1');
        ini_set('max_execution_time', 0);

        Artisan::call('mysql:createdb');

        return response()->json(
            [
                'status' => 'success',
            ]
        );
    }

    public function migrate()
    {
        ini_set('memory_limit', '-1');
        ini_set('max_execution_time', 0);

        shell_exec(base_path('artisan') . ' migrate');
        Artisan::call('sandbox:migrate');

        return response()->json(
            [
                'status' => 'success',
            ]
        );
    }

    public function seed()
    {
        ini_set('memory_limit', '-1');
        ini_set('max_execution_time', 0);

        Artisan::call('fleetbase:seed');

        return response()->json(
            [
                'status' => 'success',
            ]
        );
    }
}
