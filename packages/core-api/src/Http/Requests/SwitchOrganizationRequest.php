<?php

namespace Fleetbase\Http\Requests;

use Fleetbase\Support\Http;

class SwitchOrganizationRequest extends FleetbaseRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return $this->session()->exists('user');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'next' => ['required', Http::isPublicRequest() ? 'exists:companies,public_id' : 'exists:companies,uuid'],
        ];
    }
}
