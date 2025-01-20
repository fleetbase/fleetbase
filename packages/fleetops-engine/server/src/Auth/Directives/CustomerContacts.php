<?php

namespace Fleetbase\FleetOps\Auth\Directives;

use Fleetbase\Contracts\Directive;
use Illuminate\Database\Eloquent\Builder;

class CustomerContacts implements Directive
{
    public function apply(Builder $builder): Builder
    {
        $id = session('user', request()->input('customer'));

        return $builder->where(['type' => 'customer', 'user_uuid' => $id]);
    }
}
