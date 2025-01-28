<?php

namespace Fleetbase\Seeders;

use Illuminate\Database\Seeder;

class FleetbaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $this->call(ExtensionSeeder::class);
        $this->call(PermissionSeeder::class);
    }
}
