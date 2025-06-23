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
        $plan = DB::table('plan')->where('name', 'Basic Plan')->first();
    
        if (!$plan) {
            // If plan doesn't exist, log error or throw exception
            throw new Exception('Basic Plan not found in plan table');
        }
        DB::table('plan_pricing_relation')->insert([
            'plan_id' => $plan->id, // Assuming your Basic Plan has ID 1
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
