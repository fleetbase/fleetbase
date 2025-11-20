<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use Database\Seeders\LipuRolesSeeder;

class LipuRolesTest extends TestCase
{
    use DatabaseTransactions;

    /** @test */
    public function it_seeds_lipu_roles_successfully()
    {
        // Act: Run the seeder
        $this->seed(LipuRolesSeeder::class);

        // Assert: 4 roles created
        $lipuRoles = DB::table('roles')
            ->where('service', 'lipu-mms')
            ->get();

        $this->assertCount(4, $lipuRoles);
    }

    /** @test */
    public function it_creates_lipu_administrator_role()
    {
        $this->seed(LipuRolesSeeder::class);

        $role = DB::table('roles')
            ->where('name', 'LIPU Administrator')
            ->where('guard_name', 'sanctum')
            ->first();

        $this->assertNotNull($role);
        $this->assertEquals('lipu-mms', $role->service);
        $this->assertStringContainsString('Full system administrator', $role->description);
    }

    /** @test */
    public function it_creates_plant_operator_role()
    {
        $this->seed(LipuRolesSeeder::class);

        $role = DB::table('roles')
            ->where('name', 'Plant Operator')
            ->where('guard_name', 'sanctum')
            ->first();

        $this->assertNotNull($role);
        $this->assertEquals('lipu-mms', $role->service);
    }

    /** @test */
    public function it_creates_fleet_supervisor_role()
    {
        $this->seed(LipuRolesSeeder::class);

        $role = DB::table('roles')
            ->where('name', 'Fleet Supervisor')
            ->first();

        $this->assertNotNull($role);
        $this->assertEquals('lipu-mms', $role->service);
    }

    /** @test */
    public function it_creates_data_analyst_role()
    {
        $this->seed(LipuRolesSeeder::class);

        $role = DB::table('roles')
            ->where('name', 'Data Analyst')
            ->first();

        $this->assertNotNull($role);
        $this->assertEquals('lipu-mms', $role->service);
    }

    /** @test */
    public function seeder_is_idempotent()
    {
        // Seed once
        $this->seed(LipuRolesSeeder::class);
        $firstCount = DB::table('roles')->where('service', 'lipu-mms')->count();

        // Seed again
        $this->seed(LipuRolesSeeder::class);
        $secondCount = DB::table('roles')->where('service', 'lipu-mms')->count();

        // Should be the same count
        $this->assertEquals($firstCount, $secondCount);
        $this->assertEquals(4, $firstCount);
    }

    /** @test */
    public function all_roles_have_required_fields()
    {
        $this->seed(LipuRolesSeeder::class);

        $roles = DB::table('roles')
            ->where('service', 'lipu-mms')
            ->get();

        foreach ($roles as $role) {
            $this->assertNotNull($role->id, "Role {$role->name} missing id");
            $this->assertNotNull($role->name, "Role missing name");
            $this->assertNotNull($role->guard_name, "Role {$role->name} missing guard_name");
            $this->assertNotNull($role->description, "Role {$role->name} missing description");
            $this->assertEquals('sanctum', $role->guard_name, "Role {$role->name} should use sanctum guard");
            $this->assertEquals('lipu-mms', $role->service, "Role {$role->name} should have service=lipu-mms");
        }
    }

    /** @test */
    public function roles_have_valid_uuids()
    {
        $this->seed(LipuRolesSeeder::class);

        $roles = DB::table('roles')
            ->where('service', 'lipu-mms')
            ->get();

        foreach ($roles as $role) {
            // UUID v4 format validation
            $this->assertMatchesRegularExpression(
                '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
                $role->id,
                "Role {$role->name} has invalid UUID format"
            );
        }
    }

    /** @test */
    public function roles_have_timestamps()
    {
        $this->seed(LipuRolesSeeder::class);

        $roles = DB::table('roles')
            ->where('service', 'lipu-mms')
            ->get();

        foreach ($roles as $role) {
            $this->assertNotNull($role->created_at, "Role {$role->name} missing created_at");
            $this->assertNotNull($role->updated_at, "Role {$role->name} missing updated_at");
        }
    }

    /** @test */
    public function can_query_lipu_roles_by_service()
    {
        $this->seed(LipuRolesSeeder::class);

        // Query only LIPU roles
        $lipuRoles = DB::table('roles')
            ->where('service', 'lipu-mms')
            ->pluck('name')
            ->toArray();

        $expectedRoles = [
            'LIPU Administrator',
            'Plant Operator',
            'Fleet Supervisor',
            'Data Analyst',
        ];

        foreach ($expectedRoles as $expectedRole) {
            $this->assertContains($expectedRole, $lipuRoles);
        }
    }

    /** @test */
    public function role_names_are_unique_per_guard()
    {
        $this->seed(LipuRolesSeeder::class);

        $roles = DB::table('roles')
            ->where('service', 'lipu-mms')
            ->get();

        // Check for duplicates
        $nameGuardCombos = [];
        foreach ($roles as $role) {
            $combo = $role->name . '|' . $role->guard_name;
            $this->assertNotContains($combo, $nameGuardCombos, "Duplicate role found: {$role->name} ({$role->guard_name})");
            $nameGuardCombos[] = $combo;
        }
    }
}

