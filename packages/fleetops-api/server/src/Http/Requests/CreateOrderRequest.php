<?php

namespace Fleetbase\FleetOps\Http\Requests;

use Fleetbase\FleetOps\Rules\CustomerIdOrDetails;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Requests\FleetbaseRequest;
use Fleetbase\Rules\ExistsInAny;

class CreateOrderRequest extends FleetbaseRequest
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
        $validations = [
            'adhoc'             => ['nullable', 'boolean'],
            'dispatch'          => ['nullable', 'boolean'],
            'adhoc_distance'    => ['nullable', 'numeric'],
            'pod_required'      => ['nullable', 'boolean'],
            'pod_method'        => ['nullable', 'in:' . config('fleetops.pod_methods')],
            'scheduled_at'      => ['nullable', 'date'],
            'driver'            => ['nullable', 'exists:drivers,public_id'],
            'service_quote'     => ['nullable', 'exists:service_quotes,public_id'],
            'purchase_rate'     => ['nullable', 'exists:purchase_rates,public_id'],
            'facilitator'       => ['nullable', new ExistsInAny(['vendors', 'contacts', 'integrated_vendors'], ['public_id', 'provider'])],
            'customer'          => ['nullable', new CustomerIdOrDetails(['vendors', 'contacts'], 'public_id')],
            'status'            => ['nullable', 'string'],
            'type'              => ['string'],
        ];

        // Conditionally require 'pod_method' if 'pod_required' is truthy
        if (Utils::isTrue($this->input('pod_required'))) {
            $validations['pod_method'] = ['required', 'in:' . implode(',', config('fleetops.pod_methods'))];
        }

        if ($this->has('payload')) {
            $validations['payload.entities']  = 'array';
            $validations['payload.waypoints'] = 'array';

            if ($this->isArray('payload')) {
                $validations['payload']         = 'required';

                if ($this->missing('payload.waypoints')) {
                    $validations['payload.pickup']  = 'required';
                    $validations['payload.dropoff'] = 'required';
                }

                if ($this->missing(['payload.pickup', 'payload.dropoff'])) {
                    $validations['payload.waypoints'] = 'required|array|min:2';
                }

                $validations['payload.return']  = 'nullable';
            }

            if ($this->isString('payload')) {
                $validations['payload'] = 'required|exists:payloads,public_id';
            }
        }

        if ($this->missing('payload') && $this->isMethod('POST')) {
            if ($this->missing('waypoints')) {
                $validations['pickup']  = 'required';
                $validations['dropoff'] = 'required';
            }

            if ($this->missing(['pickup', 'dropoff'])) {
                $validations['waypoints'] = 'required|array|min:2';
            }
        }

        return $validations;
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'pod_required' => 'proof of delivery required',
            'pod_method'   => 'proof of delivery method',
        ];
    }
}
