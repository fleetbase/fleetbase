<?php

namespace Fleetbase\FleetOps\Http\Requests;

use Fleetbase\Http\Requests\FleetbaseRequest;
use Illuminate\Validation\Rule;

class CreatePayloadRequest extends FleetbaseRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return request()->session()->has('api_credential');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'entities'              => 'array',
            'waypoints'             => 'array',
            'return'                => 'nullable',
            'type'                  => [Rule::requiredIf($this->isMethod('POST'))],
            'cod_currency'          => [Rule::requiredIf($this->has(['cod_amount'])), 'size:3'],
            'cod_payment_method'    => [Rule::requiredIf($this->has(['cod_amount'])), 'in:card,check,cash,bank_transfer'],
        ];

        if ($this->missing('waypoints')) {
            $validations['pickup']  = 'required';
            $validations['dropoff'] = 'required';
        }

        if ($this->isString('pickup')) {
            $validations['pickup'] = 'required|exists:places,public_id';
        }

        if ($this->isString('dropoff')) {
            $validations['dropoff'] = 'required|exists:places,public_id';
        }

        if ($this->missing(['pickup', 'dropoff'])) {
            $validations['waypoints'] = 'required|array|min:2';
        }
    }
}
