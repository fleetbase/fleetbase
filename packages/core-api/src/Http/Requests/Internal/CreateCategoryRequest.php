<?php

namespace Fleetbase\Http\Requests\Internal;

use Fleetbase\Http\Requests\FleetbaseRequest;

class CreateCategoryRequest extends FleetbaseRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return $this->session()->has('company');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'category.name' => 'required|min:3',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array
     */
    public function messages()
    {
        return [
            'category.name.required' => 'The category name is required.',
            'category.name.min'      => 'The category name must be at least 3 characters.',
        ];
    }
}
