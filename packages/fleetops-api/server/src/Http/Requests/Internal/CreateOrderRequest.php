<?php

namespace Fleetbase\FleetOps\Http\Requests\Internal;

use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Requests\FleetbaseRequest;
use Fleetbase\Rules\ExistsInAny;
use Fleetbase\Support\Auth;

class CreateOrderRequest extends FleetbaseRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return Auth::can('fleet-ops create order');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        $validations = [
            // 'order_config_uuid' => ['required'],
            'adhoc'             => ['nullable', 'boolean'],
            'dispatch'          => ['nullable', 'boolean'],
            'adhoc_distance'    => ['nullable', 'numeric'],
            'pod_required'      => ['nullable', 'boolean'],
            'pod_method'        => ['nullable', 'in:' . config('fleetops.pod_methods')],
            'scheduled_at'      => ['nullable', 'date'],
            'driver'            => ['nullable', 'exists:drivers,uuid'],
            'service_quote'     => ['nullable', 'exists:service_quotes,uuid'],
            'purchase_rate'     => ['nullable', 'exists:purchase_rates,uuid'],
            'facilitator'       => ['nullable', new ExistsInAny(['vendors', 'contacts', 'integrated_vendors'], ['uuid', 'provider'])],
            'customer'          => ['nullable', new ExistsInAny(['vendors', 'contacts'], 'uuid')],
            'status'            => ['nullable', 'string'],
            'type'              => ['nullable', 'string'],
        ];

        // Conditionally require 'pod_method' if 'pod_required' is truthy
        if (Utils::isTrue($this->input('order.pod_required'))) {
            $validations['pod_method'] = ['required', 'in:' . config('fleetops.pod_methods')];
        }

        if ($this->has('payload')) {
            $validations['payload.entities']  = 'array';
            $validations['payload.waypoints'] = 'array';

            if ($this->isArray('payload')) {
                $validations['payload']         = 'required';

                if ($this->missing('payload.waypoints')) {
                    $validations['payload.pickup_uuid']  = 'required';
                    $validations['payload.dropoff_uuid'] = 'required';
                }

                if ($this->missing(['payload.pickup', 'payload.dropoff'])) {
                    $validations['payload.waypoints'] = 'required|array|min:2';
                }

                $validations['payload.return_uuid']  = 'nullable';
            }
        }

        return $validations;
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'pod_method.required'   => 'A proof of delivery method is required.',
        ];
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
