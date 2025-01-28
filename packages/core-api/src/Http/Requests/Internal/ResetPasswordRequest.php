<?php

namespace Fleetbase\Http\Requests\Internal;

use Fleetbase\Http\Requests\FleetbaseRequest;

class ResetPasswordRequest extends FleetbaseRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'code'                  => ['required', 'exists:verification_codes,code'],
            'link'                  => ['required', 'exists:verification_codes,uuid'],
            'password'              => ['required', 'confirmed', 'min:4', 'max:24'],
            'password_confirmation' => ['required', 'min:4', 'max:24'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array
     */
    public function messages()
    {
        return [
            'code' => 'Invalid password reset request!',
            'link' => 'Invalid password reset request!',
        ];
    }
}
