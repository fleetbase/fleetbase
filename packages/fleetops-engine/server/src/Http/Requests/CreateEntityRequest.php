<?php

namespace Fleetbase\FleetOps\Http\Requests;

use Fleetbase\Http\Requests\FleetbaseRequest;
use Illuminate\Validation\Rule;

class CreateEntityRequest extends FleetbaseRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return request()->session()->has('api_credential') || request()->session()->has('is_sanctum_token');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'name'            => [Rule::requiredIf($this->isMethod('POST'))],
            'type'            => [Rule::requiredIf($this->isMethod('POST'))],
            'destination'     => ['nullable', Rule::exists('places', 'public_id')->whereNull('deleted_at')],
            'waypoint'        => ['nullable', Rule::exists('places', 'public_id')->whereNull('deleted_at')],
            'payload'         => ['nullable', Rule::exists('payloads', 'public_id')->whereNull('deleted_at'), 'required_with:destination,waypoint'],
            'email'           => ['nullable', 'email'],
            'weight'          => 'nullable',
            'weight_unit'     => [Rule::requiredIf($this->has('weight')), 'in:g,oz,lb,kg'],
            'length'          => 'nullable',
            'width'           => 'nullable',
            'height'          => 'nullable',
            'dimensions_unit' => [Rule::requiredIf($this->has(['length', 'width', 'height'])), 'in:cm,in,ft,mm,m,yd'],
            'declared_value'  => ['nullable', 'numeric'],
            'price'           => ['nullable', 'numeric'],
            'sales_price'     => ['nullable', 'numeric'],
            'currency'        => [Rule::requiredIf($this->has(['declared_value', 'price', 'sales_price'])), 'size:3'],
        ];
    }
}
