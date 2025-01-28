<?php

namespace Fleetbase\Http\Requests\Internal;

use Fleetbase\Http\Requests\FleetbaseRequest;

class DownloadFileRequest extends FleetbaseRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return $this->session()->has('user');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'id' => ['required', 'string', 'exists:files,uuid'],
        ];
    }

    /**
     * Get the validation rules error messages.
     *
     * @return array
     */
    public function messages()
    {
        return [
            'id.required' => 'Please provide a file ID.',
            'id.exists'   => 'The requested file does not exist.',
        ];
    }
}
