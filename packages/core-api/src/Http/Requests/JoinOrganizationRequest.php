<?php

namespace Fleetbase\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class JoinOrganizationRequest extends FormRequest
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
            'next' => 'required|exists:companies,public_id',
        ];
    }
}
