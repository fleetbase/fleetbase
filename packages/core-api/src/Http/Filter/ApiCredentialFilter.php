<?php

namespace Fleetbase\Http\Filter;

class ApiCredentialFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function query(?string $query)
    {
        $this->builder->search($query);
    }
}
