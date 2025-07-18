<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class OrderStatusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $statuses = [
            ['code' => 'completed', 'name' => 'Completed'],
            ['code' => 'confirmed', 'name' => 'Confirmed'],
            ['code' => 'created', 'name' => 'Created'],
            ['code' => 'dispatched', 'name' => 'Dispatched'],
            ['code' => 'enroute', 'name' => 'Enroute'],
            ['code' => 'incident_reported', 'name' => 'Incident reported'],
            ['code' => 'on_break', 'name' => 'On break'],
            ['code' => 'order_canceled', 'name' => 'Order canceled'],
            ['code' => 'planned', 'name' => 'Planned'],
            ['code' => 'shift_ended', 'name' => 'Shift ended'],
            ['code' => 'started', 'name' => 'Started'],
        ];

        foreach ($statuses as $status) {
            DB::table('order_statuses')->insert([
                'uuid' => Str::uuid(),
                'company_uuid' => null,
                'code' => $status['code'],
                'name' => $status['name'],
                'record_status' => 1,
                'deleted' => 0,
                'created_by_id' => null,
                'updated_by_id' => null,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }
    
    }
}
