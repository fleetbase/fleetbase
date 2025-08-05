<?php

namespace Fleetbase\Http\Middleware;

use Illuminate\Http\Request;
use Spatie\ResponseCache\Facades\ResponseCache;

class ClearCacheAfterDelete
{
    public function handle(Request $request, \Closure $next)
    {
        // First, handle the request and obtain the response
        $response = $next($request);

        // Check if the current request method is DELETE
        if ($request->isMethod('delete')) {
            // Clear the cache after the response has been sent
            ResponseCache::clear();
        }

        $route = $request->route();

        if ($route) {
            $controller = $route->getController();

            if (property_exists($controller, 'disableResponseCache') && $controller->disableResponseCache) {
                return $next($request); // Skip caching
            }
        }
        return $response;
    }
}
