<?php

namespace Fleetbase\Expansions;

use Fleetbase\Build\Expansion;
use Fleetbase\Support\Auth;
use Fleetbase\Support\Http;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class Builder implements Expansion
{
    /**
     * Get the target class to expand.
     *
     * @return string|Class
     */
    public static function target()
    {
        return \Illuminate\Database\Eloquent\Builder::class;
    }

    /**
     * Adds a universal query scope `searchWhere` which performs a case insensitive like on a column.
     * If `$strict` is true, then it will use a classic `where()` on the column.
     *
     * @return void
     */
    public function searchWhere()
    {
        return function ($column, $search, $strict = false) {
            /* @var \Illuminate\Database\Eloquent\Builder $this */
            if (is_array($column)) {
                return $this->where(
                    function ($query) use ($column, $search, $strict) {
                        if ($strict === true) {
                            foreach ($column as $c) {
                                $query->orWhere($c, $search);
                            }
                        } else {
                            foreach ($column as $c) {
                                $query->orWhere(DB::raw("lower($c)"), 'like', '%' . str_replace('.', '%', str_replace(',', '%', $search)) . '%');
                            }
                        }
                    }
                );
            }

            if ($strict === true) {
                return $this->where($column, $search);
            }

            return $this->where(DB::raw("lower($column)"), 'like', '%' . str_replace('.', '%', str_replace(',', '%', $search)) . '%');
        };
    }

    /**
     * Removes a where clause by column and value.
     *
     * Example:
     *      $query->removeWhereFromQuery('status', 'active');
     *      will remove any query = $query->where('status', 'active');
     *
     * @return void
     */
    public function removeWhereFromQuery()
    {
        return function (string $column, $value, string $operator = '=', string $type = 'Basic') {
            /** @var \Illuminate\Database\Eloquent\Builder $this */
            $underlyingQuery = $this->getQuery();
            $wheres          = $underlyingQuery->wheres;
            $bindings        = $underlyingQuery->bindings['where'];

            // find key to remove based on where clause match
            $removeKey = Arr::search(
                $wheres,
                function ($where) use ($column, $value, $operator, $type) {
                    $isColumn   = data_get($where, 'column') === $column;
                    $isValue    = data_get($where, 'value') === $value;
                    $isOperator = data_get($where, 'operator') === $operator;
                    $isType     = data_get($where, 'type') === $type;

                    return $isColumn && $isValue && $isOperator && $isType;
                }
            );

            // remove using key found
            if (is_int($removeKey)) {
                unset($wheres[$removeKey]);
                unset($bindings[$removeKey]);
            }

            $underlyingQuery->wheres            = $wheres;
            $underlyingQuery->bindings['where'] = $bindings;

            return $this;
        };
    }

    /**
     * Extends the Eloquent query builder to apply sorting based on the request parameters.
     * It supports various formats of sorting parameters:
     * - 'latest' and 'oldest' for sorting by creation date.
     * - 'distance' for a custom sort by distance (requires orderByDistance method on the model).
     * - Standard sorting with a single column or multiple columns, with optional descending order prefix '-'.
     * - Column sorting with a specific direction using ':' (e.g., 'column:asc').
     *
     * Usage:
     * Call this method on your Eloquent builder instance and pass the request object.
     * The method reads the 'sort' parameter from the request and applies the corresponding sortings.
     * Example:
     *   YourModel::query()->applySortFromRequest()->get();
     *
     * @return \Illuminate\Database\Eloquent\Builder the builder instance with applied sorting
     *
     * @example
     * // URL: /your-route?sort=latest,-price
     * // This will apply the 'latest' sort and then sort by 'price' in descending order.
     *
     * @throws \Exception if the sorting column is not valid
     */
    public function applySortFromRequest()
    {
        return function ($request) {
            /** @var \Illuminate\Database\Eloquent\Builder $this */
            $sorts = $request->or(['sort', 'nestedSort'], '-created_at');
            $sorts = $sorts ? explode(',', $sorts) : null;

            if (!$sorts) {
                return $this;
            }

            // get the current model
            $model = $this->getModel();

            foreach ($sorts as $sort) {
                if (Schema::hasColumn($model->table, $model->getCreatedAtColumn())) {
                    if (strtolower($sort) == 'latest') {
                        $this->latest();
                        continue;
                    }

                    if (strtolower($sort) == 'oldest') {
                        $this->oldest();
                        continue;
                    }
                }

                if (strtolower($sort) == 'distance') {
                    $this->orderByDistance();
                    continue;
                }

                if (is_array($sort) || Str::contains($sort, ',')) {
                    $columns = !is_array($sort) ? explode(',', $sort) : $sort;

                    foreach ($columns as $column) {
                        if (Str::startsWith($column, '-')) {
                            $direction = Str::startsWith($column, '-') ? 'desc' : 'asc';
                            $param     = Str::startsWith($column, '-') ? substr($column, 1) : $column;

                            $this->orderBy($column, $direction);
                            continue;
                        }

                        $sd = explode(':', $column);
                        if ($sd && count($sd) > 0) {
                            count($sd) == 2
                                ? $this->orderBy(trim($sd[0]), trim($sd[1]))
                                : $this->orderBy(trim($sd[0]), 'asc');
                        }
                    }
                }

                if (Str::startsWith($sort, '-')) {
                    list($param, $direction) = Http::useSort($sort);

                    $this->orderBy($param, $direction);
                    continue;
                }

                list($param, $direction) = Http::useSort($sort);
                $this->orderBy($param, $direction);
            }

            return $this;
        };
    }

    /**
     * Macro to apply directives to the query builder instance based on the current authenticated user's permissions.
     *
     * This macro allows directives to be automatically applied to a query builder instance. When invoked,
     * it retrieves the appropriate directives based on the current authenticated user's context and permissions,
     * and applies them to the query. This is particularly useful for dynamically enforcing permission-based
     * constraints on queries within your application.
     *
     * @return \Illuminate\Database\Eloquent\Builder the query builder instance with the applied directives
     */
    public function applyDirectives()
    {
        return function () {
            /** @var \Illuminate\Database\Eloquent\Builder $this */
            return Auth::applyDirectivesToQuery($this);
        };
    }

    /**
     * Macro to apply directives to the query builder based on specific permissions.
     *
     * This macro retrieves directives associated with the given permission names and applies
     * them to the query builder instance. It allows for dynamically enforcing permission-based
     * constraints on queries, tailored to the specific permissions provided.
     *
     * @return \Illuminate\Database\Eloquent\Builder the query builder instance with the applied directives
     */
    public function applyDirectivesForPermissions()
    {
        return function (string|array $names = []) {
            /** @var \Illuminate\Database\Eloquent\Builder $this */
            $names      = is_string($names) ? [$names] : $names;
            $directives = Auth::getDirectivesForPermissions($names);
            foreach ($directives as $directive) {
                $directive->apply($this);
            }

            return $this;
        };
    }
}
