<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentGatewaySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('payment_gateway')->insert([
            'name' => 'GoCardless',
            'created_by_id' => 1,
          
            'deleted' => 0,
            'record_status' => 1
        ]);
    }
}
