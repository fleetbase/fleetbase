<?php

namespace Fleetbase\Casts;

use Fleetbase\Support\Utils;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Support\Str;

class Money implements CastsAttributes
{
    /**
     * Cast the given value.
     *
     * @param \Illuminate\Database\Eloquent\Model $model
     * @param string                              $key
     * @param array                               $attributes
     */
    public function get($model, $key, $value, $attributes)
    {
        return $value;
    }

    /**
     * Prepare the given value for storage.
     *
     * @param \Illuminate\Database\Eloquent\Model $model
     * @param string                              $key
     * @param array                               $attributes
     */
    public function set($model, $key, $value, $attributes)
    {
        if ($value === null) {
            return 0;
        }
        $value = $this->removeCurrencySymbols($value);
        $value = $this->removeSpecialCharactersExceptDotAndComma($value);
        if (is_float($value) || Str::contains($value, '.')) {
            $value = number_format((float) $value, 2, '.', '');
        }

        return Utils::numbersOnly($value);
    }

    /**
     * Removes common currency symbols from a given string.
     *
     * This function uses a regular expression to identify and strip out
     * common currency symbols such as the Dollar ($), Euro (€), Pound (£),
     * Yen (¥), Indian Rupee (₹), Cent (¢), Thai Baht (฿), Russian Ruble (₽),
     * Israeli New Shekel (₪), and Korean Won (₩) from the input string.
     *
     * @param string $string the string from which currency symbols will be removed
     *
     * @return string The input string with currency symbols removed.
     *
     * Example usage:
     * $price = "$123.45";
     * $cleanPrice = removeCurrencySymbols($price);
     * // $cleanPrice will be "123.45"
     */
    private function removeCurrencySymbols($string)
    {
        $currencySymbols = '/[\$€£¥₹¢฿₽₪₩₮]/';
        $cleanString     = preg_replace($currencySymbols, '', $string);

        return $cleanString;
    }

    /**
     * Removes all special characters from a given string except for periods (.) and commas (,).
     *
     * This function is designed to clean a string by removing special characters
     * and leaving only numeric characters, periods, and commas. This can be particularly
     * useful for processing strings representing monetary values where the currency symbol
     * and other special characters need to be removed.
     *
     * Note: This function assumes that periods and commas are used in the numeric context
     * (as decimal or thousand separators). It may not be suitable for strings where
     * periods and commas are used in other contexts.
     *
     * @param string $string the string to be cleaned of special characters
     *
     * @return string The cleaned string with only numbers, periods, and commas.
     *
     * Example usage:
     * $price = "$1,234.56";
     * $cleanPrice = removeSpecialCharactersExceptDotAndComma($price);
     * // $cleanPrice will be "1,234.56"
     */
    public function removeSpecialCharactersExceptDotAndComma($string)
    {
        $cleanString = preg_replace('/[^\d.,]/', '', $string);

        return $cleanString;
    }
}
