<?php

namespace Fleetbase\FleetOps\Http\Requests;

use Fleetbase\FleetOps\Rules\ComputableAlgo;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Requests\FleetbaseRequest;
use Illuminate\Validation\Rule;

class CreateServiceRateRequest extends FleetbaseRequest
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
            'service_name'                  => [Rule::requiredIf($this->isMethod('POST')), 'string'],
            'service_type'                  => [Rule::requiredIf($this->isMethod('POST')), 'string'],
            'service_area'                  => [Rule::exists('service_areas', 'public_id')->whereNull('deleted_at')],
            'zone'                          => [Rule::exists('zones', 'public_id')->whereNull('deleted_at')],
            'rate_calculation_method'       => [Rule::requiredIf($this->isMethod('POST')), 'string', 'in:fixed_meter,per_meter,per_drop,algo'],
            'currency'                      => ['required', 'size:3'],
            'base_fee'                      => ['numeric'],
            'per_meter_unit'                => ['required_if:rate_calculation_method,per_meter', 'string', 'in:km,m'],
            'per_meter_flat_rate_fee'       => ['required_if:rate_calculation_method,per_meter', 'numeric'],
            'meter_fees'                    => ['required_if:rate_calculation_method,fixed_meter', 'array'],
            'meter_fees.*.distance'         => ['numeric'],
            'meter_fees.*.fee'              => ['numeric'],
            'algorithm'                     => ['required_if:rate_calculation_method,algo', new ComputableAlgo(), 'string'],
            'has_cod_fee'                   => ['boolean'],
            'cod_calculation_method'        => [Rule::requiredIf(Utils::isTrue($this->input(['has_cod_fee']))), 'in:percentage,flat'],
            'cod_flat_fee'                  => [Rule::requiredIf($this->input('cod_calculation_method') === 'flat'), 'numeric'],
            'cod_percent'                   => [Rule::requiredIf($this->input('cod_calculation_method') === 'percentage'), 'integer'],
            'has_peak_hours_fee'            => ['boolean'],
            'peak_hours_calculation_method' => [Rule::requiredIf(Utils::isTrue($this->input('has_peak_hours'))), 'in:percentage,flat'],
            'peak_hours_flat_fee'           => [Rule::requiredIf($this->input('peak_hours_calculation_method') === 'flat'), 'numeric'],
            'peak_hours_percent'            => [Rule::requiredIf($this->input('peak_hours_calculation_method') === 'percentage'), 'integer'],
            'peak_hours_start'              => [Rule::requiredIf(Utils::isTrue($this->input('has_peak_hours'))), 'date_format:H:i'],
            'peak_hours_end'                => [Rule::requiredIf(Utils::isTrue($this->input('has_peak_hours'))), 'date_format:H:i'],
            'duration_terms'                => ['string'],
            'estimated_days'                => ['integer'],
        ];
    }
}
