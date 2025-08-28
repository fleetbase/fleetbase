<?php

namespace Fleetbase\Traits;

use Fleetbase\Support\Auth;
use Fleetbase\Support\Http;
use Fleetbase\Support\QueryOptimizer;
use Fleetbase\Support\Resolve;
use Fleetbase\Support\Utils;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Adds API Model Behavior.
 */
trait HasApiModelBehavior
{
    /**
     * The name of the database column used to store the public ID for this model.
     *
     * @var string
     */
    public static $publicIdColumn = 'public_id';

    /**
     * Get the fully qualified name of the database column used to store the public ID for this model.
     *
     * @return string the fully qualified name of the public ID column
     */
    public function getQualifiedPublicId()
    {
        return static::$publicIdColumn;
    }

    /**
     * Get the plural name of this model, either from the `pluralName` property or by inflecting the table name.
     *
     * @return string the plural name of this model
     */
    public function getPluralName(): string
    {
        if (isset($this->pluralName)) {
            return $this->pluralName;
        }

        if (isset($this->payloadKey)) {
            return Str::plural($this->payloadKey);
        }

        return Str::plural($this->getTable());
    }

    /**
     * Get the singular name of this model, either from the `singularName` property or by inflecting the table name.
     *
     * @return string the singular name of this model
     */
    public function getSingularName(): string
    {
        if (isset($this->singularName)) {
            return $this->singularName;
        }

        if (isset($this->payloadKey)) {
            return Str::singular($this->payloadKey);
        }

        return Str::singular($this->getTable());
    }

    /**
     * Returns a list of fields that can be searched / filtered by. This includes
     * all fillable columns, the primary key column, and the created_at
     * and updated_at columns.
     *
     * @return array
     */
    public function searcheableFields()
    {
        if ($this->searchableColumns) {
            return $this->searchableColumns;
        }

        return array_merge(
            $this->fillable,
            [
                $this->getKeyName(),
                $this->getCreatedAtColumn(),
                $this->getUpdatedAtColumn(),
            ]
        );
    }

    /**
     * Retrieves all records based on request data passed in.
     *
     * @param Request       $request       the HTTP request containing the input data
     * @param \Closure|null $queryCallback optional callback to modify data with Request and QueryBuilder instance
     *
     * @return \Illuminate\Database\Eloquent\Collection|\Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function queryFromRequest(Request $request, ?\Closure $queryCallback = null)
    {
        $limit   = $request->integer('limit', 30);
        $columns = $request->input('columns', ['*']);

        /**
         * @var \Illuminate\Database\Query\Builder $builder
         */
        $builder = $this->searchBuilder($request, $columns);

        if (intval($limit) > 0) {
            $builder->limit($limit);
        }

        // if queryCallback is supplied
        if (is_callable($queryCallback)) {
            $queryCallback($builder, $request);
        }

        /* debug */
        // Utils::sqlDump($builder);

        if (Http::isInternalRequest($request)) {
            if ($limit === -1) {
                $limit = 999999999;
            }

            return $builder->fastPaginate($limit, $columns);
        }

        // get the results
        $result = $builder->get($columns);

