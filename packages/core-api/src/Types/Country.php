<?php

namespace Fleetbase\Types;

use Fleetbase\Exceptions\CountryException;
use Fleetbase\Support\Utils;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use PragmaRX\Countries\Package\Countries;

class Country implements \JsonSerializable
{
    /**
     * ISO-3166-1 Alpha-3 Code.
     *
     * @var string
     */
    protected $code;

    /**
     * The country name.
     *
     * @var string
     */
    protected $name;

    /**
     * ISO-4217 Currency Code.
     *
     * @var string
     */
    protected $currency;

    /**
     * The country flag emoji.
     *
     * @var string
     */
    protected $emoji;

    /**
     * The country languages.
     *
     * @var array
     */
    protected $languages;

    /**
     * Country Data.
     *
     * @var array
     */
    protected $data = [];

    public function __construct($code)
    {
        if (is_string($code) && !static::has($code)) {
            throw new CountryException("Country not found: \"{$code}\"");
        }

        if (is_object($code) && method_exists($code, 'toArray')) {
            $code = $code->toArray();
        }

        if (is_array($code)) {
            $data = $code;
            $code = isset($data['cca3']) ? $data['cca3'] : null;
        } else {
            $data = static::all()->where('cca2', $code)->first();
        }

        $this->name         = $data['name'] = Utils::or($data, ['name.common', 'name.official', 'name_long', 'name_en']);
        $this->currency     = $data['currency'] = Utils::or($data, ['currencies.0', 'currencies.0.name']);
        $this->emoji        = $data['emoji'] = Utils::get($data, 'flag.emoji');
        $this->languages    = $data['languages'] = Utils::get($data, 'languages');
        $this->code         = $code;
        $this->data         = $data;

        foreach ($data as $key => $value) {
            $this->{$key} = $value;
        }
    }

    /**
     * Magic helper methods to access and query country properties.
     *
     * $country->getCurrency();
     *
     * @param string $name
     * @param array  $args
     *
     * @return mixed|null
     */
    public function __call($name, $args)
    {
        if (Str::startsWith($name, 'get')) {
            $property = Str::snake(Str::replaceFirst('get', '', $name));

            if (isset($this->{$property})) {
                return $this->{$property};
            }
        }

        if (method_exists($this, $name)) {
            return $this->{$name}(...$args);
        }

        return null;
    }

    /**
     * Converts the country into an array with only the selected keys.
     *
     * @param array $keys
     */
    public function only($keys = []): array
    {
        $result = [];

        foreach ($keys as $key) {
            $as = $key;

            if (is_array($key)) {
                $as  = Arr::first(array_values($key));
                $key = Arr::first(array_keys($key));
            }

            if (!is_string($key)) {
                continue;
            }

            if (strpos($key, '.') > 0) {
                $result[$as] = Utils::get($this, $key);
                continue;
            }

            if (isset($this->{$key})) {
                $result[$as] = $this->{$key};
            }
        }

        return $result;
    }

    /**
     * Converts country into array with only the basic column data for a country.
     */
    public function simple(): array
    {
        return $this->only(['name', 'code', 'currency', 'emoji', 'cca2', 'abbrev', 'geo', 'languages', 'type', 'record_type']);
    }

    /**
     * Magic helper methods to access and query country properties.
     *
     * static::whereCurrency('USD');
     *
     * @param string $name
     * @param array  $args
     *
     * @return mixed|null
     */
    public static function __callStatic($name, $args)
    {
        if (Str::startsWith($name, 'where')) {
            $property = Str::snake(Str::replaceFirst('where', '', $name));

            return static::first(
                function ($country) use ($property, $args) {
                    return $country->{$property} === $args[0];
                }
            );
        }

        return null;
    }

    /**
     * Check currency existence (within the class).
     */
    public static function has(?string $code): bool
    {
        if (!is_string($code)) {
            return false;
        }

        return static::all()->where('cca2', $code)->exists();
    }

    /**
     * Get all countries from repository.
     */
    public static function all(): Collection
    {
        return new Collection(
            array_map(
                function ($countryData) {
                    return new static($countryData);
                },
                Countries::all()->toArray()
            )
        );
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
     * @return Collection
     */
    public static function filter(?callable $callback = null)
    {
        return static::all()->filter($callback)->values();
    }

    /**
     * Search all countries by keyword.
     *
     * @return Collection
     */
    public static function search(string $query)
    {
        return static::filter(
            function ($country) use ($query) {
                if (empty($query) || !is_string($query)) {
                    return true;
                }

                $query = strtolower($query);

                $matches = [
                    strtolower($country->getCurrency()) === $query,
                    strtolower($country->getCode()) === $query,
                    strtolower($country->getCca2()) === $query,
                    Str::contains(strtolower($country->getAbbrev()), $query),
                    // Str::contains(strtolower($country->getName()), $query),
                ];

                return count(array_filter($matches));
            }
        );
    }

    /**
     * Find a country by it's currency code.
     *
     * @param string $currency
     *
     * @return void
     */
    public static function fromCurrency($currency)
    {
        return static::first(
            function ($country) use ($currency) {
                return $country->getCurrency() === $currency;
            }
        );
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
     * Converts data to array.
     */
    public function toArray(): array
    {
        return array_merge(['name' => $this->name, 'currency' => $this->currency], (array) $this->data);
    }

    /**
     * Convert the object into something JSON serializable.
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
