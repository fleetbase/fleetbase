<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\ClearsHttpCache;
use Fleetbase\Traits\Expandable;
use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasCacheableAttributes;
use Fleetbase\Traits\Insertable;
use Fleetbase\Traits\Searchable;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Database\Eloquent\SoftDeletes;

class Model extends EloquentModel
{
    use SoftDeletes;
    use HasCacheableAttributes;
    use ClearsHttpCache;
    use Insertable;
    use Filterable;
    use Expandable;

    /**
     * Create a new instance of the model.
     *
     * @param array $attributes the attributes to set on the model
     *
     * @return void
     */
    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);

        $this->connection = config('fleetbase.db.connection');
    }

    /**
     * The primary key for the model.
     *
     * @var string
     */
    protected $primaryKey = 'uuid';

    /**
     * The "type" of the primary key ID.
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var string
     */
    public $incrementing = false;

    /**
     * Determines if model is searchable.
     *
     * @return bool
     */
    public static function isSearchable()
    {
        return in_array(Searchable::class, class_uses_recursive(static::class));
    }

    /**
     * Saves the model instance and returns itself.
     */
    public function saveInstance(): Model
    {
        $this->save();

        return $this;
    }

    /**
     * Get the relationships that are queued for eager loading.
     *
     * @return array
     */
    public function getQueueableRelations()
    {
        return [];
    }

    /**
     * Retrieve a child model instance by binding it to the parent.
     *
     * @param string      $childType
     * @param string|null $field
     */
    public function resolveChildRouteBinding($childType, $value, $field)
    {
    }

    /**
     * Get the HTTP resource class for the model.
     *
     * @return string|null
     */
    public function getResource()
    {
        $resourceNamespace = null;

        if (isset($this->httpResource)) {
            $resourceNamespace = $this->httpResource;
        }

        if (isset($this->resource)) {
            $resourceNamespace = $this->resource;
        }

        return $resourceNamespace;
    }

    /**
     * Get the HTTP request class for the model.
     *
     * @return string|null
     */
    public function getRequest()
    {
        $requestNamespace = null;

        if (isset($this->httpRequest)) {
            $requestNamespace = $this->httpRequest;
        }

        if (isset($this->request)) {
            $requestNamespace = $this->request;
        }

        return $requestNamespace;
    }

    /**
     * Get the HTTP filter class for the model.
     *
     * @return string|null
     */
    public function getFilter()
    {
        $filterNamespace = null;

        if (isset($this->httpFilter)) {
            $filterNamespace = $this->httpFilter;
        }

        if (isset($this->filter)) {
            $filterNamespace = $this->filter;
        }

        return $filterNamespace;
    }
}
