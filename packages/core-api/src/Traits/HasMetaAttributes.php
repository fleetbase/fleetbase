<?php

namespace Fleetbase\Traits;

use Fleetbase\Support\Utils;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

trait HasMetaAttributes
{
    /**
     * Sets a single or multiple meta-data properties with values.
     *
     * Usage:
     * $resource->setMeta('id', '1846473');
     * $resource->setMeta('customer.name', 'John Doe');
     * $resource->setMeta(['id' => '1846473', 'customer.name' => 'John Doe']);
     *
     * @param string|array $keys  key(s) of the meta-data to set
     * @param mixed        $value value to set if keys is a string
     *
     * @return $this
     */
    public function setMeta($keys, $value = null)
    {
        $meta = $this->getAllMeta();

        if (is_array($keys)) {
            foreach ($keys as $key => $value) {
                Arr::set($meta, $key, static::prepareValue($value));
            }
        } else {
            Arr::set($meta, $keys, static::prepareValue($value));
        }

        $this->setAttribute('meta', $meta);

        return $this;
    }

    /**
     * Retrieves all meta-data properties.
     */
    public function getAllMeta(): array
    {
        return $this->getAttribute('meta') ?? [];
    }

    /**
     * Retrieves a meta-data property or all meta-data if no key is provided.
     *
     * @param string|array|null $key          key of the meta-data to retrieve
     * @param mixed|null        $defaultValue default value if the key does not exist
     */
    public function getMeta($key = null, $defaultValue = null)
    {
        $meta = $this->getAllMeta();

        if ($key === null) {
            return $meta;
        }

        return Arr::get($meta, $key, $defaultValue);
    }

    /**
     * Retrieves meta-data for the specified properties.
     *
     * @param array $properties keys of meta-data to retrieve
     */
    public function getMetaAttributes(array $properties = []): array
    {
        $metaAttributes = [];

        foreach ($properties as $key) {
            Arr::set($metaAttributes, $key, $this->getMeta($key));
        }

        return $metaAttributes;
    }

    /**
     * Checks if a meta-data property exists.
     *
     * @param string|array $keys key(s) to check existence in the meta-data
     */
    public function hasMeta($keys): bool
    {
        $meta = $this->getAllMeta();

        if (is_array($keys)) {
            foreach ($keys as $key) {
                if (!Arr::has($meta, $key)) {
                    return false;
                }
            }

            return true;
        }

        return Arr::has($meta, $keys);
    }

    /**
     * Updates meta-data properties in the database.
     *
     * @param string|array $key   key(s) of the meta-data to update
     * @param mixed|null   $value value to update if key is a string
     *
     * @return $this
     */
    public function updateMeta($key, $value = null)
    {
        $this->setMeta($key, $value);
        $meta = $this->getAttribute('meta');

        return $this->update(['meta' => $meta]);
    }

    /**
     * Updates multiple meta-data properties in the database.
     *
     * @param array $data array of key-value pairs to update in meta-data
     */
    public function updateMetaProperties(array $data = []): bool
    {
        $currentMetaObject = $this->getAllMeta();
        $updatedMetaObject = array_merge($currentMetaObject, $data);

        return DB::table($this->getTable())->where($this->getKeyName(), $this->getKey())->update([
            'meta' => json_encode($updatedMetaObject),
        ]);
    }

    /**
     * Checks if a meta-data key is missing.
     *
     * @param string $key key of the meta-data to check
     */
    public function missingMeta($key): bool
    {
        return !$this->hasMeta($key);
    }

    /**
     * Checks if a meta-data key is missing.
     *
     * @param string $key key of the meta-data to check
     */
    public function doesntHaveMeta($key): bool
    {
        return !$this->hasMeta($key);
    }

    /**
     * Checks if a meta-data property's value is true.
     *
     * @param string $key key of the meta-data to check
     */
    public function isMeta($key): bool
    {
        return $this->getMeta($key) === true;
    }

    /**
     * Prepares a value for meta-data insertion.
     *
     * @param mixed $value value to prepare
     */
    private static function prepareValue($value)
    {
        if (Utils::isUnicodeString($value)) {
            $value = Utils::unicodeDecode($value);
        }

        return $value;
    }
}
