<?php

namespace Fleetbase\FleetOps\Auth\Directives;

use Fleetbase\Contracts\Directive;
use Illuminate\Database\Eloquent\Builder;

class CustomerOrders implements Directive
{
    public function apply(Builder $builder): Builder
    {
        $id = session('user', request()->input('customer'));

        return $builder->where(function ($query) use ($id) {
            $query->where('customer_uuid', $id);
            $query->orWhereHas('authenticatableCustomer', function ($query) use ($id) {
                $query->where('user_uuid', $id);
            });
        });
    }
}
