<?php

namespace Fleetbase\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

class Controller extends BaseController
{
    use AuthorizesRequests;
    use DispatchesJobs;
    use ValidatesRequests;

    /**
     * Welcome message only.
     */
    public function hello()
    {
        return response()->json(
            [
                'message' => 'Fleetbase API',
                'version' => config('fleetbase.api.version'),
            ]
        );
    }

    /**
     * Response time only.
     */
    public function time()
    {
        return response()->json(
            [
                'ms' => microtime(true) - LARAVEL_START,
            ]
        );
    }

    /**
     * Use this route for arbitrary testing.
     */
    public function test()
    {
        return response()->json(['status' => 'ok']);
    }
}
