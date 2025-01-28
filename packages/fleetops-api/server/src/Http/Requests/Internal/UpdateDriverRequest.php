<?php

namespace Fleetbase\FleetOps\Http\Requests\Internal;

use Fleetbase\Support\Auth;

class UpdateDriverRequest extends CreateDriverRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return Auth::can('fleet-ops update driver');
    }
}
