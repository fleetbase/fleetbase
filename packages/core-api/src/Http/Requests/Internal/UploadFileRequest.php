<?php

namespace Fleetbase\Http\Requests\Internal;

use Fleetbase\Http\Requests\FleetbaseRequest;

class UploadFileRequest extends FleetbaseRequest
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
            'file' => [
                'required',
                'file',
                'max:104857600', // 100 MB
                'mimetypes:' . implode(',', [
                    'image/jpeg',
                    'image/png',
                    'image/bmp',
                    'image/tiff',
                    'image/svg+xml',
                    'image/svg',
                    'application/pdf',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'text/csv',
                    'text/tab-separated-values',
                    'text/plain',
                    'text/javascript',
                    'application/x-pkcs12',
                    'application/pkcs-12',
                    'application/x-pem-file',
                    'application/x-pkcs7-certreqresp',
                    'application/x-pkcs7-certificates',
                    'application/pkix-cert',
                    'application/x-x509-ca-cert',
                    'application/octet-stream',
                    'application/json',
                    'application/zip',
                    'application/x-zip',
                    'application/x-zip-compressed',
                    'application/x-compressed',
                    'multipart/x-zip',
                    'application/x-tar',
                    'application/gzip',
                    'application/x-gzip',
                    'application/x-tgz',
                    'application/x-bzip2',
                    'application/x-xz',
                    'application/vnd.ms-powerpoint',
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                ]),
            ],
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
            'file.required' => 'Please select a file to upload.',
            'file.file'     => 'The uploaded file is not valid.',
            'file.max'      => 'The uploaded file exceeds the maximum file size allowed.',
            'file.mimes'    => 'The uploaded file type is not allowed.',
        ];
    }
}
