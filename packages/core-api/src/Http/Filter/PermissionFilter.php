<?php

namespace Fleetbase\Http\Filter;

class PermissionFilter extends Filter
{
    public function query(?string $query)
    {
        $this->builder->search($query);
    }
}
