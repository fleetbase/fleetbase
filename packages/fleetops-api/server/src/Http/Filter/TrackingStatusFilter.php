<?php

namespace Fleetbase\FleetOps\Http\Filter;

use Fleetbase\Http\Filter\Filter;

class TrackingStatusFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function queryForPublic()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function trackingNumber(string $trackingNumber)
    {
        $this->builder->whereHas('trackingNumber', function ($query) use ($trackingNumber) {
            $query->where(function ($query) use ($trackingNumber) {
                $query->where('public_id', $trackingNumber);
                $query->orWhere('uuid', $trackingNumber);
            });
        });
    }

    public function trackingNumberUuid(string $trackingNumber)
    {
        $this->builder->whereHas('trackingNumber', function ($query) use ($trackingNumber) {
            $query->where(function ($query) use ($trackingNumber) {
                $query->where('public_id', $trackingNumber);
                $query->orWhere('uuid', $trackingNumber);
            });
        });
    }

    public function order(string $order)
    {
        $this->builder->whereHas(
            'trackingNumber',
            function ($query) use ($order) {
                $query->whereHas(
                    'order',
                    function ($query) use ($order) {
                        $query->where('public_id', $order);
                    }
                );
            }
        );
    }

    public function entity(string $entity)
    {
        $this->builder->whereHas(
            'trackingNumber',
            function ($query) use ($entity) {
                $query->whereHas(
                    'entity',
                    function ($query) use ($entity) {
                        $query->where('public_id', $entity);
                    }
                );
            }
        );
    }
}
