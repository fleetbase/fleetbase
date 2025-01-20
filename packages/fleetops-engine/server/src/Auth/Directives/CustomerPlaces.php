<?php

namespace Fleetbase\FleetOps\Auth\Directives;

use Fleetbase\Contracts\Directive;
use Illuminate\Database\Eloquent\Builder;

class CustomerPlaces implements Directive
{
    public function apply(Builder $builder): Builder
    {
        $id = session('user', request()->input('customer'));

        return $builder->where(function ($query) use ($id) {
            $query->where('owner_uuid', $id);
        });
    }
}
