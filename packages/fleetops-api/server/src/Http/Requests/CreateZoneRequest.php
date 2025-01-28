<?php

namespace Fleetbase\FleetOps\Http\Requests;

use Fleetbase\FleetOps\Rules\ResolvablePoint;
use Fleetbase\Http\Requests\FleetbaseRequest;
use Illuminate\Validation\Rule;

class CreateZoneRequest extends FleetbaseRequest
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
            'name'         => [Rule::requiredIf($this->isMethod('POST')), 'string'],
            'service_area' => [Rule::requiredIf($this->isMethod('POST')), 'exists:service_areas,public_id'],
            'border'       => ['nullable', Rule::requiredIf(function () {
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
            'location'     => ['nullable', new ResolvablePoint()],
            'latitude'     => ['nullable', 'required_with:longitude'],
            'longitude'    => ['nullable', 'required_with:latitude'],
            'status'       => ['nullable', 'in:active,inactive'],
        ];
    }
}
