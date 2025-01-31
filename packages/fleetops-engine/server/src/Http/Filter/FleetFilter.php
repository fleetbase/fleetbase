<?php

namespace Fleetbase\FleetOps\Http\Filter;

use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Filter\Filter;

class FleetFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where('company_uuid', $this->session->get('company'))->with(['serviceArea', 'zone']);
    }

    public function queryForPublic()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function query(?string $searchQuery)
    {
        $this->builder->where(function ($query) use ($searchQuery) {
            $query->orWhereHas(
                'user',
                function ($query) use ($searchQuery) {
                    $query->searchWhere(['name', 'email', 'phone'], $searchQuery);
                }
            );
        });
    }

    public function parentsOnly(bool $parentsOnly = false)
    {
        if ($parentsOnly) {
            $this->builder->whereNull('parent_fleet_uuid');
        }
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
                $query->where('zone_uuid', $zone);
            }
        );
    }

    public function parentFleet(?string $fleet)
    {
        $this->builder->whereHas(
            'parent_fleet',
            function ($query) use ($fleet) {
                $query->where('uuid', $fleet);
            }
        );

        $this->builder->searchWhere('parent_fleet_uuid', $fleet);
    }

    public function vendor(?string $vendor)
    {
        $this->builder->whereHas(
            'vendor',
            function ($query) use ($vendor) {
                $query->where('uuid', $vendor);
            }
        );
    }

    public function publicId(?string $publicId)
    {
        $this->builder->searchWhere('public_id', $publicId);
    }

    public function task(?string $task)
    {
        $this->builder->searchWhere('task', $task);
    }

    public function name(?string $name)
    {
        $this->builder->searchWhere('name', $name);
    }

    public function status(?string $status)
    {
        $this->builder->searchWhere('status', $status);
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
