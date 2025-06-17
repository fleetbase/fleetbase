<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
class PlanPricingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('plan_pricing_relation')->insert([
            'plan_id' => 1, // Assuming your Basic Plan has ID 1
            'billing_cycle' => 'monthly',
            'price_per_user' => 25.00,
            'price_per_driver' => 10.00,
            'currency' => 'GBP',
            'created_by_id' => 1,
            'deleted' => 0,
            'record_status' => 1
        ]);
    }
}
