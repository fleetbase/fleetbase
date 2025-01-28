<?php

namespace Fleetbase\Rules;

use Illuminate\Contracts\Validation\Rule;

class ValidPhoneNumber implements Rule
{
    /**
     * Determine if the validation rule passes.
     *
     * Validates that the phone number starts with a '+' and is followed only by digits.
     *
     * @param string $attribute
     *
     * @return bool
     */
    public function passes($attribute, $value)
    {
        return preg_match('/^\+[0-9]+$/', $value) > 0;
    }

    /**
     * Get the validation error message.
     *
     * @return string
     */
    public function message()
    {
        return 'The :attribute must start with a "+" and include only numbers.';
    }
}
