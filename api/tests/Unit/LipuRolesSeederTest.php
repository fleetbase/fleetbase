<?php

namespace Tests\Unit;

use Tests\TestCase;
use Database\Seeders\LipuRolesSeeder;
use ReflectionClass;

class LipuRolesSeederTest extends TestCase
{
    /** @test */
    public function seeder_has_correct_role_definitions()
    {
        $seeder = new LipuRolesSeeder();
        $reflection = new ReflectionClass($seeder);
        $property = $reflection->getProperty('lipuRoles');
        $property->setAccessible(true);
        $roles = $property->getValue($seeder);

        $this->assertIsArray($roles);
        $this->assertCount(4, $roles);
    }

    /** @test */
    public function each_role_has_required_fields()
    {
        $seeder = new LipuRolesSeeder();
        $reflection = new ReflectionClass($seeder);
        $property = $reflection->getProperty('lipuRoles');
        $property->setAccessible(true);
        $roles = $property->getValue($seeder);

        $requiredFields = ['name', 'guard_name', 'description', 'is_mutable', 'is_deletable', 'service'];

        foreach ($roles as $role) {
            foreach ($requiredFields as $field) {
                $this->assertArrayHasKey($field, $role, "Role {$role['name']} missing field: {$field}");
            }
        }
    }

    /** @test */
    public function all_roles_use_sanctum_guard()
    {
        $seeder = new LipuRolesSeeder();
        $reflection = new ReflectionClass($seeder);
        $property = $reflection->getProperty('lipuRoles');
        $property->setAccessible(true);
        $roles = $property->getValue($seeder);

        foreach ($roles as $role) {
            $this->assertEquals('sanctum', $role['guard_name'], "Role {$role['name']} should use sanctum guard");
        }
    }

    /** @test */
    public function all_roles_have_lipu_mms_service()
    {
        $seeder = new LipuRolesSeeder();
        $reflection = new ReflectionClass($seeder);
        $property = $reflection->getProperty('lipuRoles');
        $property->setAccessible(true);
        $roles = $property->getValue($seeder);

        foreach ($roles as $role) {
            $this->assertEquals('lipu-mms', $role['service'], "Role {$role['name']} should have service=lipu-mms");
        }
    }

    /** @test */
    public function lipu_administrator_is_protected()
    {
        $seeder = new LipuRolesSeeder();
        $reflection = new ReflectionClass($seeder);
        $property = $reflection->getProperty('lipuRoles');
        $property->setAccessible(true);
        $roles = $property->getValue($seeder);

        $adminRole = collect($roles)->firstWhere('name', 'LIPU Administrator');

        $this->assertNotNull($adminRole);
        $this->assertFalse($adminRole['is_mutable'], 'LIPU Administrator should not be mutable');
        $this->assertFalse($adminRole['is_deletable'], 'LIPU Administrator should not be deletable');
    }

    /** @test */
    public function other_roles_are_mutable_and_deletable()
    {
        $seeder = new LipuRolesSeeder();
        $reflection = new ReflectionClass($seeder);
        $property = $reflection->getProperty('lipuRoles');
        $property->setAccessible(true);
        $roles = $property->getValue($seeder);

        $otherRoles = collect($roles)->reject(fn($role) => $role['name'] === 'LIPU Administrator');

        foreach ($otherRoles as $role) {
            $this->assertTrue($role['is_mutable'], "Role {$role['name']} should be mutable");
            $this->assertTrue($role['is_deletable'], "Role {$role['name']} should be deletable");
        }
    }

    /** @test */
    public function role_descriptions_are_not_empty()
    {
        $seeder = new LipuRolesSeeder();
        $reflection = new ReflectionClass($seeder);
        $property = $reflection->getProperty('lipuRoles');
        $property->setAccessible(true);
        $roles = $property->getValue($seeder);

        foreach ($roles as $role) {
            $this->assertNotEmpty($role['description'], "Role {$role['name']} has empty description");
            $this->assertGreaterThan(10, strlen($role['description']), "Role {$role['name']} description too short");
        }
    }
}

