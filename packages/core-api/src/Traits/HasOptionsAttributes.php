<?php

namespace Fleetbase\Traits;

use Fleetbase\Support\Utils;

trait HasOptionsAttributes
{
    /**
     * Sets a option value by key.
     *
     * $resource->setOption('id', '1846473');
     * $resource->setOption('customer.name', 'John Doe');
     *
     * {
     *      "id": "1846473",
     *      "customer": {
     *          "name": "John Doe"
     *      }
     * }
     *
     * @return \Fleetbase\Models\Model
     */
    public function setOption($keys, $value)
    {
        if (is_array($keys)) {
            foreach ($keys as $key => $value) {
                $this->setOption($key, $value);
            }

            return $this;
        }

        $options = $this->getAllOptions();
        $options = Utils::set($options, $keys, $value);

        $this->setAttribute('options', $options);

        return $this;
    }

    /**
     * Get a option value by key.
     *
     * @param string|array $key
     *
     * @return array
     */
    public function getOption($key = null, $defaultValue = null)
    {
        $options = $this->getAllOptions();

        if ($key === null) {
            return $options;
        }

        return Utils::get($options, $key, $defaultValue);
    }

    public function hasOption($key)
    {
        $options = $this->getAllOptions();

        return in_array($key, array_keys($options));
    }

    public function updateOption($key, $value)
    {
        $options       = $this->getAllOptions();
        $options[$key] = $value;

        $this->setAttribute('options', $options);

        return $this->update(['options' => $options]);
    }

    public function missingOption($key)
    {
        return !$this->hasOption($key);
    }

    public function isOption($key)
    {
        return $this->getOption($key) === true;
    }

    public function getAllOptions()
    {
        return $this->getAttribute('options') ?? [];
    }
}
