<?php

namespace Fleetbase\FleetOps\Rules;

use Fleetbase\Rules\ExistsInAny;
use Illuminate\Contracts\Validation\Rule;

class CustomerIdOrDetails implements Rule
{
    /**
     * The custom error message.
     *
     * @var string
     */
    protected $message;

    /**
     * The tables to check for customer ID existence.
     *
     * @var array
     */
    protected $tables = [];

    /**
     * The column to check in the tables.
     */
    protected string|array $column = 'public_id';

    /**
     * Create a new rule instance.
     *
     * @param string|array $column
     *
     * @return void
     */
    public function __construct(array $tables = ['vendors', 'contacts'], $column = 'public_id')
    {
        $this->tables  = $tables;
        $this->column  = $column;
        $this->message = 'The :attribute is invalid.';
    }

    /**
     * Determine if the validation rule passes.
     *
     * @param string $attribute
     *
     * @return bool
     */
    public function passes($attribute, $value)
    {
        // If the value is a string, validate as customer ID
        if (is_string($value)) {
            $existsRule = new ExistsInAny($this->tables, $this->column);

            return $existsRule->passes($attribute, $value);
        }

        // If the value is an array, validate the structure
        if (is_array($value)) {
            // Check for at least 'name' or 'email'
            if (!array_key_exists('name', $value) && !array_key_exists('email', $value)) {
                $this->message = 'The :attribute must have at least a name and email.';

                return false;
            }

            // If 'email' is present, validate its format
            if (array_key_exists('email', $value)) {
                if (!filter_var($value['email'], FILTER_VALIDATE_EMAIL)) {
                    $this->message = 'The :attribute email must be a valid email address.';

                    return false;
                }
            }

            // If 'name' is present, ensure it's a non-empty string
            if (array_key_exists('name', $value)) {
                if (!is_string($value['name']) || empty(trim($value['name']))) {
                    $this->message = 'The :attribute name must be a non-empty string.';

                    return false;
                }
            }

            // Optionally, you can add more validations for the array here

            return true;
        }

        // If the value is neither a string nor an array, fail validation
        $this->message = 'The :attribute must be either a string (customer ID) or an object with name and/or email.';

        return false;
    }

    /**
     * Get the validation error message.
     *
     * @return string
     */
    public function message()
    {
        return $this->message;
    }
}
