<?php

namespace Fleetbase\Http\Resources\Json;

use Illuminate\Http\Resources\Json\PaginatedResourceResponse;

class FleetbasePaginatedResourceResponse extends PaginatedResourceResponse
{
    /**
     * Add the pagination information to the response.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return array
     */
    protected function paginationInformation($request)
    {
        $paginated = $this->resource->resource->toArray();

        $default = [
            'meta' => $this->meta($paginated),
        ];

        if (method_exists($this->resource, 'paginationInformation')) {
            return $this->resource->paginationInformation($request, $paginated, $default);
        }

        return $default;
    }

    protected function meta($paginated)
    {
        $metaData = parent::meta($paginated);

        return [
            'total'        => $metaData['total'] ?? null,
            'per_page'     => $metaData['per_page'] ?? null,
            'current_page' => $metaData['current_page'] ?? null,
            'last_page'    => $metaData['last_page'] ?? null,
            'from'         => $metaData['from'] ?? null,
            'to'           => $metaData['to'] ?? null,
            'time'         => round((microtime(true) - LARAVEL_START) * 1000),
        ];
    }
}
