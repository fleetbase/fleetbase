<?php

namespace Fleetbase\Http\Filter;

class DashboardFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where('user_uuid', $this->session->get('user'));
    }
}
