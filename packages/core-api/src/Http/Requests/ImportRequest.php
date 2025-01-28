<?php

namespace Fleetbase\Http\Requests;

use Fleetbase\Models\File;

class ImportRequest extends FleetbaseRequest
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
            'files' => ['required', 'array', 'exists:files,uuid',
                function ($attribute, $value, $fail) {
                    foreach ($value as $uuid) {
                        $file = File::where('uuid', $uuid)->first();
                        if (!$file) {
                            return $fail('One of the files sent for import is invalid.');
                        }

                        $validExtensions = ['csv', 'tsv', 'xls', 'xlsx'];
                        $extension       = pathinfo($file->path, PATHINFO_EXTENSION);
                        if (!in_array($extension, $validExtensions)) {
                            return $fail('The file (' . $file->original_filename . ') format with the extension ' . $extension . ' is not valid for import.');
                        }
                    }
                }],
        ];
    }
}
