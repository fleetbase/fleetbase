<?php

namespace Fleetbase\Http\Filter;

use Fleetbase\Scopes\ExpiryScope;
use Fleetbase\Support\Utils;

class ApiRequestLogFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function query(?string $query)
    {
        $this->builder->search($query);
    }

    public function key(?string $key)
    {
        $this->builder->whereHas(
            'apiCredential',
            function ($query) use ($key) {
                $query->where('uuid', $key)->orWhere('public_id', $key)->withoutGlobalScope(ExpiryScope::class);
            }
        );
    }

    public function createdAt($createdAt)
    {
        $createdAt = Utils::dateRange($createdAt);

        if (is_array($createdAt)) {
            $this->builder->whereBetween('created_at', $createdAt);
        } else {
            $this->builder->whereDate('created_at', $createdAt);
        }
    }

    public function updatedAt($updatedAt)
    {
        $updatedAt = Utils::dateRange($updatedAt);

        if (is_array($updatedAt)) {
            $this->builder->whereBetween('updated_at', $updatedAt);
        } else {
            $this->builder->whereDate('updated_at', $updatedAt);
        }
    }
}
