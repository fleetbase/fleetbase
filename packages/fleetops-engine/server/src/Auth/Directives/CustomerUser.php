<?php

namespace Fleetbase\FleetOps\Auth\Directives;

use Fleetbase\Contracts\Directive;
use Illuminate\Database\Eloquent\Builder;

class CustomerUser implements Directive
{
    public function apply(Builder $builder): Builder
    {
        $id = session('user', request()->input('customer'));

        return $builder->where(['uuid' => $id]);
    }
}
