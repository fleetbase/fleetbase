<?php

namespace Fleetbase\FleetOps\Http\Requests;

use Fleetbase\FleetOps\Rules\ResolvablePoint;
use Fleetbase\Http\Requests\FleetbaseRequest;
use Illuminate\Validation\Rule;

class CreateServiceAreaRequest extends FleetbaseRequest
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
            'country' => [Rule::requiredIf($this->isMethod('POST')), 'string'],
            'status'  => 'in:active,inactive',
            'border'  => ['nullable', Rule::requiredIf(function () {
                $isCreating     = $this->isMethod('POST');
                $hasCoordiantes = $this->filled('latitude') && $this->filled('longitude');
                $hasLocation    = $this->filled('location');

                // if creating then it's required
                if ($isCreating) {
                    // if either has coordinated or location then it's not required
                    if ($hasCoordiantes || $hasLocation) {
                        return false;
                    }

                    return true;
                }

                return false;
            })],
            'parent'    => ['nullable', 'exists:service_areas,public_id'],
            'location'  => ['nullable', new ResolvablePoint()],
            'latitude'  => ['nullable', 'required_with:longitude'],
            'longitude' => ['nullable', 'required_with:latitude'],
        ];
    }
}
