<?php

namespace Fleetbase\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Maps controller actions to permission actions based on the request method.
 *
 * This class provides a way to map controller actions to permission actions
 * based on the request method. It uses two maps: one for mapping controller
 * actions to permission actions, and another for mapping HTTP methods to
 * permission actions.
 */
class ActionMapper
{
    /**
     * Map of controller actions to permission actions.
     *
     * @var array
     */
    private const ACTION_MAP = [
        'createRecord'   => 'create',
        'updateRecord'   => 'update',
        'deleteRecord'   => 'delete',
        'findRecord'     => 'view',
        'queryRecord'    => 'list',
        'searchRecords'  => 'list',
        'search'         => 'list',
    ];

    /**
     * Map of HTTP methods to permission actions.
     *
     * @var array
     */
    private const METHOD_MAP = [
        'POST'   => 'create',
        'PUT'    => 'update',
        'PATCH'  => 'update',
        'DELETE' => 'delete',
        'GET'    => 'view',
    ];

    public static function getActionViaSchemaResource(string $resource, string $method): ?string
    {
        $additionalAbilities = ['assign', 'remove'];
        $methodAction        = Utils::slugify($method);
        $schemas             = Utils::getAuthSchemas();
        foreach ($schemas as $schema) {
            $resources   = $schema->resources ?? [];
            foreach ($resources as $resourceArray) {
                if (data_get($resourceArray, 'name') === $resource) {
                    $actions = data_get($resourceArray, 'actions', []);
                    if (in_array($method, $actions) || in_array($methodAction, $actions)) {
                        return $method;
                    }

                    foreach ($additionalAbilities as $additionalAbility) {
                        if (Str::startsWith($methodAction, $additionalAbility)) {
                            foreach ($actions as $action) {
                                if (Str::startsWith($action, $methodAction)) {
                                    return $action;
                                }
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Maps a controller action to a permission action based on the request method.
     *
     * This method takes a controller action and a request method, and returns the
     * corresponding permission action. If the controller action is found in the
     * ACTION_MAP, it returns the mapped permission action. Otherwise, it returns
     * the mapped permission action from the METHOD_MAP.
     *
     * @param string $method        The controller action
     * @param string $requestMethod The request method
     *
     * @return string|null The mapped permission action, or null if not found
     */
    public function mapAction(string $method, string $requestMethod, ?string $resource = null): ?string
    {
        $action = self::ACTION_MAP[$method] ?? null;

        // Attempt to get action from resource schema
        if (!$action && $resource) {
            $action = static::getActionViaSchemaResource($resource, $method);
        }

        return $action ?? self::METHOD_MAP[$requestMethod];
    }

    /**
     * Maps a controller action to a permission action based on the request method using a static instance.
     *
     * This method is a static wrapper around the `mapAction` method, which allows
     * for mapping a controller action to a permission action without having to
     * instantiate the `ActionMapper` class.
     *
     * @param string $method        The controller action
     * @param string $requestMethod The request method
     *
     * @return string|null The mapped permission action, or null if not found
     */
    public static function getAction(string $method, string $requestMethod, ?string $resource = null): ?string
    {
        print_r($method);
        return app(static::class)->mapAction($method, $requestMethod, $resource);
    }

    /**
     * Maps a controller action to a permission action based on the request method from a request object.
     *
     * This method takes a request object, extracts the controller action and request
     * method, and returns the corresponding permission action using the `getAction`
     * method.
     *
     * @param Request $request The request object
     *
     * @return string|null The mapped permission action, or null if not found
     */
    public static function getFromRequest(Request $request, ?string $resource = null): ?string
    {
        $route               = $request->route();
        $controllerNamespace = $route->getAction('controller');
        [, $method]          = explode('@', $controllerNamespace);
        return static::getAction($method, $request->method(), $resource);
    }

    /**
     * Resolves a permission action from a request object.
     *
     * This method is a static wrapper around the `getFromRequest` method, which
     * allows for resolving a permission action from a request object without
     * having to instantiate the `ActionMapper` class.
     *
     * @param Request $request The request object
     *
     * @return string|null The resolved permission action, or null if not found
     */
    private static $resolved = false;

    public static function resolve(Request $request, ?string $resource = null): ?string
    {
        if (self::$resolved) {
            return null; // skip duplicate
        }
        self::$resolved = true;

        return static::getFromRequest($request, $resource);
    }

}
