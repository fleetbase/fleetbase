<?php

namespace Fleetbase\FleetOps\Http\Filter;

use Fleetbase\Http\Filter\Filter;

class IntegratedVendorFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }
}
