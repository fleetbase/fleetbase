<?php

namespace Fleetbase\Types;

use Fleetbase\Exceptions\CurrencyException;

class Currency implements \JsonSerializable
{
    /**
     * ISO-4217 Currency Code.
     *
     * @var string
     */
    protected $code;

    /**
     * Currency symbol.
     *
     * @var string
     */
    protected $symbol;

    /**
     * Currency precision (number of decimals).
     *
     * @var int
     */
    protected $precision;

    /**
     * Currency title.
     *
     * @var string
     */
    protected $title;

    /**
     * Currency thousand separator.
     *
     * @var string
     */
    protected $thousandSeparator;

    /**
     * Currency decimal separator.
     *
     * @var string
     */
    protected $decimalSeparator;

    /**
     * Currency symbol placement.
     *
     * @var string (front|after) currency
     */
    protected $symbolPlacement;

    /**
     * Currency Formats.
     *
     * Formats initially collected from
     * http://www.joelpeterson.com/blog/2011/03/formatting-over-100-currencies-in-php/
     *
     * All currencies were validated against some trusted
     * sources like Wikipedia, thefinancials.com and
     * cldr.unicode.org.
     *
     * Please note that each format used on each currency is
     * the format for that particular country/language.
     * When the country is unknown, the English format is used.
     *
     * @todo REFACTOR! This should be located on a separated file. Working on that!
     *
     * @var array
     */
    private static $currencies = [
        'ARS' => [
            'code'              => 'ARS',
            'title'             => 'Argentine Peso',
            'symbol'            => 'AR$',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'AMD' => [
            'code'              => 'AMD',
            'title'             => 'Armenian Dram',
            'symbol'            => 'Դ',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'AWG' => [
            'code'              => 'AWG',
            'title'             => 'Aruban Guilder',
            'symbol'            => 'Afl. ',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'AUD' => [
            'code'              => 'AUD',
            'title'             => 'Australian Dollar',
            'symbol'            => 'AU$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'BSD' => [
            'code'              => 'BSD',
            'title'             => 'Bahamian Dollar',
            'symbol'            => 'B$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'BHD' => [
            'code'              => 'BHD',
            'title'             => 'Bahraini Dinar',
            'symbol'            => null,
            'precision'         => 3,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'BDT' => [
            'code'              => 'BDT',
            'title'             => 'Bangladesh, Taka',
            'symbol'            => null,
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'BZD' => [
            'code'              => 'BZD',
            'title'             => 'Belize Dollar',
            'symbol'            => 'BZ$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'BMD' => [
            'code'              => 'BMD',
            'title'             => 'Bermudian Dollar',
            'symbol'            => 'BD$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'BOB' => [
            'code'              => 'BOB',
            'title'             => 'Bolivia, Boliviano',
            'symbol'            => 'Bs',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'BAM' => [
            'code'              => 'BAM',
            'title'             => 'Bosnia and Herzegovina convertible mark',
            'symbol'            => 'KM ',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'BWP' => [
            'code'              => 'BWP',
            'title'             => 'Botswana, Pula',
            'symbol'            => 'p',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'BRL' => [
            'code'              => 'BRL',
            'title'             => 'Brazilian Real',
            'symbol'            => 'R$',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'BND' => [
            'code'              => 'BND',
            'title'             => 'Brunei Dollar',
            'symbol'            => 'B$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'CAD' => [
            'code'              => 'CAD',
            'title'             => 'Canadian Dollar',
            'symbol'            => 'CA$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'KYD' => [
            'code'              => 'KYD',
            'title'             => 'Cayman Islands Dollar',
            'symbol'            => 'CI$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'CLP' => [
            'code'              => 'CLP',
            'title'             => 'Chilean Peso',
            'symbol'            => 'CLP$',
            'precision'         => 0,
            'thousandSeparator' => '.',
            'decimalSeparator'  => '',
            'symbolPlacement'   => 'before',
        ],
        'CNY' => [
            'code'              => 'CNY',
            'title'             => 'China Yuan Renminbi',
            'symbol'            => 'CN¥',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'COP' => [
            'code'              => 'COP',
            'title'             => 'Colombian Peso',
            'symbol'            => 'COL$',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'CRC' => [
            'code'              => 'CRC',
            'title'             => 'Costa Rican Colon',
            'symbol'            => '₡',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'HRK' => [
            'code'              => 'HRK',
            'title'             => 'Croatian Kuna',
            'symbol'            => ' kn',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'after',
        ],
        'CUC' => [
            'code'              => 'CUC',
            'title'             => 'Cuban Convertible Peso',
            'symbol'            => 'CUC$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'CUP' => [
            'code'              => 'CUP',
            'title'             => 'Cuban Peso',
            'symbol'            => 'CUP$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'CYP' => [
            'code'              => 'CYP',
            'title'             => 'Cyprus Pound',
            'symbol'            => '£',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'CZK' => [
            'code'              => 'CZK',
            'title'             => 'Czech Koruna',
            'symbol'            => ' Kč',
            'precision'         => 2,
            'thousandSeparator' => ' ',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'after',
        ],
        'DKK' => [
            'code'              => 'DKK',
            'title'             => 'Danish Krone',
            'symbol'            => ' kr.',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'after',
        ],
        'DOP' => [
            'code'              => 'DOP',
            'title'             => 'Dominican Peso',
            'symbol'            => 'RD$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'XCD' => [
            'code'              => 'XCD',
            'title'             => 'East Caribbean Dollar',
            'symbol'            => 'EC$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'EGP' => [
            'code'              => 'EGP',
            'title'             => 'Egyptian Pound',
            'symbol'            => 'EGP',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'SVC' => [
            'code'              => 'SVC',
            'title'             => 'El Salvador Colon',
            'symbol'            => '₡',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'EUR' => [
            'code'              => 'EUR',
            'title'             => 'Euro',
            'symbol'            => '€ ',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'GEL' => [
            'code'              => 'GEL',
            'title'             => 'Georgian lari',
            'symbol'            => '₾',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'GHC' => [
            'code'              => 'GHC',
            'title'             => 'Ghana, Cedi',
            'symbol'            => 'GH₵',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'GIP' => [
            'code'              => 'GIP',
            'title'             => 'Gibraltar Pound',
            'symbol'            => '£',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'GTQ' => [
            'code'              => 'GTQ',
            'title'             => 'Guatemala, Quetzal',
            'symbol'            => 'Q',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'HNL' => [
            'code'              => 'HNL',
            'title'             => 'Honduras, Lempira',
            'symbol'            => 'L',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'HKD' => [
            'code'              => 'HKD',
            'title'             => 'Hong Kong Dollar',
            'symbol'            => 'HK$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'HUF' => [
            'code'              => 'HUF',
            'title'             => 'Hungary, Forint',
            'symbol'            => ' Ft',
            'precision'         => 0,
            'thousandSeparator' => ' ',
            'decimalSeparator'  => '',
            'symbolPlacement'   => 'after',
        ],
        'ISK' => [
            'code'              => 'ISK',
            'title'             => 'Iceland Krona',
            'symbol'            => ' kr',
            'precision'         => 0,
            'thousandSeparator' => '.',
            'decimalSeparator'  => '',
            'symbolPlacement'   => 'after',
        ],
        'INR' => [
            'code'              => 'INR',
            'title'             => 'Indian Rupee ₹',
            'symbol'            => '₹',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'IDR' => [
            'code'              => 'IDR',
            'title'             => 'Indonesia, Rupiah',
            'symbol'            => 'Rp',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'IRR' => [
            'code'              => 'IRR',
            'title'             => 'Iranian Rial',
            'symbol'            => null,
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'JMD' => [
            'code'              => 'JMD',
            'title'             => 'Jamaican Dollar',
            'symbol'            => 'J$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'JPY' => [
            'code'              => 'JPY',
            'title'             => 'Japan, Yen',
            'symbol'            => '¥',
            'precision'         => 0,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '',
            'symbolPlacement'   => 'before',
        ],
        'JOD' => [
            'code'              => 'JOD',
            'title'             => 'Jordanian Dinar',
            'symbol'            => null,
            'precision'         => 3,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'KES' => [
            'code'              => 'KES',
            'title'             => 'Kenyan Shilling',
            'symbol'            => 'KSh',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'KWD' => [
            'code'              => 'KWD',
            'title'             => 'Kuwaiti Dinar',
            'symbol'            => 'K.D.',
            'precision'         => 3,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'LVL' => [
            'code'              => 'LVL',
            'title'             => 'Latvian Lats',
            'symbol'            => 'Ls',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'LBP' => [
            'code'              => 'LBP',
            'title'             => 'Lebanese Pound',
            'symbol'            => 'LBP',
            'precision'         => 0,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '',
            'symbolPlacement'   => 'before',
        ],
        'LTL' => [
            'code'              => 'LTL',
            'title'             => 'Lithuanian Litas',
            'symbol'            => ' Lt',
            'precision'         => 2,
            'thousandSeparator' => ' ',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'after',
        ],
        'MKD' => [
            'code'              => 'MKD',
            'title'             => 'Macedonia, Denar',
            'symbol'            => 'ден ',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'MNT' => [
            'code'              => 'MNT',
            'title'             => 'Mongolian tugrik',
            'symbol'            => '₮',
            'precision'         => 0,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '',
            'symbolPlacement'   => 'before',
        ],
        'MYR' => [
            'code'              => 'MYR',
            'title'             => 'Malaysian Ringgit',
            'symbol'            => 'RM',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'MTL' => [
            'code'              => 'MTL',
            'title'             => 'Maltese Lira',
            'symbol'            => 'Lm',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'MUR' => [
            'code'              => 'MUR',
            'title'             => 'Mauritius Rupee',
            'symbol'            => 'Rs',
            'precision'         => 0,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '',
            'symbolPlacement'   => 'before',
        ],
        'MXN' => [
            'code'              => 'MXN',
            'title'             => 'Mexican Peso',
            'symbol'            => 'MX$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'MZM' => [
            'code'              => 'MZM',
            'title'             => 'Mozambique Metical',
            'symbol'            => 'MT',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'NPR' => [
            'code'              => 'NPR',
            'title'             => 'Nepalese Rupee',
            'symbol'            => null,
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'ANG' => [
            'code'              => 'ANG',
            'title'             => 'Netherlands Antillian Guilder',
            'symbol'            => 'NAƒ ',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'ILS' => [
            'code'              => 'ILS',
            'title'             => 'New Israeli Shekel ₪',
            'symbol'            => ' ₪',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'after',
        ],
        'TRY' => [
            'code'              => 'TRY',
            'title'             => 'New Turkish Lira',
            'symbol'            => '₺',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'NZD' => [
            'code'              => 'NZD',
            'title'             => 'New Zealand Dollar',
            'symbol'            => 'NZ$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'NOK' => [
            'code'              => 'NOK',
            'title'             => 'Norwegian Krone',
            'symbol'            => 'kr ',
            'precision'         => 2,
            'thousandSeparator' => ' ',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'PKR' => [
            'code'              => 'PKR',
            'title'             => 'Pakistan Rupee',
            'symbol'            => null,
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'PEN' => [
            'code'              => 'PEN',
            'title'             => 'Peru, Nuevo Sol',
            'symbol'            => 'S/.',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'UYU' => [
            'code'              => 'UYU',
            'title'             => 'Peso Uruguayo',
            'symbol'            => '$U ',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'PHP' => [
            'code'              => 'PHP',
            'title'             => 'Philippine Peso',
            'symbol'            => '₱',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'PLN' => [
            'code'              => 'PLN',
            'title'             => 'Poland, Zloty',
            'symbol'            => ' zł',
            'precision'         => 2,
            'thousandSeparator' => ' ',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'after',
        ],
        'GBP' => [
            'code'              => 'GBP',
            'title'             => 'Pound Sterling',
            'symbol'            => '£',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'OMR' => [
            'code'              => 'OMR',
            'title'             => 'Rial Omani',
            'symbol'            => 'OMR',
            'precision'         => 3,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'RON' => [
            'code'              => 'RON',
            'title'             => 'Romania, New Leu',
            'symbol'            => null,
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'ROL' => [
            'code'              => 'ROL',
            'title'             => 'Romania, Old Leu',
            'symbol'            => null,
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'RUB' => [
            'code'              => 'RUB',
            'title'             => 'Russian Ruble',
            'symbol'            => ' руб',
            'precision'         => 2,
            'thousandSeparator' => ' ',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'after',
        ],
        'RSD' => [
            'code'              => 'RSD',
            'title'             => 'Serbian Dinar',
            'symbol'            => 'дин',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'after',
        ],
        'SAR' => [
            'code'              => 'SAR',
            'title'             => 'Saudi Riyal',
            'symbol'            => 'SAR',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'SGD' => [
            'code'              => 'SGD',
            'title'             => 'Singapore Dollar',
            'symbol'            => 'S$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'SKK' => [
            'code'              => 'SKK',
            'title'             => 'Slovak Koruna',
            'symbol'            => ' SKK',
            'precision'         => 2,
            'thousandSeparator' => ' ',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'after',
        ],
        'SIT' => [
            'code'              => 'SIT',
            'title'             => 'Slovenia, Tolar',
            'symbol'            => null,
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'ZAR' => [
            'code'              => 'ZAR',
            'title'             => 'South Africa, Rand',
            'symbol'            => 'R',
            'precision'         => 2,
            'thousandSeparator' => ' ',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'KRW' => [
            'code'              => 'KRW',
            'title'             => 'South Korea, Won ₩',
            'symbol'            => '₩',
            'precision'         => 0,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '',
            'symbolPlacement'   => 'before',
        ],
        'SZL' => [
            'code'              => 'SZL',
            'title'             => 'Swaziland, Lilangeni',
            'symbol'            => 'E',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'SEK' => [
            'code'              => 'SEK',
            'title'             => 'Swedish Krona',
            'symbol'            => ' kr',
            'precision'         => 2,
            'thousandSeparator' => ' ',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'after',
        ],
        'CHF' => [
            'code'              => 'CHF',
            'title'             => 'Swiss Franc',
            'symbol'            => 'SFr ',
            'precision'         => 2,
            'thousandSeparator' => '\'',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'TZS' => [
            'code'              => 'TZS',
            'title'             => 'Tanzanian Shilling',
            'symbol'            => 'TSh',
            'precision'         => 0,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'THB' => [
            'code'              => 'THB',
            'title'             => 'Thailand, Baht ฿',
            'symbol'            => '฿',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'TOP' => [
            'code'              => 'TOP',
            'title'             => 'Tonga, Paanga',
            'symbol'            => 'T$ ',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'AED' => [
            'code'              => 'AED',
            'title'             => 'UAE Dirham',
            'symbol'            => 'AED',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'UAH' => [
            'code'              => 'UAH',
            'title'             => 'Ukraine, Hryvnia',
            'symbol'            => ' ₴',
            'precision'         => 2,
            'thousandSeparator' => ' ',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'after',
        ],
        'USD' => [
            'code'              => 'USD',
            'title'             => 'US Dollar',
            'symbol'            => '$',
            'precision'         => 2,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
        'VUV' => [
            'code'              => 'VUV',
            'title'             => 'Vanuatu, Vatu',
            'symbol'            => 'VT',
            'precision'         => 0,
            'thousandSeparator' => ',',
            'decimalSeparator'  => '',
            'symbolPlacement'   => 'before',
        ],
        'VEF' => [
            'code'              => 'VEF',
            'title'             => 'Venezuela Bolivares Fuertes',
            'symbol'            => 'Bs.',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'VEB' => [
            'code'              => 'VEB',
            'title'             => 'Venezuela, Bolivar',
            'symbol'            => 'Bs.',
            'precision'         => 2,
            'thousandSeparator' => '.',
            'decimalSeparator'  => ',',
            'symbolPlacement'   => 'before',
        ],
        'VND' => [
            'code'              => 'VND',
            'title'             => 'Viet Nam, Dong ₫',
            'symbol'            => ' ₫',
            'precision'         => 0,
            'thousandSeparator' => '.',
            'decimalSeparator'  => '',
            'symbolPlacement'   => 'after',
        ],
        'QAR' => [
            'code'              => 'QAR',
            'title'             => 'Qatari Rial',
            'symbol'            => 'QR',
            'precision'         => 0,
            'thousandSeparator' => '.',
            'decimalSeparator'  => '',
            'symbolPlacement'   => 'after',
        ],
        'ZWD' => [
            'code'              => 'ZWD',
            'title'             => 'Zimbabwe Dollar',
            'symbol'            => 'Z$',
            'precision'         => 2,
            'thousandSeparator' => ' ',
            'decimalSeparator'  => '.',
            'symbolPlacement'   => 'before',
        ],
    ];

    /**
     * Create new Currency instance.
     *
     * @param string Currency ISO-4217 code
     *
     * @return void
     */
    public function __construct($code)
    {
        if (is_array($code) && isset($code['code'])) {
            $code = $code['code'];
        }

        if (!static::has($code)) {
            throw new CurrencyException("Currency not found: \"{$code}\"");
        }

        $currency = static::getCurrency($code);

        foreach ($currency as $key => $value) {
            if (property_exists($this, $key)) {
                $this->$key = $value;
            }
        }
    }

    /**
     * Get currency ISO-4217 code.
     *
     * @return string
     */
    public function getCode()
    {
        return $this->code;
    }

    /**
     * Get currency symbol.
     *
     * @return string
     */
    public function getSymbol()
    {
        return $this->symbol;
    }

    /**
     * Get currency precision.
     *
     * @return int
     */
    public function getPrecision()
    {
        return $this->precision;
    }

    /**
     * @param int $precision
     *
     * @return $this
     */
    public function setPrecision($precision)
    {
        $this->precision = $precision;

        return $this;
    }

    /**
     * Get currency title.
     *
     * @return string
     */
    public function getTitle()
    {
        return $this->title;
    }

    /**
     * Get currency thousand separator.
     *
     * @return string
     */
    public function getThousandSeparator()
    {
        return $this->thousandSeparator;
    }

    /**
     * @param string $separator
     *
     * @return $this
     */
    public function setThousandSeparator($separator)
    {
        $this->thousandSeparator = $separator;

        return $this;
    }

    /**
     * Get currency decimal separator.
     *
     * @return string
     */
    public function getDecimalSeparator()
    {
        return $this->decimalSeparator;
    }

    /**
     * @param string $separator
     *
     * @return $this
     */
    public function setDecimalSeparator($separator)
    {
        $this->decimalSeparator = $separator;

        return $this;
    }

    /**
     * Get currency symbol placement.
     *
     * @return string
     */
    public function getSymbolPlacement()
    {
        return $this->symbolPlacement;
    }

    /**
     * @param string $placement [before|after]
     *
     * @return $this
     */
    public function setSymbolPlacement($placement)
    {
        $this->symbolPlacement = $placement;

        return $this;
    }

    /**
     * Get all currencies.
     *
     * @return array
     */
    public static function getAllCurrencies()
    {
        return static::$currencies;
    }

    /**
     * Get currency.
     *
     * @return array
     */
    public static function getCurrency($code)
    {
        return static::$currencies[$code];
    }

    /**
     * Check currency existence (within the class).
     */
    public static function has(?string $code): bool
    {
        if (!is_string($code)) {
            return false;
        }

        return isset(static::$currencies[$code]);
    }

    public static function all()
    {
        return collect(static::$currencies)->values()->mapInto(Currency::class);
    }

    /**
     * Finds the first currency of which the callback returns true.
     *
     * @return \Fleetbase\Support\Currency
     */
    public static function first(?callable $callback = null)
    {
        return static::all()->first($callback);
    }

    /**
     * Filter currencies by providing a callback.
     *
     * @return \Illuminate\Support\Collection
     */
    public static function filter(?callable $callback = null)
    {
        return static::all()->filter($callback)->values();
    }

    /**
     * Get the collection of items as JSON.
     *
     * @param int $options
     */
    public function toJson($options = 0): string
    {
        return json_encode($this->jsonSerialize(), $options);
    }

    /**
     * Convert the object into something JSON serializable.
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }

    /**
     * Convert the object into an array.
     */
    public function toArray(): array
    {
        return [
            'code'              => $this->getCode(),
            'title'             => $this->getTitle(),
            'symbol'            => $this->getSymbol(),
            'precision'         => $this->getPrecision(),
            'thousandSeparator' => $this->getThousandSeparator(),
            'decimalSeparator'  => $this->getDecimalSeparator(),
            'symbolPlacement'   => $this->getSymbolPlacement(),
        ];
    }
}
