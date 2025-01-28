<?php

namespace Fleetbase\Http\Requests;

use Illuminate\Validation\Rule;

class CreateChatChannelRequest extends FleetbaseRequest
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
            'name'         => [Rule::requiredIf($this->isMethod('POST'))],
        ];
    }
}
