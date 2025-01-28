<?php

namespace Fleetbase\FleetOps\Console\Commands;

use Fleetbase\Models\Company;
use Fleetbase\Models\User;
use Illuminate\Console\Command;

class AssignDriverRoles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetops:assign-driver-roles';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assigns the Driver role to all driver users.';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $companies = Company::with('users', 'users.driver')->get();

        foreach ($companies as $company) {
            /** @var Company $company */
            $company->loadMissing('users');
            foreach ($company->users as $user) {
                if ($user instanceof User) {
                    $user->setCompanyUserRelation($company);
                    $driver = $user->driver()->where('company_uuid', $company->uuid)->first();
                    if ($driver && $user->isNotAdmin()) {
                        try {
                            $user->assignSingleRole('Driver');
                            $this->info($company->name . ' - Driver: ' . $user->email . ' has been made Driver.');
                        } catch (\Throwable $e) {
                            $this->error($e->getMessage());
                        }
                    }
                }
            }
        }

        return Command::SUCCESS;
    }
}
