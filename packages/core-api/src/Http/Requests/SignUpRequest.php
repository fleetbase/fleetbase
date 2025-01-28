<?php

namespace Fleetbase\Http\Requests;

use Illuminate\Contracts\Validation\Validator;

class SignUpRequest extends FleetbaseRequest
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
     * Get custom attributes for validator errors.
     *
     * @return array
     */
    public function attributes()
    {
        return collect(array_keys($this->rules()))
            ->mapWithKeys(function ($key) {
                return [$key => str_replace(['.', '_'], ' ', $key)];
            })
            ->toArray();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'user.name'                  => ['required'],
            'user.email'                 => ['required', 'email'],
            'user.password'              => ['required', 'confirmed', 'min:4', 'max:24'],
            'user.password_confirmation' => ['required'],
            'company.name'               => ['required'],
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
            '*.required'             => 'Your :attribute is required to signup',
            'user.email'             => 'You must enter a valid :attribute to signup',
            'user.email.unique'      => 'An account with this email address already exists',
            'user.password.required' => 'You must enter a password to signup',
        ];
    }
}
