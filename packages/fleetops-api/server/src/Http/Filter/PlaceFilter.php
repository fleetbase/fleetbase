<?php

namespace Fleetbase\FleetOps\Http\Filter;

use Fleetbase\FleetOps\Models\ServiceArea;
use Fleetbase\FleetOps\Models\Zone;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Filter\Filter;
use Fleetbase\LaravelMysqlSpatial\Types\Geometry;

class PlaceFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function queryForPublic()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function query(?string $searchQuery)
    {
        $this->builder->search($searchQuery);
    }

    public function publicId(?string $publicId)
    {
        $this->builder->searchWhere('public_id', $publicId);
    }

    public function postalCode(?string $postalCode)
    {
        $this->builder->searchWhere('postal_code', $postalCode);
    }

    public function phone(?string $phone)
    {
        $this->builder->searchWhere('phone', $phone);
    }

    public function city(?string $city)
    {
        $this->builder->searchWhere('city', $city);
    }

    public function neighborhood(?string $neighborhood)
    {
        $this->builder->searchWhere('neighborhood', $neighborhood);
    }

    public function state(?string $state)
    {
        $this->builder->searchWhere('province', $state);
    }

    public function name(?string $name)
    {
        $this->builder->searchWhere('name', $name);
    }

    public function address(?string $address)
    {
        $this->builder->searchWhere(['street1', 'street2'], $address);
    }

    public function country(?string $country)
    {
        $this->builder->where('country', $country);
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

    public function within($within)
    {
        // search for places within a radius of center coordinates
        $center = Utils::getPointFromMixed($within);

        // get the radius
        $radius = data_get($within, 'radius', 20); // 20km

        // Convert the radius to degrees if using geographical coordinates
        $radiusInDegrees = $radius / 111.32;

        // Create a query to find places within the circle
        $this->builder->whereRaw('ST_Within(location, ST_Buffer(ST_GeomFromText(?), ?))', [
            $center->toWKT(),
            $radiusInDegrees,
        ]);
    }

    public function nearby($nearby)
    {
        // search for places within a radius of center coordinates
        $center = Utils::getPointFromMixed($nearby);

        // get the radius
        $radius = data_get($nearby, 'radius', 5); // 5km

        // Convert the radius to degrees if using geographical coordinates
        $radiusInDegrees = $radius / 111.32;

        // Create a query to find places within the circle
        $this->builder->whereRaw('ST_Within(location, ST_Buffer(ST_GeomFromText(?), ?))', [
            $center->toWKT(),
            $radiusInDegrees,
        ]);
    }

    public function withinServiceArea($serviceAreaId)
    {
        $serviceArea = ServiceArea::where('uuid', $serviceAreaId)->orWhere('public_id', $serviceAreaId)->first('border');

        if ($serviceArea->border instanceof Geometry) {
            $this->builder->within('location', $serviceArea->border);
        }
    }

    public function serviceArea($serviceAreaId)
    {
        $this->withinServiceArea($serviceAreaId);
    }

    public function withinZone($zoneId)
    {
        $zone = Zone::where('uuid', $zoneId)->orWhere('public_id', $zoneId)->first('border');

        if ($zone->border instanceof Geometry) {
            $this->builder->within('location', $zone->border);
        }
    }

    public function zone($zoneId)
    {
        $this->withinZone($zoneId);
    }
}
