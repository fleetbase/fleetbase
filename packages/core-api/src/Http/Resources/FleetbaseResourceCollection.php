<?php

namespace Fleetbase\Http\Resources;

use Fleetbase\Http\Resources\Json\FleetbasePaginatedResourceResponse;
use Illuminate\Http\Resources\Json\ResourceCollection;

class FleetbaseResourceCollection extends ResourceCollection
{
    /**
     * The name of the resource being collected.
     *
     * @var string
     */
    public $collects;

    /**
     * Create a new anonymous resource collection.
     *
     * @param string $collects
     *
     * @return void
     */
    public function __construct($resource, $collects)
    {
        $this->collects = $collects;

        parent::__construct($resource);
    }

    /**
     * Create a paginate-aware HTTP response.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\JsonResponse
     */
    protected function preparePaginatedResponse($request)
    {
        if ($this->preserveAllQueryParameters) {
            $this->resource->appends($request->query());
        } elseif (!is_null($this->queryParameters)) {
            $this->resource->appends($this->queryParameters);
        }

        return (new FleetbasePaginatedResourceResponse($this))->toResponse($request);
    }
}
