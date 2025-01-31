<?php

namespace Fleetbase\Support;

use Fleetbase\Http\Filter\Filter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class Resolve
{
    /**
     * Resolves and instantiates the HTTP resource associated with a given model.
     * This method attempts to find an appropriate resource class based on the provided model,
     * its namespace, and the API version. If the model is specified as a class name string,
     * it first attempts to instantiate it.
     *
     * @param Model|string $model     the model instance or class name to resolve the resource for
     * @param string|null  $namespace Optional. The namespace within which to search for the resource.
     * @param int|null     $version   Optional. The API version to consider when resolving the resource.
     *
     * @return JsonResource returns an instantiated resource object based on the resolved resource class
     *
     * @throws \Exception if the provided value does not resolve to a valid Model instance
     */
    public static function httpResourceForModel($model, ?string $namespace = null, ?int $version = 1): JsonResource
    {
        if (Utils::classExists($model)) {
            $model = static::instance($model);
        }

        if (!$model instanceof Model) {
            throw new \Exception('Invalid model to resolve resource for!');
        }

        $resourceNamespace = Find::httpResourceForModel($model, $namespace, $version);

        return new $resourceNamespace($model);
    }

    /**
     * Resolves and creates an instance of the HTTP request class associated with a specific model.
     * Similar to httpResourceForModel, this method dynamically finds the request class based on
     * the model's type, namespace, and version. It also handles model instantiation if given a class name.
     *
     * @param Model|string $model     the model instance or class name to resolve the request for
     * @param string|null  $namespace Optional. The namespace to search within for the request class.
     * @param int|null     $version   Optional. The API version to use for finding the request class.
     *
     * @return FormRequest returns an instantiated HTTP request object from the resolved class
     *
     * @throws \Exception if the model cannot be resolved to a Model instance
     */
    public static function httpRequestForModel($model, ?string $namespace = null, ?int $version = 1): FormRequest
    {
        if (Utils::classExists($model)) {
            $model = static::instance($model);
        }

        if (!$model instanceof Model) {
            throw new \Exception('Invalid model to resolve request for!');
        }

        $requestNamespace = Find::httpRequestForModel($model, $namespace, $version);

        return new $requestNamespace();
    }

    /**
     * Resolves and creates an instance of a filter class for a specific model and HTTP request.
     * It uses the Find class to determine the correct filter class based on the model and potentially
     * the request details.
     *
     * @param Model    $model   the model instance for which the filter is being resolved
     * @param Request  $request the HTTP request instance that may influence the filtering logic
     * @param int|null $version Optional. API version to consider when resolving the filter.
     *
     * @return Filter|null returns the instantiated filter object if the class exists, otherwise null
     */
    public static function httpFilterForModel(Model $model, Request $request, ?int $version = 1): ?Filter
    {
        $filterNamespace = Find::httpFilterForModel($model);

        if ($filterNamespace) {
            return new $filterNamespace($request);
        }

        return null;
    }

    /**
     * Dynamically resolves and instantiates a resource based on a polymorphic type identifier and ID.
     * This method is useful for cases where the type of the model might vary and is determined at runtime.
     * It can use a default or specified resource class if provided.
     *
     * @param string      $type          the class name of the model
     * @param string|int  $id            the primary key ID of the model instance
     * @param string|null $resourceClass Optional. The resource class to instantiate if not dynamically determined.
     *
     * @return JsonResource|null returns an instantiated resource object if the model and resource class are valid, otherwise null
     */
    public static function resourceForMorph($type, $id, $resourceClass = null): ?JsonResource
    {
        if (empty($type) || empty($id)) {
            return null;
        }

        $instance = null;

        if (Utils::classExists($type)) {
            $instance = static::instance($type);

            if ($instance instanceof Model) {
                $instance = $instance->where($instance->getQualifiedKeyName(), $id)->first();
            }
        }

        if ($instance) {
            if (Utils::classExists($resourceClass)) {
                $resource = new $resourceClass($instance);
            } else {
                $resource = Find::httpResourceForModel($instance);
            }

            return new $resource($instance);
        }

        return null;
    }

    /**
     * Instantiates an object of the given class with optional constructor arguments.
     * This method uses reflection to create the instance, providing a fallback to the Laravel service container
     * if reflection fails.
     *
     * @param string|object $class the class name or existing object to instantiate
     * @param array         $args  Optional. Arguments to pass to the class constructor.
     *
     * @return Model|null returns the instantiated Eloquent model if possible, otherwise null
     *
     * @throws \ReflectionException if reflection fails and the class cannot be instantiated
     */
    public static function instance($class, $args = []): ?Model
    {
        if (is_object($class) === false && is_string($class) === false) {
            return null;
        }

        $instance = null;

        try {
            $instance = (new \ReflectionClass($class))->newInstance(...$args);
        } catch (\ReflectionException $e) {
            $instance = app($class);
        }

        return $instance;
    }
}
