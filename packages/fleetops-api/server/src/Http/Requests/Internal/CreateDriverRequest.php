<?php

namespace Fleetbase\FleetOps\Http\Requests\Internal;

use Fleetbase\FleetOps\Http\Requests\CreateDriverRequest as CreateDriverApiRequest;
use Fleetbase\Support\Auth;
use Illuminate\Validation\Rule;

class CreateDriverRequest extends CreateDriverApiRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return Auth::can('fleet-ops create driver');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
      $isCreating = $this->isMethod('POST');
      //$driverId = $this->route('driver') ?? null; // works with route-model binding or fallback
        return [
            'password' => 'nullable|string',
            'country'  => 'nullable|size:2',
            'city'     => 'nullable|string',
            'status'   => 'nullable|string|in:active,inactive,pending',
            'job'      => 'nullable|exists:orders,public_id',
           /* 'drivers_license_number' => [
            'required',
            'string',
            Rule::unique('drivers', 'drivers_license_number')->ignore($driverId, 'uuid'),
        ],*/
        ];
    }
}
