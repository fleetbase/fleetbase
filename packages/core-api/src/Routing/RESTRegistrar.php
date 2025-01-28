<?php

namespace Fleetbase\Routing;

use Illuminate\Routing\ResourceRegistrar;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class RESTRegistrar extends ResourceRegistrar
{
    /**
     * The default actions for a restful controller.
     *
     * @var string[]
     */
    protected $resourceDefaults = ['query', 'find', 'create', 'update', 'delete'];

    /**
     * Build a set of prefixed resource routes.
     *
     * @param string $name
     * @param string $controller
     *
     * @return void
     */
    protected function prefixedResource($name, $controller = null, array $options)
    {
        [$name, $prefix] = $this->getResourcePrefix($name);

        // We need to extract the base resource from the resource name. Nested resources
        // are supported in the framework, but we need to know what name to use for a
        // place-holder on the route parameters, which should be the base resources.
        $callback = function ($me) use ($name, $controller, $options) {
            $me->rest($name, $controller, $options);
        };

        return $this->router->group(compact('prefix'), $callback);
    }

    /**
     * Add the query method for a resourceful route.
     *
     * @param string $name
     * @param string $id
     * @param string $controller
     * @param array  $options
     *
     * @return \Illuminate\Routing\Route
     */
    protected function addResourceQuery($name, $id, $controller, $options)
    {
        $name = $this->getShallowName($name, $options);

        $uri = $this->getResourceUri($name);

        $action = $this->getResourceAction($name, $controller, 'queryRecord', $options);

        $uniqueName = $this->getUniqueRouteName(['query', 'get'], $name, $options);

        return $this->router->get($uri, $action)->name($uniqueName);
    }

    /**
     * Add the find method for a resourceful route.
     *
     * Example: /resource/{id}
     *
     * @param string $name
     * @param string $id
     * @param string $controller
     * @param array  $options
     *
     * @return \Illuminate\Routing\Route
     */
    protected function addResourceFind($name, $id, $controller, $options)
    {
        $name = $this->getShallowName($name, $options);

        $uri = $this->getResourceUri($name) . '/{' . $id . '}';

        $action = $this->getResourceAction($name, $controller, 'findRecord', $options);

        $uniqueName = $this->getUniqueRouteName(['find', 'get'], $name, $options);

        return $this->router->get($uri, $action)->name($uniqueName);
    }

    /**
     * Add the create method for a resourceful route.
     *
     * POST /resource
     *
     * @param string $name
     * @param string $id
     * @param string $controller
     * @param array  $options
     *
     * @return \Illuminate\Routing\Route
     */
    protected function addResourceCreate($name, $id, $controller, $options)
    {
        $name = $this->getShallowName($name, $options);

        $uri = $this->getResourceUri($name);

        $action = $this->getResourceAction($name, $controller, 'createRecord', $options);

        $uniqueName = $this->getUniqueRouteName(['create', 'post'], $name, $options);

        return $this->router->post($uri, $action)->name($uniqueName);
    }

    /**
     * Add the update method for a resourceful route.
     *
     * PUT|PATCH /resource/{id}
     *
     * @param string $name
     * @param string $id
     * @param string $controller
     * @param array  $options
     *
     * @return \Illuminate\Routing\Route
     */
    protected function addResourceUpdate($name, $id, $controller, $options)
    {
        $name = $this->getShallowName($name, $options);

        $uri = $this->getResourceUri($name) . '/{' . $id . '}';

        $action = $this->getResourceAction($name, $controller, 'updateRecord', $options);

        $uniqueName = $this->getUniqueRouteName(['update', 'put.patch'], $name, $options);

        return $this->router->match(['PUT', 'PATCH'], $uri, $action)->name($uniqueName);
    }

    /**
     * Add the delete method for a resourceful route.
     *
     * DELETE /resource/{id}
     *
     * @param string $name
     * @param string $id
     * @param string $controller
     * @param array  $options
     *
     * @return \Illuminate\Routing\Route
     */
    protected function addResourceDelete($name, $id, $controller, $options)
    {
        $name = $this->getShallowName($name, $options);

        $uri = $this->getResourceUri($name) . '/{' . $id . '}';

        $action = $this->getResourceAction($name, $controller, 'deleteRecord', $options);

        $uniqueName = $this->getUniqueRouteName(['delete', 'delete'], $name, $options);

        return $this->router->delete($uri, $action)->name($uniqueName);
    }

    /**
     * Generate a unique route name based on the group namespace, base name, and additional name segments.
     *
     * This function constructs a unique route name by combining the namespace from the last group stack
     * (if available) with the specified base route name and any additional segments provided.
     * It formats the namespace as a lowercase, hyphen-separated string, which is prepended to the route name.
     *
     * This approach ensures route name uniqueness within different route groups and allows for
     * safe route caching when identical route names are used across multiple namespaces or prefixes.
     *
     * @param array  $append  Additional segments to append to the route name, often representing
     *                        specific actions (e.g., ['query', 'find']).
     * @param string $name    the base name of the route, typically representing the resource name
     * @param array  $options optional settings that may contain 'groupStack', from which the
     *                        namespace of the last group is extracted if available
     *
     * @return string a dot-separated string representing the unique route name
     */
    protected function getUniqueRouteName(array $append, string $name, array $options = []): string
    {
        $lastGroupStack          = is_array($options) && isset($options['groupStack']) ? Arr::last($options['groupStack']) : null;
        $lastGroupStackNamespace = empty($lastGroupStack) ? null : $lastGroupStack['namespace'];
        $groupPrefix             = $lastGroupStackNamespace ? strtolower(Str::replace('\\', '-', $lastGroupStackNamespace)) : null;
        $nameStack               = array_filter([$groupPrefix, $name, ...$append], fn ($segment) => !empty($segment));

        return implode('.', $nameStack);
    }
}
