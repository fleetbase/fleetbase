<?php

namespace Fleetbase\Http\Middleware;

use Fleetbase\Support\Auth;

class SetSandboxSession
{
    /**
     * Handle an incoming request.
     *
     * @param \Illuminate\Http\Request $request
     */
    public function handle($request, \Closure $next)
    {
        Auth::setSandboxSession($request);

        return $next($request);
    }
}
