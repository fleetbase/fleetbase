<?php

namespace Fleetbase\FleetOps\Http\Filter;

use Fleetbase\Http\Filter\Filter;

class ServiceRateFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function queryForPublic()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function serviceArea(?string $serviceArea)
    {
        $this->builder->whereHas(
            'serviceArea',
            function ($query) use ($serviceArea) {
                $query->where('uuid', $serviceArea);
            }
        );
    }

    public function zone(?string $zone)
    {
        $this->builder->whereHas(
            'zone',
            function ($query) use ($zone) {
                $query->where('uuid', $zone);
            }
        );
    }
}
