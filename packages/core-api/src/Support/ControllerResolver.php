<?php

namespace Fleetbase\Support;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * Resolves a controller instance from a given request.
 *
 * This class provides a way to resolve a controller instance from a request,
 * which can be useful for resolving permissions, handling requests, and more.
 */
class ControllerResolver
{
    /**
     * Resolves a controller instance from a given request.
     *
     * This method takes a request object and returns the corresponding controller
     * instance. The controller instance is resolved by extracting the controller
     * namespace from the request route and instantiating it using the app container.
     *
     * @param Request $request The request object
     *
     * @return Controller|null The resolved controller instance
     */
    public function resolveController(Request $request): ?Controller
    {
        return $request->route()->controller;
    }

    /**
     * Retrieves the fully qualified namespace of the controller from the given request.
     *
     * This method extracts the controller's namespace from the route associated with the request.
     * The controller's namespace is determined by parsing the 'controller' action from the route,
     * which typically includes both the fully qualified class name and the method (e.g.,
     * 'Fleetbase\Http\Controllers\MyController@method'). This function returns only the class namespace.
     *
     * @param Request $request the HTTP request object from which the route is extracted
     *
     * @return string the fully qualified namespace of the controller class
     */
    public static function getControllerNamespace(Request $request): string
    {
        $route                        = $request->route();
        $controllerActionNamespace    = $route->getAction('controller');
        [$controllerNamespace]        = explode('@', $controllerActionNamespace);

        return $controllerNamespace;
    }

    /**
     * Resolves a controller instance from a given request using a static instance.
     *
     * This method is a static wrapper around the `resolveController` method, which
     * allows for resolving a controller instance without having to instantiate
     * the `ControllerResolver` class.
     *
     * @param Request $request The request object
     *
     * @return Controller The resolved controller instance
     */
    public static function resolve(Request $request): Controller
    {
        return app(static::class)->resolveController($request);
    }

    /**
     * Checks if a controller method has a specific attribute.
     *
     * This function resolves the controller instance and method from the given request,
     * and then checks if the method has an attribute with the given name.
     *
     * @param Request $request   The request object
     * @param string  $attribute The fully qualified class name of the attribute to check for
     *
     * @return bool True if the method has the attribute, false otherwise
     */
    public static function methodHasAttribute(Request $request, $attribute): bool
    {
        $controllerNamespace = static::getControllerNamespace($request);
        $method              = $request->route()->getActionMethod();
        $reflectionMethod    = new \ReflectionMethod($controllerNamespace, $method);
        $attributes          = $reflectionMethod->getAttributes();

        $skipAuthorizationCheck = false;
        foreach ($attributes as $attr) {
            if ($attr->getName() === $attribute) {
                $skipAuthorizationCheck = true;
                break;
            }
        }

        return $skipAuthorizationCheck;
    }
}
