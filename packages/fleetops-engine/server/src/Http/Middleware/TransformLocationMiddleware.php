<?php

namespace Fleetbase\FleetOps\Http\Middleware;

/**
 * Middleware to transform the "location" property to a default value if it is null, even if it is nested within other objects.
 *
 * Class TransformLocationMiddleware
 */
class TransformLocationMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param Request $request
     * @param Closure $next
     */
    public function handle($request, \Closure $next)
    {
        $data = $request->all();
        $data = $this->transformNestedLocation($data);
        $request->replace($data);

        return $next($request);
    }

    /**
     * Recursively transform the "location" property within nested objects to a default value if it is null.
     *
     * @param array $data the data to process
     *
     * @return array the transformed data
     */
    protected function transformNestedLocation($data)
    {
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                // If the value is a valid coordinates type, recursively transform it
                $data[$key] = $this->transformNestedLocation($value);
            } elseif ($key === 'location' && $value === null) {
                // Transform the 'location' property if it's null
                $data[$key] = [0, 0];
            }
        }

        return $data;
    }
}