        // mutate if mutation causing params present
        return static::mutateModelWithRequest($request, $result);
    }

    /**
     * Static alias for queryFromRequest().
     *
     * @see queryFromRequest()
     *
     * @param Request       $request       the HTTP request containing the input data
     * @param \Closure|null $queryCallback optional callback to modify data with Request and QueryBuilder instance
     *
     * @return \Illuminate\Database\Eloquent\Collection|\Illuminate\Contracts\Pagination\LengthAwarePaginator
     *
     * @static
     */
    public static function queryWithRequest(Request $request, ?\Closure $queryCallback = null)
    {
        return (new static())->queryFromRequest($request, $queryCallback);
    }

    /**
     * Create a new record in the database based on the input data in the given request.
     *
     * @param Request       $request  the HTTP request containing the input data
     * @param callable|null $onBefore an optional callback function to execute before creating the record
     * @param callable|null $onAfter  an optional callback function to execute after creating the record
     * @param array         $options  an optional array of additional options
     *
     * @return mixed the newly created record, or a JSON response if the callbacks return one
     */
    public function createRecordFromRequest($request, ?callable $onBefore = null, ?callable $onAfter = null, array $options = [])
    {
        $input = $this->getApiPayloadFromRequest($request);
        $input = $this->fillSessionAttributes($input);

        if (is_callable($onBefore)) {
            $before = $onBefore($request, $input);
            if ($before instanceof JsonResponse) {
                return $before;
            }
        }

        // Check if the Model has a custom creation method defined
        if (property_exists($this, 'creationMethod') && method_exists($this, $this->creationMethod)) {
            // Call the custom creation method
            $record = $this->{$this->creationMethod}($input);
        } else {
            // Default creation method
            $record = static::create($input);
        }

        if (isset($options['return_object']) && $options['return_object'] === true) {
            return $record;
        }

        $builder = $this->where($this->getQualifiedKeyName(), $record->getKey());
        $builder = $this->withRelationships($request, $builder);
        $builder = $this->withCounts($request, $builder);

        $record = $builder->first();

        if (is_callable($onAfter)) {
            $after = $onAfter($request, $record, $input);
            if ($after instanceof JsonResponse) {
                return $after;
            }
        }

        return static::mutateModelWithRequest($request, $record);
    }

    /**
     * Update an existing record in the database based on the input data in the given request.
     *
     * @param Request       $request  the HTTP request containing the input data
     * @param mixed         $id       the ID of the record to update
     * @param callable|null $onBefore an optional callback function to execute before updating the record
     * @param callable|null $onAfter  an optional callback function to execute after updating the record
     * @param array         $options  an optional array of additional options
     *
     * @return mixed the updated record, or a JSON response if the callbacks return one
     *
     * @throws \Symfony\Component\HttpKernel\Exception\NotFoundHttpException if the record with the given ID is not found
     * @throws \Exception                                                    if the input contains an invalid parameter that is not fillable
     */
    public function updateRecordFromRequest(Request $request, $id, ?callable $onBefore = null, ?callable $onAfter = null, array $options = [])
    {
        $builder = $this->where(function ($q) use ($id) {
            $publicIdColumn = $this->getQualifiedPublicId();

            $q->where($this->getQualifiedKeyName(), $id);
            if ($this->isColumn($publicIdColumn)) {
                $q->orWhere($publicIdColumn, $id);
            }
        });
        $builder = $this->applyDirectivesToQuery($request, $builder);
        $record  = $builder->first();

        if (!$record) {
            throw new \Exception($this->getApiHumanReadableName() . ' not found');
        }

        $input = $this->getApiPayloadFromRequest($request);
        $input = $this->fillSessionAttributes($input, [], ['updated_by_uuid']);

        if (is_callable($onBefore)) {
            $before = $onBefore($request, $record, $input);
            if ($before instanceof JsonResponse) {
                return $before;
            }
        }

        $keys = array_keys($input);

        foreach ($keys as $key) {
            if ($this->isInvalidUpdateParam($key)) {
                throw new \Exception('Invalid param "' . $key . '" in update request!');
            }
        }

        // Remove ID's and timestamps from input
        $input = Arr::except($input, ['uuid', 'public_id', 'deleted_at', 'updated_at', 'created_at']);

        try {
            $record->update($input);
        } catch (\Exception $e) {
            throw new \Exception('Failed to update ' . $this->getApiHumanReadableName());
        }

        if (isset($options['return_object']) && $options['return_object'] === true) {
            return $record;
        }

        $builder = $this->where(
            function ($q) use ($id) {
                $publicIdColumn = $this->getQualifiedPublicId();

                $q->where($this->getQualifiedKeyName(), $id);
                if ($this->isColumn($publicIdColumn)) {
                    $q->orWhere($publicIdColumn, $id);
                }
            }
        );
        $builder = $this->withRelationships($request, $builder);
        $builder = $this->withCounts($request, $builder);

        $record = $builder->first();

        if (is_callable($onAfter)) {
            $after = $onAfter($request, $record, $input);
            if ($after instanceof JsonResponse) {
                return $after;
            }
        }

        return static::mutateModelWithRequest($request, $record);
    }

    /**
     * Removes a record from the database based on the given ID.
     *
     * @param mixed $id The ID or public ID of the record to remove
     *
     * @return bool|int The number of records affected, or false if the record is not found
     *
     * @throws \Exception If there's an issue while deleting the record
     */
    public function remove($id)
    {
        $record = $this->where(function ($q) use ($id) {
            $publicIdColumn = $this->getQualifiedPublicId();

            $q->where($this->getQualifiedKeyName(), $id);
            if ($this->isColumn($publicIdColumn)) {
                $q->orWhere($publicIdColumn, $id);
            }
        });

        if (!$record) {
            return false;
        }

        try {
            return $record->delete();
        } catch (\Exception $e) {
            throw $e;
        }
    }

    /**
     * Removes multiple records from the database based on the given IDs.
     *
     * @param array $ids The array of IDs or public IDs of the records to remove
     *
     * @return bool|int The number of records affected, or false if no records are found
     *
     * @throws \Exception If there's an issue while deleting the records
     */
    public function bulkRemove($ids = [])
    {
        $records = $this->where(function ($q) use ($ids) {
            $publicIdColumn = $this->getQualifiedPublicId();

            $q->whereIn($this->getQualifiedKeyName(), $ids);
            if ($this->isColumn($publicIdColumn)) {
                $q->orWhereIn($publicIdColumn, $ids);
            }
        });

        if (!$records) {
            return false;
        }

        $count = $records->count();

        try {
            $records->delete();

            return $count;
        } catch (\Exception $e) {
            throw $e;
        }
    }

    /**
     * Mutates the given model, collection or array of results with the request.
     * Applies 'with' and 'without' parameters to the result.
     *
     * @param Request $request The request object containing the 'with' and 'without' parameters
     * @param mixed   $result  The model, collection or array of results to be mutated
     *
     * @return mixed The mutated model, collection or array of results
     */
    public static function mutateModelWithRequest(Request $request, $result)
    {
        $with    = $request->or(['with', 'expand'], []);
        $without = $request->array('without');

        // handle collection or array of results
        if (is_array($result) || $result instanceof \Illuminate\Support\Collection) {
            return collect($result)->map(
                function ($model) use ($request) {
                    return static::mutateModelWithRequest($request, $model);
                }
            );
        }

        if ($with) {
            $result->load($with);
        }

        if ($without) {
            $result->setHidden($without);
        }

        return $result;
    }

    /**
     * Fills the target array with session attributes based on the specified rules.
     * Allows to apply exceptions and only specific attributes to be filled.
     *
     * @param array $target The target array to fill with session attributes
     * @param array $except The list of attributes that should not be filled (default: [])
     * @param array $only   The list of attributes that should only be filled (default: [])
     *
     * @return array The filled target array with session attributes
     */
    public function fillSessionAttributes(?array $target = [], array $except = [], array $only = []): array
    {
        $fill       = [];
        $attributes = [
            'user_uuid'       => 'user',
            'author_uuid'     => 'user',
            'uploader_uuid'   => 'user',
            'creator_uuid'    => 'user',
            'created_by_uuid' => 'user',
            'updated_by_uuid' => 'user',
            'company_uuid'    => 'company',
        ];

        foreach ($attributes as $attr => $key) {
            if ((!empty($only) && !in_array($attr, $only)) || isset($target[$attr])) {
                continue;
            }

            if ($this->isFillable($attr) && !in_array($except, array_keys($attributes))) {
                $fill[$attr] = session($key);
            }
        }

        return array_merge($target, $fill);
    }

    /**
     * Checks if request contains relationships.
     *
     * @param \Illuminate\Database\Query\Builder $builder
     *
     * @return \Illuminate\Database\Query\Builder
     */
    public function withRelationships(Request $request, $builder)
    {
        $with    = $request->or(['with', 'expand']);
        $without = $request->array('without', []);

        if (!$with && !$without) {
            return $builder;
        }

        $contains = is_array($with) ? $with : explode(',', $with);

        foreach ($contains as $contain) {
            $camelVersion = Str::camel(trim($contain));
            if (\method_exists($this, $camelVersion)) {
                $builder->with($camelVersion);
                continue;
            }

            $snakeCase = Str::snake(trim($contain));
            if (\method_exists($this, $snakeCase)) {
                $builder->with(trim($snakeCase));
                continue;
            }

            if (strpos($contain, '.') !== false) {
                $parts = array_map(
                    function ($part) {
                        return Str::camel($part);
                    },
                    explode('.', $contain)
                );
                $contain = implode('.', $parts);

                $builder->with($contain);
                continue;
            }
        }

        if ($without) {
            $builder->without($without);
        }

        return $builder;
    }

    /**
     * Checks if request includes counts.
     *
     * @param Request                            $request
     * @param \Illuminate\Database\Query\Builder $builder
     *
     * @return \Illuminate\Database\Query\Builder
     */
    public function withCounts($request, $builder)
    {
        $count = $request->or(['count', 'with_count']);

        if (!$count) {
            return $builder;
        }

        $counters = explode(',', $count);

        foreach ($counters as $counter) {
            if (\method_exists($this, $counter)) {
                $builder->withCount($counter);
                continue;
            }

            $camelVersion = Str::camel($counter);
            if (\method_exists($this, $camelVersion)) {
                $builder->withCount($camelVersion);
                continue;
            }
        }

        return $builder;
    }

    /**
     * Apply sorts to query.
     *
     * @param Request                            $request - HTTP Request
     * @param \Illuminate\Database\Query\Builder $builder - Query Builder
     *
     * @return \Illuminate\Database\Query\Builder
     */
    public function applySorts($request, $builder)
    {
        $sorts = $request->sort ? explode(',', $request->sort) : null;

        if (!$sorts) {
            return $builder;
        }

        foreach ($sorts as $sort) {
            if (Schema::hasColumn($this->table, $this->getCreatedAtColumn())) {
                if (strtolower($sort) == 'latest') {
                    $builder->latest();
                    continue;
                }

                if (strtolower($sort) == 'oldest') {
                    $builder->oldest();
                    continue;
                }
            }

            if (strtolower($sort) == 'distance') {
                $builder->orderByDistance();
                continue;
            }
            if (strtolower($sort) == 'scheduled_at') {
                $builder->orderBy('scheduled_at', 'asc');
                continue;
            }

            if (is_array($sort) || Str::contains($sort, ',')) {
                $columns = !is_array($sort) ? explode(',', $sort) : $sort;

                foreach ($columns as $column) {
                    if (Str::startsWith($column, '-')) {
                        $direction = Str::startsWith($column, '-') ? 'desc' : 'asc';
                        $param     = Str::startsWith($column, '-') ? substr($column, 1) : $column;

                        $builder->orderBy($column, $direction);
                        continue;
                    }

                    $sd = explode(':', $column);
                    if ($sd && count($sd) > 0) {
                        count($sd) == 2
                            ? $builder->orderBy(trim($sd[0]), trim($sd[1]))
                            : $builder->orderBy(trim($sd[0]), 'asc');
                    }
                }
            }

            if (Str::startsWith($sort, '-')) {
                list($param, $direction) = Http::useSort($request);

                $builder->orderBy($param, $direction);
                continue;
            }

            list($param, $direction) = Http::useSort($request);
            $builder->orderBy($param, $direction);
        }

        return $builder;
    }

    /**
     * Retrieves a record based on primary key id.
     *
     * @param string  $id      - The ID
     * @param Request $request - HTTP Request
     *
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function getById($id, Request $request)
    {
        $builder = $this->where(function ($q) use ($id) {
            $publicIdColumn = $this->getQualifiedPublicId();

            $q->where($this->getQualifiedKeyName(), $id);
            if ($this->isColumn($publicIdColumn)) {
                $q->orWhere($publicIdColumn, $id);
            }
        });

        $builder = $this->withCounts($request, $builder);
        $builder = $this->withRelationships($request, $builder);
        $builder = $this->applySorts($request, $builder);
        $builder = $this->applyDirectivesToQuery($request, $builder);

        return $builder->first();
    }

    /**
     * Retrieves the options for the given model.
     *
     * @return array An array of options with 'value' and 'label' keys
     */
    public function getOptions()
    {
        $builder = $this->select($this->option_key, $this->option_label)
            ->orderBy($this->option_label, 'asc')
            ->get();

        // convert data to standard object {value:'', label:''}
        $arr = [];
        foreach ($builder as $x) {
            if ($x[$this->option_label]) {
                $arr[] = [
                    'value' => $x[$this->option_key],
                    'label' => $x[$this->option_label],
                ];
            }
        }

        return $arr;
    }

    /**
     * Searches for records based on the request parameters and returns a paginated result.
     *
     * @param Request $request The request object containing the search parameters
     *
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator The paginated search results
     */
    public function searchRecordFromRequest(Request $request)
    {
        $limit   = $request->integer('limit', 30);
        $builder =  $this->searchBuilder($request);

        return $builder->fastPaginate($limit);
    }

    /**
     * Builds the search query based on the request parameters.
     *
     * @param Request $request The request object containing the search parameters
     *
     * @return \Illuminate\Database\Eloquent\Builder The search query builder
     */
    public function searchBuilder(Request $request, $columns = ['*'])
    {
        $builder = self::query()->select($columns);
        $builder = $this->buildSearchParams($request, $builder);
        $builder = $this->applyFilters($request, $builder);
        $builder = $this->applyCustomFilters($request, $builder);
        $builder = $this->withRelationships($request, $builder);
        $builder = $this->withCounts($request, $builder);
        $builder = $this->applySorts($request, $builder);
        $builder = $this->applyDirectivesToQuery($request, $builder);

        return $builder;
    }

    /**
     * Applies all authorization directives from the request to the given query builder.
     *
     * This method retrieves directives from the request using the `Auth::getDirectivesFromRequest` method,
     * then iterates over each directive and applies it to the provided query builder. The directives modify
     * the query to enforce the appropriate access controls based on the authenticated user's permissions.
     *
     * @param Request                               $request the HTTP request containing the authorization directives
     * @param \Illuminate\Database\Eloquent\Builder $builder the query builder instance to which the directives will be applied
     *
     * @return \Illuminate\Database\Eloquent\Builder the modified query builder with all directives applied
     */
    public function applyDirectivesToQuery(Request $request, $builder)
    {
        $directives       = Auth::getDirectivesFromRequest($request);
        $uniqueDirectives = $directives->unique('rules');
        foreach ($uniqueDirectives as $directive) {
            $directive->apply($builder);
        }

        return $builder;
    }

    /**
     * Optimizes the given query builder by removing duplicate where clauses.
     *
     * This method takes a query builder instance and passes it to the QueryOptimizer,
     * which processes the query to remove any duplicate where clauses while ensuring
     * that the associated bindings are correctly managed. This optimization helps in
     * improving query performance and avoiding potential issues with redundant conditions.
     *
     * @param \Illuminate\Database\Eloquent\Builder $builder the query builder instance to optimize
     *
     * @return \Illuminate\Database\Eloquent\Builder the optimized query builder with unique where clauses
     */
    public function optimizeQuery($builder)
    {
        return QueryOptimizer::removeDuplicateWheres($builder);
    }

    /**
     * Applies custom filters to the search query based on the request parameters.
     *
     * @param Request                               $request The request object containing the custom filter parameters
     * @param \Illuminate\Database\Eloquent\Builder $builder The search query builder
     *
     * @return \Illuminate\Database\Eloquent\Builder The search query builder with custom filters applied
     */
    public function applyCustomFilters(Request $request, $builder)
    {
        $resourceFilter = Resolve::httpFilterForModel($this, $request);

        if ($resourceFilter) {
            $builder->filter($resourceFilter);
        }

        // handle with/without here
        $with             = $request->or(['with', 'expand'], []);
        $without          = $request->array('without');
        $withoutRelations = $request->boolean('without_relations');

        // camelcase all params in with and apply
        if (is_array($with)) {
            $with = array_map(
                function ($relationship) {
                    return Str::camel($relationship);
                },
                $with
            );

            $builder = $builder->with($with);
        }

        // camelcase all params in with and apply
        if (is_array($without)) {
            $without = array_map(
                function ($relationship) {
                    return Str::camel($relationship);
                },
                $without
            );

            $builder = $builder->without($without);
        }

        // if to query without all relations
        if ($withoutRelations) {
            $builder = $builder->withoutRelations();
        }

        return $builder;
    }

    /**
     * Applies filters to the search query based on the request parameters.
     *
     * @param Request                               $request The request object containing the filter parameters
     * @param \Illuminate\Database\Eloquent\Builder $builder The search query builder
     *
     * @return \Illuminate\Database\Eloquent\Builder The search query builder with filters applied
     */
    public function applyFilters(Request $request, $builder)
    {
        $operators = $this->getQueryOperators();
        $filters   = $request->input('filters', []);

        foreach ($filters as $column => $values) {
            if (!in_array($column, $this->searcheableFields())) {
                continue;
            }

            $valueParts      = explode(':', $values);
            $operator        = 'eq';
            $operator_symbol = '=';
            $value           = null;

            if (count($valueParts) > 1) {
                $operator        = $valueParts[0];
                $operator_symbol = $operators[$operator] ?? '=';
                $value           = $valueParts[1];
            } else {
                $value = $valueParts[0];
            }

            if ($this->prioritizedCustomColumnFilter($request, $builder, $column)) {
                continue;
            }

            $builder = $this->applyOperators($builder, $column, $operator, $operator_symbol, $value);
        }

        return $builder;
    }

    /**
     * Counts the records based on the request search parameters.
     *
     * @param Request $request The request object containing the search parameters
     *
     * @return int The number of records found
     */
    public function count(Request $request)
    {
        return $this->buildSearchParams($request, self::query())->count();
    }

    /**
     * Checks if the custom column filter should be prioritized.
     *
     * @param Request                               $request The request object containing filter parameters
     * @param \Illuminate\Database\Eloquent\Builder $builder The search query builder
     * @param string                                $column  The column name
     *
     * @return bool True if the custom column filter should be prioritized, false otherwise
     */
    public function prioritizedCustomColumnFilter($request, $builder, $column)
    {
        $resourceFilter        = Resolve::httpFilterForModel($this, $request);
        $camelizedColumnName   = Str::camel($column);
        $camelizedRelationName = Str::camel(Str::replace('_uuid', '', $column));

        if (empty($resourceFilter)) {
            return false;
        }

        return method_exists($resourceFilter, $camelizedColumnName) || method_exists($resourceFilter, $column) || method_exists($resourceFilter, $camelizedRelationName);
    }

    /**
     * Builds the search parameters based on the request.
     *
     * @param Request                               $request The request object containing the search parameters
     * @param \Illuminate\Database\Eloquent\Builder $builder The search query builder
     *
     * @return \Illuminate\Database\Eloquent\Builder The search query builder with search parameters applied
     */
    public function buildSearchParams(Request $request, $builder)
    {
        $operators = $this->getQueryOperators();

        foreach ($request->getFilters() as $key => $value) {
            if ($this->prioritizedCustomColumnFilter($request, $builder, $key) || empty($value)) {
                continue;
            }

            $fieldEndsWithOperator = Str::endsWith($key, array_keys($operators));
            $isFillable            = $this->isFillable($key) || in_array($key, ['uuid', 'public_id']);

            if (!$fieldEndsWithOperator && $isFillable) {
                if ($key==='public_id' && get_class($this) === 'Fleetbase\\FleetOps\\Models\\Order') {
                    continue;
                }
                $builder->where($key, '=', $value);
                continue;
            }

            // apply special operators based on the column name passed
            foreach ($operators as $op_key => $op_type) {
                $key                   = strtolower($key);
                $op_key                = strtolower($op_key);
                $column                = Str::replaceLast($op_key, '', $key);
                $fieldEndsWithOperator = Str::endsWith($key, $op_key);

                if (!$fieldEndsWithOperator) {
                    continue;
                }

                $builder = $this->applyOperators($builder, $column, $op_key, $op_type, $value);
            }
        }

        return $builder;
    }

    /**
     * Returns the query operators for filtering.
     *
     * @return array The query operators
     */
    private function getQueryOperators()
    {
        return [
            '_not'       => '!=',
            '_gt'        => '>',
            '_lt'        => '<',
            '_gte'       => '>=',
            '_lte'       => '<=',
            '_like'      => 'LIKE',
            '_in'        => true,
            '_notIn'     => true,
            '_isNull'    => true,
            '_isNotNull' => true,
        ];
    }

    /**
     * Applies the query operators to the search query builder.
     *
     * @param \Illuminate\Database\Eloquent\Builder $builder     The search query builder
     * @param string                                $column_name The column name
     * @param string                                $op_key      The operator key
     * @param string                                $op_type     The operator type
     * @param mixed                                 $value       The value for the query operator
     *
     * @return \Illuminate\Database\Eloquent\Builder The search query builder with query operators applied
     */
    private function applyOperators($builder, $column_name, $op_key, $op_type, $value)
    {
        $column_name = $this->shouldQualifyColumn($column_name)
            ? $this->qualifyColumn($column_name)
            : $column_name;

        if ($op_key == '_in') {
            $builder->whereIn($column_name, explode(',', $value));
        } elseif ($op_key == strtolower('_notIn')) {
            $builder->whereNotIn($column_name, explode(',', $value));
        } elseif ($op_key == strtolower('_isNull')) {
            $builder->whereNull($column_name);
        } elseif ($op_key == strtolower('_isNotNull')) {
            $builder->whereNotNull($column_name);
        } elseif ($op_key == '_like') {
            $builder->where($column_name, 'LIKE', "{$value}%");
        } else {
            $builder->where($column_name, $op_type, $value);
        }

        return $builder;
    }

    /**
     * Determines whether the given column name should be qualified.
     *
     * @param string $column_name The column name
     *
     * @return bool True if the column should be qualified, false otherwise
     */
    public function shouldQualifyColumn($column_name)
    {
        return in_array($column_name, [
            $this->getKey() ?? 'uuid',
            $this->getCreatedAtColumn() ?? 'created_at',
            $this->getUpdatedAtColumn() ?? 'updated_at',
            $this->getDeletedAtColumn() ?? 'deleted_at',
        ]);
    }

    /**
     * Checks if a given key exists in the filter parameters.
     *
     * @param string $key the key to be checked for existence in the filter parameters
     *
     * @return bool returns true if the key exists in the filter parameters, otherwise returns false
     */
    public function isFilterParam(string $key): bool
    {
        if (!empty($this->filterParams) && is_array($this->filterParams)) {
            return in_array($key, $this->filterParams);
        }

        return false;
    }

    /**
     * Get the human-readable name for the API model.
     *
     * This function converts the table name of the model into a singular, title-cased string to be used as a human-readable name.
     *
     * @return string the human-readable name for the API model
     */
    public function getApiHumanReadableName()
    {
        return Utils::humanize($this->getTable());
    }

    /**
     * Get the API payload from the request.
     *
     * This function extracts the payload from the request using the singular name or camel-cased singular name as keys. If neither is found, it returns all input data.
     *
     * @param Request $request the incoming HTTP request instance
     *
     * @return array the extracted payload from the request
     */
    public function getApiPayloadFromRequest(Request $request): array
    {
        $payloadKeys = [$this->getSingularName(), Str::camel($this->getSingularName())];
        $input       = $request->or($payloadKeys) ?? $request->all();
        // the following input keys should always be managed by the server
        $input = Arr::except($input, ['company_uuid', 'created_by_uuid', 'updated_by_uuid', 'uploader_uuid']);

        return $input;
    }

    /**
     * Determines whether a given column exists in the table associated with the model.
     */
    public function isColumn(string $columnName): bool
    {
        $connectionName = config('database.default');
        $connection     = $this->getConnection();

        if ($connection instanceof \Illuminate\Database\Connection) {
            $connectionName = $connection->getName();
        }

        return Schema::connection($connectionName)->hasColumn($this->getTable(), $columnName);
    }

    /**
     * Determines whether a given parameter key is invalid for an update operation.
     *
     * This function checks if the provided key is not one of the timestamp fields, not a fillable attribute,
     * not a relation (either in its given form or in its camel case equivalent), not a filter parameter,
     * and not an appended attribute.
     *
     * @param string $key the parameter key to evaluate
     *
     * @return bool returns true if the key is not valid for updating; false otherwise
     */
    public function isInvalidUpdateParam(string $key): bool
    {
        $isNotTimestamp          = !in_array($key, ['created_at', 'updated_at', 'deleted_at']);
        $isNotFillable           = !$this->isFillable($key);
        $isNotGuarded            = !$this->isGuarded($key);
        $isNotRelation           = !$this->isRelation($key) && !$this->isRelation(Str::camel($key));
        $isNotFilterParam        = !$this->isFilterParam($key);
        $isNotAppenededAttribute = !in_array($key, $this->appends ?? []);
        $isNotIdParam            = !in_array($key, ['id', 'uuid', 'public_id']);

        return $isNotTimestamp && $isNotFillable && $isNotGuarded && $isNotRelation && $isNotFilterParam && $isNotAppenededAttribute && $isNotIdParam;
    }

    /**
     * Find a model by its `public_id` or `internal_id` key or throw an exception.
     *
     * @param mixed        $id            ID of the record to find
     * @param array        $with          Relationships to include
     * @param array        $columns       Columns to select in query
     * @param Closure|null $queryCallback Optional callback to modify the QueryBuilder
     *
     * @return \Illuminate\Database\Eloquent\Model|\Illuminate\Database\Eloquent\Collection|static|static[]
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public static function findRecordOrFail($id, $with = [], $columns = ['*'], ?\Closure $queryCallback = null)
    {
        if (is_null($columns) || empty($columns)) {
            $columns = ['*'];
        }

        /** @var \Illuminate\Database\Eloquent\Model $instance New instance of current Model * */
        $instance = (new static());

        // has internal id?
        $hasInternalId = in_array('internal_id', $instance->getFillable());

        // create query
        $query = static::query()
            ->select($columns)
            ->with($with)
            ->where(
                function ($query) use ($id, $hasInternalId) {
                    $query->where('public_id', $id);

                    if ($hasInternalId) {
                        $query->orWhere('internal_id', $id);
                    }
                }
            );

        // more query modifications if callback supplied
        if (is_callable($queryCallback)) {
            $queryCallback($query);
        }

        // get result
        $result = $query->first();

        if (!is_null($result)) {
            return $result;
        }

        throw (new \Illuminate\Database\Eloquent\ModelNotFoundException())->setModel(static::class, $id);
    }
}
