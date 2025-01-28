<?php

namespace Fleetbase\Traits;

trait CustomMiddleware
{
    /**
     * The URIs that should be excluded from middleware handler.
     */
    protected array $except = [];

    /**
     * Determine if the HTTP request uses a ‘read’ verb.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return bool
     */
    protected function isReading($request)
    {
        return in_array($request->method(), ['HEAD', 'OPTIONS']); // removed GET
    }

    /**
     * Determine if the application is running unit tests.
     *
     * @return bool
     */
    protected function runningUnitTests()
    {
        return app()->runningInConsole() && app()->runningUnitTests();
    }

    /**
     * Determine if the request has a URI that should pass through CSRF verification.
     *
     * @param \Illuminate\Http\Request $request
     */
    protected function inExceptArray($request, ?array $exceptions = null): bool
    {
        $exceptions = $exceptions ?? $this->except;

        foreach ($exceptions as $except) {
            if ($except !== '/') {
                $except = trim($except, '/');
            }

            if ($request->fullUrlIs($except) || $request->is($except)) {
                return true;
            }
        }

        return false;
    }
}
