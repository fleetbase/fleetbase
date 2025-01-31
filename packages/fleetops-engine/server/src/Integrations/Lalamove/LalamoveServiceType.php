<?php

namespace Fleetbase\FleetOps\Integrations\Lalamove;

class LalamoveServiceType
{
    /**
     * Available Service types for Lalamove.
     */
    private static array $serviceTypes = [
        // [
        //     'key' => 'WALKER',
        //     'description' => 'Walker',
        //     'restrictions' => [
        //         'length' => '40cm',
        //         'width' => '40cm',
        //         'height' => '40cm',
        //         'weight' => '10kg',
        //     ],
        // ],
        [
            'key'          => 'MOTORCYCLE',
            'description'  => 'Motorcycle',
            'restrictions' => [
                'length' => '40cm',
                'width'  => '40cm',
                'height' => '40cm',
                'weight' => '10kg',
            ],
        ],
        [
            'key'          => 'CAR',
            'description'  => 'Car',
            'restrictions' => [
                'length' => '70cm',
                'width'  => '50cm',
                'height' => '50cm',
                'weight' => '20kg',
            ],
        ],
        // [
        //     'key' => 'SEDAN',
        //     'description' => 'Sedan',
        //     'restrictions' => [
        //         'length' => '150cm',
        //         'width' => '80cm',
        //         'height' => '80cm',
        //         'weight' => '100kg',
        //     ],
        // ],
        [
            'key'          => 'VAN',
            'description'  => 'Van',
            'restrictions' => [
                'length' => '182cm',
                'width'  => '121cm',
                'height' => '121cm',
                'weight' => '800kg',
            ],
        ],
        [
            'key'          => 'SUV',
            'description'  => 'SUV',
            'restrictions' => [
                'length' => '182cm',
                'width'  => '121cm',
                'height' => '121cm',
                'weight' => '800kg',
            ],
        ],
        // [
        //     'key' => 'TRUCK175',
        //     'description' => 'Pickup Truck',
        //     'restrictions' => [
        //         'length' => '200cm',
        //         'width' => '160cm',
        //         'height' => '120cm',
        //         'weight' => '800kg',
        //     ],
        // ],
        [
            'key'          => 'TRUCK330',
            'description'  => '1-Ton Lorry / Lori 1-Tan',
            'restrictions' => [
                'length' => '275cm',
                'width'  => '152cm',
                'height' => '152cm',
                'weight' => '1000kg',
            ],
        ],
        [
            'key'          => 'TRUCK550',
            'description'  => '5.5 Ton',
            'restrictions' => [
                'length' => '450cm',
                'width'  => '195cm',
                'height' => '195cm',
                'weight' => '1200kg',
            ],
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
        $restrictions = ['length', 'width', 'height', 'weight'];
        $key          = strtolower($key);

        if (isset($this->{$key})) {
            return $this->{$key};
        }

        if (in_array($key, $restrictions)) {
            return $this->restrictions[$key];
        }

        return null;
    }

    public function __call(string $key, $arguments)
    {
        if ($key === 'all') {
            return collect(static::$serviceTypes)->mapInto(LalamoveServiceType::class);
        }

        if (method_exists($this, $key)) {
            $this->{$key}(...$arguments);
        }

        return null;
    }

    public function getKey()
    {
        return $this->key;
    }

    public static function all()
    {
        return collect(static::$serviceTypes)->mapInto(LalamoveServiceType::class);
    }

    public static function find($key)
    {
        if (is_callable($key)) {
            return static::all()->first($key);
        }

        if (is_string($key)) {
            return static::all()->first(function ($detail) use ($key) {
                return isset($detail->key) && strtolower($detail->key) === strtolower($key);
            });
        }
    }
}
