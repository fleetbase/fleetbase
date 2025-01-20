<?php

namespace Fleetbase\FleetOps\Http\Requests;

use Fleetbase\FleetOps\Rules\ResolvablePoint;
use Fleetbase\Http\Requests\FleetbaseRequest;
use Illuminate\Validation\Rule;

class CreateDriverRequest extends FleetbaseRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return request()->is('navigator/v1/*') || request()->session()->has('api_credential') || request()->session()->has('is_sanctum_token');
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
            'name'      => [Rule::requiredIf($isCreating)],
            'email'     => [Rule::requiredIf($isCreating), Rule::when($this->filled('email'), ['email']), Rule::when($isCreating, [Rule::unique('users')->whereNull('deleted_at')])],
            'phone'     => [Rule::requiredIf($isCreating), Rule::when($isCreating, [Rule::unique('users')->whereNull('deleted_at')])],
            'password'  => 'nullable|string',
            'country'   => 'nullable|size:2',
            'city'      => 'nullable|string',
            'vehicle'   => 'nullable|string|starts_with:vehicle_|exists:drivers,public_id',
            'status'    => 'nullable|string|in:active,inactive',
            'vendor'    => 'nullable|exists:vendors,public_id',
            'job'       => 'nullable|exists:orders,public_id',
            'location'  => ['nullable', new ResolvablePoint()],
            'latitude'  => ['nullable', 'required_with:longitude'],
            'longitude' => ['nullable', 'required_with:latitude'],
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array
     */
    public function attributes()
    {
        return [
            'email' => 'email address',
            'phone' => 'phone number',
        ];
    }
}
