<?php

namespace Fleetbase\FleetOps\Http\Requests;

use Fleetbase\Http\Requests\FleetbaseRequest;
use Illuminate\Validation\Rule;

class CreateVendorRequest extends FleetbaseRequest
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
            'name'    => [Rule::requiredIf($this->isMethod('POST')), 'string'],
            'type'    => [Rule::requiredIf($this->isMethod('POST')), 'string'],
            'email'   => 'nullable|email',
            'phone'   => 'nullable',
            'address' => 'nullable|exists:places,public_id',
        ];
    }
}
