<?php

namespace Fleetbase\FleetOps\Http\Requests\Internal;

use Fleetbase\Http\Requests\FleetbaseRequest;
use Fleetbase\Support\Auth;
use Illuminate\Validation\Rule;

class CreateOrderConfigRequest extends FleetbaseRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return Auth::can('fleet-ops create order-config');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'name' => [
                'required',
                Rule::unique('order_configs', 'name')
                    ->where('company_uuid', request()->session()->get('company'))->whereNull('deleted_at'),
            ],
            'key' => [
                'required',
                Rule::unique('order_configs', 'key')
                    ->where('company_uuid', request()->session()->get('company'))->whereNull('deleted_at'),
            ],
        ];
    }
}
