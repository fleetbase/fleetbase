<?php

namespace Fleetbase\Rules;

use Illuminate\Contracts\Validation\Rule;

class EmailDomainExcluded implements Rule
{
    /**
     * Array holding the list of disallowed email domains.
     * Domains are used as array keys for fast lookup.
     *
     * @var array
     */
    protected $domains;

    /**
     * Constructs the rule and initializes the list of disallowed email domains.
     * Loads the domains from a file and flips them to use domains as array keys for faster checks.
     */
    public function __construct()
    {
        // Load the list of disposable email domains from a file and flip the array to use the domains as keys
        $this->domains = array_flip(file(base_path('vendor/fleetbase/core-api/storage/disposable_emails.txt'), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES));
    }

    /**
     * Determine if the validation rule passes.
     * The rule is passed if the domain part of the email address is not found in the list of disallowed domains.
     *
     * @param string $attribute the name of the attribute being validated
     * @param mixed  $value     the value of the attribute being validated, expected to be an email address
     *
     * @return bool returns true if the domain of the email is allowed, false otherwise
     */
    public function passes($attribute, $value)
    {
        // Extract the domain part from the email address
        $emailDomain = substr(strrchr($value, '@'), 1);

        // Check if the extracted domain is in the list of disallowed domains
        return !isset($this->domains[$emailDomain]);
    }

    /**
     * Get the validation error message that will be used when the validation fails.
     * Provides a message indicating that the email domain is not allowed.
     *
     * @return string the validation error message
     */
    public function message()
    {
        return 'The email domain is not allowed.';
    }
}
