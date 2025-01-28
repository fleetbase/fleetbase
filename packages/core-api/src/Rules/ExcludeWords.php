<?php

namespace Fleetbase\Rules;

use Illuminate\Contracts\Validation\Rule;

class ExcludeWords implements Rule
{
    /**
     * Array of words to exclude.
     *
     * @var array
     */
    protected $words = [];

    /**
     * Custom validation message.
     *
     * @var string
     */
    protected $validationMessage;

    /**
     * Constructor to initialize the list of forbidden words.
     * Words are transformed to lowercase to ensure case-insensitive comparison.
     *
     * @param array $words the words to exclude
     */
    public function __construct(array $words)
    {
        $this->words = static::makeInsensitiveArray($words);
    }

    /**
     * Determine if the validation rule passes.
     * The rule passes if none of the provided forbidden words are present in the attribute.
     *
     * @param string $attribute the name of the attribute being validated
     * @param mixed  $value     the value of the attribute being validated
     *
     * @return bool returns true if validation passes, otherwise false
     */
    public function passes($attribute, $value)
    {
        // Normalize the input to lower case and split on non-word characters, ignoring empty results.
        $segments = static::makeInsensitiveArray(preg_split('/\W+/', $value, -1, PREG_SPLIT_NO_EMPTY));

        // Track any forbidden words found in the input.
        $foundWords = [];

        foreach ($this->words as $word) {
            if (in_array($word, $segments)) {
                $foundWords[] = $word;
            }
        }

        if (!empty($foundWords)) {
            $this->validationMessage = 'The :attribute contains forbidden words: ' . implode(', ', $foundWords) . '.';

            return false;
        }

        return true;
    }

    /**
     * Get the validation error message.
     * Returns a custom message if forbidden words are found, otherwise a default message.
     *
     * @return string the validation error message
     */
    public function message()
    {
        return $this->validationMessage ?? 'The :attribute contains forbidden words.';
    }

    /**
     * Helper function to convert an array of strings to lower case.
     * This function ensures case-insensitive comparison by converting all elements of the array to lowercase.
     *
     * @param array $array the array of strings to be converted
     *
     * @return array the array with all strings converted to lowercase
     */
    private static function makeInsensitiveArray(array $array): array
    {
        return array_map('strtolower', $array);
    }
}
