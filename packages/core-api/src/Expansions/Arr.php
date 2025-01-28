<?php

namespace Fleetbase\Expansions;

use Fleetbase\Build\Expansion;

class Arr implements Expansion
{
    /**
     * Get the target class to expand.
     *
     * @return string|Class
     */
    public static function target()
    {
        return \Illuminate\Support\Arr::class;
    }

    /**
     * Returns a higher-order function that checks if every element of an array passes a given truth test.
     *
     * The returned function takes an array and a callback function as arguments. It applies the callback to
     * each element of the array using `array_map`, and returns `true` if all elements pass the truth test,
     * and `false` otherwise.
     *
     * @return \Closure the higher-order function
     */
    public function every()
    {
        /*
         * Returns a higher-order function that checks if every element of an array passes a given truth test.
         *
         * The returned function takes an array and a callback function as arguments. It applies the callback to
         * each element of the array using `array_map`, and returns `true` if all elements pass the truth test,
         * and `false` otherwise.
         *
         * @return array
         */
        return function ($array, $callback) {
            return !in_array(false, array_map($callback, $array));
        };
    }

    /**
     * Inserts key value pairs into array after a specific key.
     *
     * @return \Closure
     */
    public function insertAfterKey()
    {
        /*
         * Inserts key value pairs into array after a specific key.
         *
         * @return array
         */
        return function (array $array = [], $item = [], $key = 0) {
            $position = array_search($key, array_keys($array));

            if ($position === false) {
                return $array + $item;
            }

            $position++;
            $previous = array_slice($array, 0, $position, true);
            $next     = array_slice($array, $position, null, true);

            return $previous + $item + $next;
        };
    }

    /**
     * Returns the first assosciative array key when the first value is matched, fallsback to `array_search` if string provided.
     *
     * @return \Closure
     */
    public function search()
    {
        /*
         * Returns the first assosciative array key when the first value is matched, fallsback to `array_search` if string provided.
         *
         * @param array $array
         * @param callable|mixed $callable
         * @return mixed
         */
        return function (array $array = [], $callable) {
            if (!is_callable($callable)) {
                return array_search($callable, $array);
            }

            foreach ($array as $key => $value) {
                if (is_callable($callable) & $callable($value)) {
                    return $key;
                }
            }

            return null;
        };
    }

    /**
     * Map an array with keys.
     *
     * This macro extends Laravel's Arr class by allowing you to map over an array
     * while also passing the key of each element to the given callable.
     *
     * The resulting array will preserve the original keys of the input array.
     *
     * @return \Closure the closure that performs the mapping operation
     */
    public function map()
    {
        return function (array $array = [], $callable) {
            // Map over the array. The $callable receives both the value and the key.
            return array_map($callable, $array, array_keys($array));
        };
    }
}
