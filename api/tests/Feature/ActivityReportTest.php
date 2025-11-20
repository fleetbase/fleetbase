<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ActivityReportTest extends TestCase
{
    /**
     * Test activity reports by section endpoint.
     *
     * @return void
     */
    public function test_activity_reports_by_section()
    {
        // Insert some test data
        DB::table('activity')->insert([
            [
                'uuid' => (string) Str::uuid(),
                'log_name' => 'user-management',
                'description' => 'created',
                'created_at' => now(),
                'updated_at' => now(),
                'event' => 'test'
            ],
            [
                'uuid' => (string) Str::uuid(),
                'log_name' => 'user-management',
                'description' => 'updated',
                'created_at' => now(),
                'updated_at' => now(),
                'event' => 'test'
            ],
            [
                'uuid' => (string) Str::uuid(),
                'log_name' => 'fleet-ops',
                'description' => 'viewed',
                'created_at' => now(),
                'updated_at' => now(),
                'event' => 'test'
            ]
        ]);

        $response = $this->get('/api/v1/activity/reports-by-section');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'sections' => [
                    '*' => [
                        'name',
                        'total_activities',
                        'actions',
                        'trend',
                        'last_activity'
                    ]
                ]
            ]);
            
        // Cleanup (optional if using transactions/RefreshDatabase properly configured)
        DB::table('activity')->where('event', 'test')->delete();
    }
}

