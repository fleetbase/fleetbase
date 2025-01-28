<?php

namespace Fleetbase\Http\Requests;

use Illuminate\Contracts\Validation\Validator;

class TwoFaValidationRequest extends FleetbaseRequest
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

    protected function failedValidation(Validator $validator)
    {
        $errors   = $validator->errors();
        $response = [
            'errors' => [$errors->first()],
        ];
        // if more than one error display the others
        if ($errors->count() > 1) {
            $response['errors'] = collect($errors->all())
                ->values()
                ->toArray();
        }

        return response()->json($response, 422);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'token'    => 'required',
            'identity' => 'required|email|exists:users,email',
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
            'identity.required'    => 'Email or phone number is required',
            'identity.exists'      => 'No user found by this email',
            'identity.email'       => 'Email used is invalid',
            'identity.phone'       => 'Phone Number used is invalid',
            'token.required'       => 'A two factor session token is required',
        ];
    }
}
