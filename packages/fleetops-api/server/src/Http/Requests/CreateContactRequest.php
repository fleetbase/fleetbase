<?php

namespace Fleetbase\FleetOps\Http\Requests;

use Fleetbase\Http\Requests\FleetbaseRequest;
use Illuminate\Validation\Rules\RequiredIf;

class CreateContactRequest extends FleetbaseRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return request()->session()->has('storefront_key') || request()->session()->has('api_credential') || request()->session()->has('is_sanctum_token');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'name'  => ['required'],
            'type'  => [new RequiredIf($this->isMethod('POST'))],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable'],
        ];
    }
}
