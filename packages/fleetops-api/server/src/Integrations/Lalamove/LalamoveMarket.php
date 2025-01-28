<?php

namespace Fleetbase\FleetOps\Integrations\Lalamove;

use Fleetbase\FleetOps\Support\Utils;

class LalamoveMarket
{
    /**
     * Available Markets for Lalamove.
     *
     * @var array
     */
    public const markets = [
        [
            'key'       => 'brazil',
            'code'      => 'BR',
            'languages' => ['en_BR', 'pr_BR'],
        ],
        [
            'key'       => 'hong_kong',
            'code'      => 'HK',
            'languages' => ['en_HK', 'zh_HK'],
        ],
        [
            'key'       => 'indonesia',
            'code'      => 'ID',
            'languages' => ['en_ID', 'id_ID'],
        ],
        [
            'key'       => 'malaysia',
            'code'      => 'MY',
            'languages' => ['en_MY', 'ms_MY'],
        ],
        [
            'key'       => 'mexico',
            'code'      => 'MX',
            'languages' => ['en_MX', 'es_MX'],
        ],
        [
            'key'       => 'philippines',
            'code'      => 'PH',
            'languages' => ['en_PH'],
        ],
        [
            'key'       => 'singapore',
            'code'      => 'SG',
            'languages' => ['en_SG'],
        ],
        [
            'key'       => 'taiwan',
            'code'      => 'TW',
            'languages' => ['zh_TW'],
        ],
        [
            'key'       => 'thailand',
            'code'      => 'TH',
            'languages' => ['th_TH', 'en_TH'],
        ],
        [
            'key'       => 'vietnam',
            'code'      => 'VN',
            'languages' => ['en_VN', 'vi_VN'],
        ],
    ];

    public function __construct(array $details)
    {
        foreach ($details as $key => $value) {
            $this->{$key} = $value;
        }
    }

    public function __get(string $key)
    {
        $key = strtolower($key);

        if (isset($this->{$key})) {
            return $this->{$key};
        }

        return null;
    }

    public function getCode()
    {
        return $this->code;
    }

    public function getLanguages()
    {
        return $this->languages;
    }

    public static function all()
    {
        return collect(static::markets)->mapInto(LalamoveMarket::class);
    }

    public static function find($key)
    {
        if (is_callable($key)) {
            return static::all()->first($key);
        }

        if (is_string($key)) {
            return static::all()->first(
                function ($detail) use ($key) {
                    return isset($detail->key) && strtolower($detail->key) === strtolower($key) || isset($detail->code) && strtolower($detail->code) === strtolower($key);
                }
            );
        }
    }

    public static function codes()
    {
        return static::all()->map(
            function ($market) {
                return Utils::get($market, 'code');
            }
        );
    }
}
