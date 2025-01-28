<?php

namespace Fleetbase\Support;

use Fleetbase\Contracts\Directive;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;

class DirectiveParser
{
    /**
     * Apply a single directive to the Eloquent query builder.
     */
    public static function apply(Builder $query, array $directive): Builder
    {
        return (new self())->applyDirective($query, $directive);
    }

    /**
     * Apply a single directive to the Eloquent query builder.
     */
    public function applyDirective(Builder $query, array $directive): Builder
    {
        $method = array_shift($directive); // Extract the Eloquent method (e.g., 'where', 'whereHas')

        // Run directive classes
        if (Str::containsAll($method, ['Directive', '\\'])) {
            $directiveInstance = app($method);
            if ($directiveInstance instanceof Directive) {
                return app($method)->apply($query);
            }
        }

        // Special handling for 'whereHas' and similar methods requiring a closure
        if ($method === 'whereHas' || $method === 'orWhereHas') {
            $relation = array_shift($directive);
            $query    = $query->$method($relation, function (Builder $query) use ($directive, $relation) {
                $qualifiedDirective = $this->qualifyDirective($directive, $relation);
                $this->applyDirective($query, $qualifiedDirective);
            });
        } else {
            $parameters = $this->parseParameters($directive);
            if (method_exists($query, $method)) {
                $query = $query->$method(...$parameters);
            }
        }

        return $query;
    }

    /**
     * Qualify the columns in the directive to avoid ambiguity.
     */
    protected function qualifyDirective(array $directive, string $relation): array
    {
        return array_map(function ($item) use ($relation) {
            if (is_string($item) && strpos($item, '.') === false) {
                // Qualify the column with the relation name if it's a column name without qualification
                return "{$relation}.{$item}";
            }

            return $item;
        }, $directive);
    }

    /**
     * Parse parameters and replace placeholders with actual values.
     */
    protected function parseParameters(array $parameters): array
    {
        return array_map(function ($parameter) {
            if (is_string($parameter)) {
                if (strpos($parameter, 'session.') === 0) {
                    $sessionKey = str_replace('session.', '', $parameter);

                    return Session::get($sessionKey);
                }

                if (strpos($parameter, 'self.') === 0) {
                    $attributeKey = str_replace('self.', '', $parameter);

                    return Auth::user()->{$attributeKey};
                }
            }

            return $parameter;
        }, $parameters);
    }
}
