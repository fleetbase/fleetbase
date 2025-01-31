<?php

namespace Fleetbase\Expansions;

use Fleetbase\Build\Expansion;
use Fleetbase\Models\Company;
use Fleetbase\Models\File;
use Fleetbase\Support\ControllerResolver;
use Illuminate\Support\Str;

/**
 * Expands the Illuminate\Http\Request class with additional helper methods.
 *
 * @mixin \Illuminate\Support\Facades\Request
 */
class Request implements Expansion
{
    /**
     * Specifies the class this expansion targets.
     *
     * @return string the name of the class to expand
     */
    public static function target()
    {
        return \Illuminate\Support\Facades\Request::class;
    }

    /**
     * Retrieves the current company based on the session data.
     *
     * @return \Closure returns a closure that resolves to a Company instance or null
     */
    public function company()
    {
        return function () {
            /** @var \Illuminate\Http\Request $this */
            if ($this->session()->has('company')) {
                return Company::find($this->session()->get('company'));
            }

            return null;
        };
    }

    /**
     * Attempts to retrieve the first available parameter from a specified set.
     *
     * @return \Closure returns a closure that checks for the presence of parameters
     *                  in a specific order and returns the value of the first parameter found
     */
    public function or()
    {
        return function (array $params = [], $default = null) {
            /** @var \Illuminate\Http\Request $this */
            foreach ($params as $param) {
                if ($this->has($param)) {
                    return $this->input($param);
                }
            }

            return $default;
        };
    }

    /**
     * Converts a specified request parameter into an array by splitting it by commas.
     *
     * @return \Closure returns a closure that splits a string parameter into an array,
     *                  or directly returns the array parameter
     */
    public function array()
    {
        return function (string $param) {
            /** @var \Illuminate\Http\Request $this */
            if (is_string($this->input($param)) && Str::contains($this->input($param), ',')) {
                return explode(',', $this->input($param));
            }

            return (array) $this->input($param, []);
        };
    }

    /**
     * Checks if a specified parameter is a string.
     *
     * @return \Closure returns a closure that determines if a parameter is a string
     */
    public function isString()
    {
        return function ($param) {
            /** @var \Illuminate\Http\Request $this */
            return $this->has($param) && is_string($this->input($param));
        };
    }

    /**
     * Checks if a specified parameter is an valid UUID.
     *
     * @return \Closure returns a closure that determines if a parameter is an array
     */
    public function isUuid()
    {
        return function ($param) {
            /** @var \Illuminate\Http\Request $this */
            return !empty($param) && $this->has($param) && Str::isUuid($this->input($param));
        };
    }

    /**
     * Checks if a specified parameter is an array.
     *
     * @return \Closure returns a closure that determines if a parameter is an array
     */
    public function isArray()
    {
        return function ($param) {
            /** @var \Illuminate\Http\Request $this */
            return !empty($param) && $this->has($param) && is_array($this->input($param));
        };
    }

    /**
     * Checks if a specific value exists within an array parameter.
     *
     * @return \Closure returns a closure that checks if a value is present in an array parameter
     */
    public function inArray()
    {
        return function ($param, $needle) {
            /** @var \Illuminate\Http\Request $this */
            $haystack = (array) $this->input($param, []);

            if (is_array($haystack)) {
                return in_array($needle, $haystack);
            }

            return false;
        };
    }

    /**
     * Retrieves an integer value from a specified request parameter.
     *
     * @return \Closure returns a closure that fetches an integer from the request
     */
    public function integer()
    {
        return function (string $key, $default = 0) {
            /** @var \Illuminate\Http\Request $this */
            return intval($this->input($key, $default));
        };
    }

    /**
     * Removes a specified parameter from the request.
     *
     * @return \Closure returns a closure that removes a parameter from the request
     */
    public function removeParam()
    {
        return function (string $key) {
            /** @var \Illuminate\Http\Request $this */
            return $this->request->remove($key);
        };
    }

    /**
     * Retrieves the search query from the request, with prioritization over multiple possible keys.
     *
     * @return \Closure returns a closure that fetches a search query parameter, prioritizing
     *                  specific keys and handling potential casing and encoding issues
     */
    public function searchQuery()
    {
        return function () {
            /** @var \Illuminate\Http\Request $this */
            $searchQueryParam = $this->or(['query', 'searchQuery', 'nestedQuery']);

            if (is_string($searchQueryParam)) {
                return urldecode(strtolower($searchQueryParam));
            }

            return $searchQueryParam;
        };
    }

    /**
     * Fetches File models based on UUIDs provided in a specified request parameter.
     *
     * @return \Closure returns a closure that retrieves a collection of File models from UUIDs specified in the request
     */
    public function resolveFilesFromIds()
    {
        return function (string $param = 'files') {
            /** @var \Illuminate\Http\Request $this */
            return File::fromRequest($this, $param);
        };
    }

    /**
     * Retrieves all request parameters except for those related to Fleetbase's global filters.
     *
     * @return \Closure returns a closure that filters out global parameters and retrieves the rest
     */
    public function getFilters()
    {
        return function (?array $additionalFilters = []) {
            $defaultFilters = [
                'within',
                'with',
                'without',
                'without_relations',
                'coords',
                'boundary',
                'page',
                'nestedPage',
                'offset',
                'limit',
                'nestedLimit',
                'perPage',
                'per_page',
                'singleRecord',
                'single',
                'query',
                'searchQuery',
                'nestedQuery',
                'columns',
                'distinct',
                'sort',
                'nestedSort',
                'before',
                'after',
                'on',
                'global',
            ];
            $filters = is_array($additionalFilters) ? array_merge($defaultFilters, $additionalFilters) : $defaultFilters;

            /** @var \Illuminate\Http\Request $this */
            return $this->except($filters);
        };
    }

    /**
     * Get the controller instance for the route.
     *
     * @return \Closure returns a closure that filters out global parameters and retrieves the rest
     */
    public function getController()
    {
        return function () {
            /** @var \Illuminate\Http\Request $this */
            $controller = ControllerResolver::resolve($this);
            if (!$controller) {
                $controller = $this->route()->getController();
            }

            return $controller;
        };
    }
}
