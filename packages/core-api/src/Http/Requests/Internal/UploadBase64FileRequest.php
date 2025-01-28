<?php

namespace Fleetbase\Http\Requests\Internal;

use Fleetbase\Http\Requests\FleetbaseRequest;

class UploadBase64FileRequest extends FleetbaseRequest
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
            'data'         => ['required'],
            'file_name'    => ['required'],
            'file_type'    => ['nullable', 'string'],
            'content_type' => ['nullable', 'string'],
            'subject_uuid' => ['nullable', 'string'],
            'subject_type' => ['nullable', 'string'],
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
            'data.required'      => 'Please provide a base64 encoded file.',
            'file_name.required' => 'Please provide a file name.',
        ];
    }
}
