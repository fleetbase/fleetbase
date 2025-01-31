<?php

namespace Fleetbase\Support;

use Fleetbase\Models\Company;
use Fleetbase\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use libphonenumber\NumberParseException;
use libphonenumber\PhoneNumberFormat;
use libphonenumber\PhoneNumberUtil;
use PragmaRX\Countries\Package\Countries;

/**
 * Class ParsePhone
 * Utility class for phone number parsing and formatting.
 */
class ParsePhone
{
    /**
     * Get an instance of PhoneNumberUtil.
     *
     * @return PhoneNumberUtil
     */
    public static function phoneNumberUtilInstance()
    {
        return PhoneNumberUtil::getInstance();
    }

    /**
     * Parse and format a phone number from an Eloquent model.
     *
     * @param Model $model   the Eloquent model to extract phone number data from
     * @param array $options additional options for parsing and formatting
     * @param int   $format  The phone number format. Defaults to E164.
     *
     * @return string|null formatted phone number or null
     */
    public static function fromModel(Model $model, $options = [], $format = PhoneNumberFormat::E164)
    {
        $phoneUtil    = static::phoneNumberUtilInstance();
        $phone        = Utils::or($model, ['phone', 'phone_number', 'tel', 'telephone']);
        $country      = Utils::or($model, ['country']);
        $currency     = Utils::or($model, ['currency']);
        $timezone     = Utils::or($model, ['timezone']);
        $parsedNumber = '';

        // if no phone number return null
        if (!$phone) {
            return $phone;
        }

        // if country code is already supplied to phone number
        if (Str::startsWith($phone, '+')) {
            try {
                $parsedNumber = $phoneUtil->parse($phone);
            } catch (NumberParseException $e) {
                // silence...
            }

            if ($phoneUtil->isValidNumber($parsedNumber)) {
                return $phoneUtil->format($parsedNumber, $format);
            }
        }

        if (!$country || !$currency || !$timezone) {
            if (isset($options['country']) && !$country) {
                $country = $options['country'];
            }

            if (isset($options['currency']) && !$currency) {
                $currency = $options['currency'];
            }

            if (isset($options['timezone']) && !$timezone) {
                $timezone = $options['timezone'];
            }
        }

        if (!$country || !$currency || !$timezone) {
            // lookup country from current org
            $company = Auth::getCompany();

            if (!$country) {
                $country = Utils::get($company, 'country');
            }

            if (!$currency) {
                $currency = Utils::get($company, 'currency');
            }

            if (!$timezone) {
                $timezone = Utils::get($company, 'timezone');
            }
        }

        // if model has valid iso2 country code
        if ($country && strlen($country) === 2) {
            try {
                $parsedNumber = $phoneUtil->parse($phone, $country);
            } catch (NumberParseException $e) {
                // silence...
            }

            if ($phoneUtil->isValidNumber($parsedNumber)) {
                return $phoneUtil->format($parsedNumber, $format);
            }
        }

        // if model has iso3 currency
        if ($currency && strlen($currency) === 3) {
            $country = Countries::where('currencies.0', $currency)->first();
            if ($country) {
                $country = $country->cca2;
            }

            try {
                $parsedNumber = $phoneUtil->parse($phone, $country);
            } catch (NumberParseException $e) {
                // silence...
            }

            if ($phoneUtil->isValidNumber($parsedNumber)) {
                return $phoneUtil->format($parsedNumber, $format);
            }
        }

        // if model has timezone
        if ($timezone) {
            $country = Utils::findCountryFromTimezone($timezone)->first();
            if ($country) {
                $country = $country->cca2;
            }

            try {
                $parsedNumber = $phoneUtil->parse($phone, $country);
            } catch (NumberParseException $e) {
                // silence...
            }

            if ($phoneUtil->isValidNumber($parsedNumber)) {
                return $phoneUtil->format($parsedNumber, $format);
            }
        }

        return $phone;
    }

    /**
     * Parse and format a phone number from a Company model.
     *
     * @param Company $company the Company model to extract phone number data from
     * @param array   $options additional options for parsing and formatting
     * @param int     $format  The phone number format. Defaults to E164.
     *
     * @return string|null formatted phone number or null
     */
    public static function fromCompany(Company $company, $options = [], $format = PhoneNumberFormat::E164)
    {
        return static::fromModel($company, $options, $format);
    }

    /**
     * Parse and format a phone number from a User model.
     *
     * @param User  $user    the User model to extract phone number data from
     * @param array $options additional options for parsing and formatting
     * @param int   $format  The phone number format. Defaults to E164.
     *
     * @return string|null formatted phone number or null
     */
    public static function fromUser(User $user, $options = [], $format = PhoneNumberFormat::E164)
    {
        return static::fromModel($user, $options, $format);
    }
}
