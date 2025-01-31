<?php

namespace Fleetbase\FleetOps\Http\Requests\Internal;

use Fleetbase\FleetOps\Http\Requests\CreateDriverRequest as CreateDriverApiRequest;
use Fleetbase\Support\Auth;

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

        return [
            'password' => 'nullable|string',
            'country'  => 'nullable|size:2',
            'city'     => 'nullable|string',
            'status'   => 'nullable|string|in:active,inactive',
            'job'      => 'nullable|exists:orders,public_id',
        ];
    }
}
