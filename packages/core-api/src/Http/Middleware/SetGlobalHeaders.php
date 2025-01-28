<?php

namespace Fleetbase\Http\Middleware;

use Fleetbase\Traits\CustomMiddleware;

class SetGlobalHeaders
{
    use CustomMiddleware;

    /**
     * Handle an incoming request.
     *
     * @param \Illuminate\Http\Request $request
     */
    public function handle($request, \Closure $next)
    {
        $response = $next($request);

        if ($this->inExceptArray($request)) {
            return $response;
        }

        $response->header('X-Frame-Options', 'DENY');

        return $response;
    }
}
