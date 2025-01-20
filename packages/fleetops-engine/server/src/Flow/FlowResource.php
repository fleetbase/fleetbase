<?php

namespace Fleetbase\FleetOps\Flow;

use Illuminate\Support\Str;

/**
 * Base class for flow resources which can serialize to JSON.
 */
class FlowResource implements \JsonSerializable
{
    /**
     * The array of attributes for the flow resource.
     */
    public array $attributes = [];

    /**
     * Create a new flow resource instance.
     *
     * @param array $attributes attributes to set upon construction
     */
    public function __construct(array $attributes = [])
    {
        $this->attributes = $attributes;
    }

    /**
     * Magic method to retrieve the value of a property.
     * If a getter method exists for the property, it will be used; otherwise, it will access the property directly.
     *
     * @param string $name the name of the property to access
     *
     * @return mixed the value of the property
     */
    public function __get($name)
    {
        // if has special attribute `get_Attribute()` call first
        $mutatorMethod = 'get' . Str::studly($name) . 'Attribute';
        if (method_exists($this, $mutatorMethod)) {
            return $this->{$mutatorMethod}();
        }

        if (array_key_exists($name, $this->attributes)) {
            return $this->attributes[$name];
        }

        return $this->{$name};
    }

    /**
     * Magic method to check if a property is set.
     * This will return true if the property exists and is not null.
     *
     * @param string $name the name of the property to check
     *
     * @return bool true if the property is set, false otherwise
     */
    public function __isset($name)
    {
        if (array_key_exists($name, $this->attributes)) {
            return isset($this->attributes[$name]);
        }

        return isset($this->{$name});
    }

    /**
     * Get the value of a given key from the attributes.
     * If the key does not exist, the default value will be returned.
     *
     * @param string $key          the key to retrieve
     * @param mixed  $defaultValue the default value to return if the key does not exist
     *
     * @return mixed the value from the attributes or the default value
     */
    public function get($key, $defaultValue = null)
    {
        if (array_key_exists($key, $this->attributes)) {
            return $this->attributes[$key];
        }

        if (isset($this->{$key})) {
            return $this->{$key};
        }

        return data_get($this, $key, $defaultValue);
    }

    /**
     * Set a given attribute on the resource.
     *
     * @param string $key   the key of the attribute to set
     * @param mixed  $value the value to set for the attribute
     *
     * @return self returns instance of FlowResource for chaining
     */
    public function set(string $key, $value): self
    {
        $this->attributes[$key] = $value;

        return $this;
    }

    /**
     * Serialize the attributes to an array.
     *
     * @return array the array representation of the attributes
     */
    public function serialize(): array
    {
        return $this->attributes;
    }

    /**
     * Convert the object into an array.
     *
     * @return array the array representation of the object
     */
    public function toArray(): array
    {
        return $this->serialize();
    }

    /**
     * Convert the object into a JSON string.
     *
     * @return string the JSON representation of the object
     */
    public function toJson()
    {
        return json_encode($this->serialize());
    }

    /**
     * Specify data which should be serialized to JSON.
     *
     * @return array data which can be serialized by json_encode, which is a value of any type other than a resource
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
