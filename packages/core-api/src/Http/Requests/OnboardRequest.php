<?php

namespace Fleetbase\Http\Requests;

use Fleetbase\Rules\EmailDomainExcluded;
use Fleetbase\Rules\ExcludeWords;
use Fleetbase\Rules\ValidPhoneNumber;
use Illuminate\Validation\Rule;

class OnboardRequest extends FleetbaseRequest
{
    /**
     * Array of blacklisted words which cannot be used in onboard names and company names.
     *
     * @return array
     */
    protected $excludedWords = ['test', 'test123', 'abctest', 'testing', 'example', 'trial', 'trialing', 'asdf', '1234', 'asdas', 'dsdsds', 'dummy', 'xxxx', 'aaa', 'demo', 'zzz', 'zzzz', 'none'];

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
            'name'                  => ['required', 'min:2', 'regex:/^[a-zA-ZÀ-ÿ\'\-\. ]+$/u', new ExcludeWords($this->excludedWords)],
            'email'                 => ['required', 'email', Rule::unique('users', 'email')->whereNull('deleted_at'), new EmailDomainExcluded()],
            'phone'                 => ['required', new ValidPhoneNumber(), Rule::unique('users', 'phone')->whereNull('deleted_at')],
            'password'              => ['required', 'confirmed', 'min:4', 'max:24'],
            'password_confirmation' => ['required', 'min:4', 'max:24'],
            'organization_name'     => ['required', 'min:4'],
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
            '*.required'        => 'Your :attribute is required to signup',
            'email'             => 'You must enter a valid :attribute to signup',
            'email.unique'      => 'An account with this email address already exists',
            'phone.unique'      => 'An account with this phone number already exists',
            'password.required' => 'You must enter a password to signup',
        ];
    }
}
