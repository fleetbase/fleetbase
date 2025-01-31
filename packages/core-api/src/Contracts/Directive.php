<?php

namespace Fleetbase\Contracts;

use Illuminate\Database\Eloquent\Builder;

interface Directive
{
    /**
     * The function to apply to the current builder instance.
     */
    public function apply(Builder $builder): Builder;
}
