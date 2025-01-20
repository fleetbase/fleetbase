<?php

namespace Fleetbase\FleetOps\Http\Requests;

use Fleetbase\FleetOps\Rules\ResolvablePoint;
use Fleetbase\Http\Requests\FleetbaseRequest;
use Fleetbase\Rules\ExistsInAny;
use Illuminate\Validation\Rule;

class CreatePlaceRequest extends FleetbaseRequest
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
            'name'      => [
                Rule::requiredIf(function () {
                    $isCreating     = $this->isMethod('POST');
                    $hasCoordiantes = $this->filled('latitude') && $this->filled('longitude');
                    $hasLocation    = $this->filled('location');
                    $hasStreet      = $this->filled('street1');

                    // if creating then it's required
                    if ($isCreating) {
                        // if either has coordinated or location then it's not required
                        if ($hasCoordiantes || $hasLocation) {
                            return false;
                        }

                        // if street1 provided then it's not required
                        if ($hasStreet) {
                            return false;
                        }

                        return true;
                    }

                    return false;
                }),
            ],
            'street1'   => [
                Rule::requiredIf(function () {
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
                }),
            ],
            'customer'  => ['nullable', new ExistsInAny(['vendors', 'contacts'], 'public_id')],
            'contact'   => ['nullable', new ExistsInAny(['vendors', 'contacts'], 'public_id')],
            'vendor'    => 'nullable|exists:vendors,public_id',
            'location'  => ['nullable', new ResolvablePoint()],
            'latitude'  => ['nullable', 'required_with:longitude'],
            'longitude' => ['nullable', 'required_with:latitude'],
        ];
    }
}
