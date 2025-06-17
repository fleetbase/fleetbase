<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('plan')->insert([
            'name' => 'Basic Plan',
            'payment_gateway_id' => 1, // Assuming GoCardless has ID 1
            'created_by_id' => 1,
            'deleted' => 0,
            'record_status' => 1
        ]);
    }
}
