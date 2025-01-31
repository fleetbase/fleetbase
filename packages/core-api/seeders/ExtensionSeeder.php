<?php

namespace Fleetbase\Seeders;

use Fleetbase\Models\Category;
use Fleetbase\Models\Type;
use Illuminate\Database\Seeder;

class ExtensionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $extensionTypes = [
            [
                'name'        => 'Config',
                'description' => 'Additional configurations for console resources.',
                'key'         => 'config',
                'for'         => 'extension',
            ],
        ];

        $extensionCategories = [
            [
                'name'        => 'Logistics',
                'description' => '',
                'for'         => 'extension',
            ],
            [
                'name'        => 'Security, Identity, & Compliance',
                'description' => '',
                'for'         => 'extension',
            ],
            [
                'name'        => 'Shipping Industry',
                'description' => '',
                'for'         => 'extension',
            ],
            [
                'name'        => 'Data',
                'description' => '',
                'for'         => 'extension',
            ],
            [
                'name'        => 'Accounting',
                'description' => '',
                'for'         => 'extension',
            ],
            [
                'name'        => 'Inventory',
                'description' => '',
                'for'         => 'extension',
            ],
            [
                'name'        => 'Developer Tools',
                'description' => '',
                'for'         => 'extension',
            ],
        ];

        // create extension types
        foreach ($extensionTypes as $type) {
            Type::firstOrCreate(
                [
                    'name' => $type['name'],
                    'for'  => $type['for'],
                ],
                $type
            );
        }

        // create extension categories
        foreach ($extensionCategories as $category) {
            Category::firstOrCreate(
                [
                    'name' => $category['name'],
                    'for'  => $category['for'],
                ],
                $category
            );
        }
    }
}
