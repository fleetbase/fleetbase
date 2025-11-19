<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class LipuRolesSeeder extends Seeder
{
    /**
     * LIPU MMS specific roles
     */
    protected array $lipuRoles = [
        [
            'name' => 'LIPU Administrator',
            'guard_name' => 'sanctum',
            'description' => 'Full system administrator with complete access to all modules and configurations',
            'is_mutable' => false,
            'is_deletable' => false,
            'service' => 'lipu-mms',
        ],
        [
            'name' => 'Plant Operator',
            'guard_name' => 'sanctum',
            'description' => 'Operates plant equipment and records concrete production data',
            'is_mutable' => true,
            'is_deletable' => true,
            'service' => 'lipu-mms',
        ],
        [
            'name' => 'Fleet Supervisor',
            'guard_name' => 'sanctum',
            'description' => 'Manages truck fleet, driver assignments, and route planning',
            'is_mutable' => true,
            'is_deletable' => true,
            'service' => 'lipu-mms',
        ],
        [
            'name' => 'Data Analyst',
            'guard_name' => 'sanctum',
            'description' => 'Read-only access for reports, analytics, and dashboards',
            'is_mutable' => true,
            'is_deletable' => true,
            'service' => 'lipu-mms',
        ],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🚀 Seeding LIPU roles...');
        $this->command->newLine();

        $created = 0;
        $skipped = 0;

        foreach ($this->lipuRoles as $roleData) {
            // Check if role already exists
            $exists = DB::table('roles')
                ->where('name', $roleData['name'])
                ->where('guard_name', $roleData['guard_name'])
                ->exists();

            if ($exists) {
                $this->command->warn("  ⏭️  {$roleData['name']} (already exists)");
                $skipped++;
                continue;
            }

            // Create the role
            DB::table('roles')->insert([
                'id' => Str::uuid()->toString(),
                'name' => $roleData['name'],
                'guard_name' => $roleData['guard_name'],
                'description' => $roleData['description'],
                'service' => $roleData['service'],
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

            $this->command->info("  ✅ {$roleData['name']}");
            $created++;
        }

        $this->command->newLine();
        $this->command->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        $this->command->info("🎉 Seeding completed");
        $this->command->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        $this->command->info("   ✅ Roles created: {$created}");
        $this->command->info("   ⏭️  Roles skipped: {$skipped}");
        
        $total = DB::table('roles')->where('service', 'lipu-mms')->count();
        $this->command->info("   📊 Total LIPU roles: {$total}");
        $this->command->newLine();
    }
}

