<?php

namespace Fleetbase\FleetOps\Rules;

use Fleetbase\FleetOps\Support\Algo;
use Illuminate\Contracts\Validation\Rule;

class ComputableAlgo implements Rule
{
    /**
     * Determine if the validation rule passes.
     *
     * @param string $attribute
     *
     * @return bool
     */
    public function passes($attribute, $value)
    {
        $distanceAndTime = Algo::calculateDrivingDistanceAndTime('1.3506853', '103.87199110000006', '1.3621663', '103.88450490000002');

        return Algo::exec($value, $distanceAndTime) > 0;
    }

    /**
     * Get the validation error message.
     *
     * @return string
     */
    public function message()
    {
        return 'Algorithm provided is not computable.';
    }
}
