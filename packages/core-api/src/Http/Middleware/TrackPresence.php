<?php

namespace Fleetbase\Http\Middleware;

class TrackPresence
{
    /**
     * Handle an incoming request.
     *
     * @param \Illuminate\Http\Request $request
     */
    public function handle($request, \Closure $next)
    {
        if ($user = $request->user()) {
            $user->rememberPresence();
        }

        return $next($request);
    }
}
