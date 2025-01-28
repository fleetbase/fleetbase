<?php

namespace Fleetbase\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Find
{
    /**
     * Dynamically determines the HTTP resource class for a given Eloquent model based on the model type,
     * optionally considering the model's namespace and API version.
     * It attempts to find a resource from a custom or default namespace and handles internal requests specifically by adjusting namespaces.
     *
     * @param Model       $model     the Eloquent model instance for which the resource class is to be found
     * @param string|null $namespace Optional. The namespace to search within, defaults to Fleetbase's HTTP resource namespace.
     * @param int         $version   Optional. API version number, defaults to 1, to support versioning in API resources.
     *
     * @return string the fully qualified class name of the resource, or a default resource class if none found
     */
    public static function httpResourceForModel(Model $model, ?string $namespace = null, ?int $version = 1): ?string
    {
        $resourceNamespace = null;
        $defaultResourceNS = '\\Fleetbase\\Http\\Resources\\';
        $baseNamespace     = $namespace ? $namespace . '\\Http\\Resources\\' : $defaultResourceNS;
        $modelName         = Utils::classBasename($model);

        if (method_exists($model, 'getResource')) {
            $resourceNamespace = $model->getResource();
        }

        if ($resourceNamespace === null) {
            $internal = Http::isInternalRequest();

            if ($internal) {
                $baseNamespace .= 'Internal\\';
            }

            $resourceNamespace = $baseNamespace . "v{$version}\\" . $modelName;

            // if internal request but no internal resource has been declared
            // fallback to the public resource
            if (!Utils::classExists($resourceNamespace)) {
                $resourceNamespace = str_replace('Internal\\', '', $resourceNamespace);
            }

            // if no versioned base resource fallback to base namespace for resource
            if (!Utils::classExists($resourceNamespace)) {
                $resourceNamespace = str_replace("v{$version}\\", '', $resourceNamespace);
            }
        }

        try {
            if (!Utils::classExists($resourceNamespace)) {
                throw new \Exception('Missing resource');
            }
        } catch (\Error|\Exception $e) {
            $resourceNamespace = $defaultResourceNS . 'FleetbaseResource';
        }

        return $resourceNamespace;
    }

    /**
     * Resolves the HTTP request class for a specific Eloquent model, taking into account the model's namespace and API version.
     * This method provides support for finding request classes tailored to specific actions (like Create, Update) on models.
     * It handles internal requests by adapting the namespace to include internal paths and supports versioning.
     *
     * @param Model       $model     the Eloquent model instance for which the request class is to be determined
     * @param string|null $namespace Optional. The base namespace for locating the request classes, defaults to Fleetbase's HTTP requests namespace.
     * @param int         $version   Optional. Specifies the API version to support structured versioning in requests.
     *
     * @return string the fully qualified class name of the request, or a default request class if none applicable
     */
    public static function httpRequestForModel(Model $model, ?string $namespace = null, ?int $version = 1): ?string
    {
        $requestNamespace = null;
        $defaultRequestNS = '\\Fleetbase\\Http\\Requests\\';
        $requestNS        = $baseNamespace = $namespace ? $namespace . '\\Http\\Requests\\' : $defaultRequestNS;
        $modelName        = Utils::classBasename($model);

        if (method_exists($model, 'getRequest')) {
            $requestNamespace = $model->getRequest();
        }

        if ($requestNamespace === null) {
            $requestNamespace = $requestNS . '\\' . Str::studly(ucfirst(Http::action()) . ucfirst($modelName) . 'Request');
        }

        if (!Utils::classExists($requestNamespace)) {
            $internal = Http::isInternalRequest();

            if ($internal) {
                $baseNamespace .= 'Internal\\';
            }

            $requestNamespace = $baseNamespace . "v{$version}\\" . $modelName;

            // if internal request but no internal resource has been declared
            // fallback to the public resource
            if (!Utils::classExists($requestNamespace)) {
                $requestNamespace = str_replace('Internal\\', '', $requestNamespace);
            }

            // if no versioned base resource fallback to base namespace for resource
            if (!Utils::classExists($requestNamespace)) {
                $requestNamespace = str_replace("v{$version}\\", '', $requestNamespace);
            }
        }

        try {
            if (!Utils::classExists($requestNamespace)) {
                throw new \Exception('Missing resource');
            }
        } catch (\Error|\Exception $e) {
            $requestNamespace = $defaultRequestNS . 'FleetbaseRequest';
        }

        return $requestNamespace;
    }

    /**
     * Retrieves the HTTP filter class associated with a specific Eloquent model. This function considers the model's namespace,
     * versioning, and whether the request is internal to decide the appropriate filter class.
     * The method uses a default or provided namespace and adapts it based on internal request checks and versioning needs.
     *
     * @param Model       $model     the Eloquent model instance whose filter class is being determined
     * @param string|null $namespace Optional. A custom base namespace for filter classes, otherwise defaulting to a calculated namespace based on the model's path.
     * @param int         $version   Optional. The version of the API for which the filter is being sought, affecting the namespace structure.
     *
     * @return string|null the fully qualified class name of the filter, or null if no appropriate class exists
     */
    public static function httpFilterForModel(Model $model, ?string $namespace = null, ?int $version = 1): ?string
    {
        $namespaceSegments = explode('Models', get_class($model));
        $baseNS            = '\\' . rtrim($namespaceSegments[0], '\\');
        $filterNamespace   = null;
        $defaultFilterNS   = $baseNS . '\\Http\\Filter\\';
        $filterNs          = $namespace ? $namespace . '\\Http\\Filter\\' : $defaultFilterNS;
        $modelName         = Utils::classBasename($model);

        if (method_exists($model, 'getFilter')) {
            $filterNamespace = $model->getFilter();
        }

        if ($filterNamespace === null) {
            $filterNamespace = $filterNs . Str::studly(ucfirst($modelName) . 'Filter');
        }

        if (Utils::classExists($filterNamespace)) {
            return $filterNamespace;
        } else {
            $internal = Http::isInternalRequest();

            $baseNamespace = $filterNs;
            if ($internal) {
                $baseNamespace = $filterNs . 'Internal\\';
            }

            $filterNamespace = $baseNamespace . "v{$version}\\" . $modelName;

            // if internal request but no internal resource has been declared
            // fallback to the public resource
            if (!Utils::classExists($filterNamespace)) {
                $filterNamespace = str_replace('Internal\\', '', $filterNamespace);
            }

            // if no versioned base resource fallback to base namespace for resource
            if (!Utils::classExists($filterNamespace)) {
                $filterNamespace = str_replace("v{$version}\\", '', $filterNamespace);
            }
        }

        if (Utils::classExists($filterNamespace)) {
            return $filterNamespace;
        }

        return null;
    }
}
