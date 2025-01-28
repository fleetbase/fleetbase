<?php

namespace Fleetbase\Console\Commands;

use Fleetbase\Models\Company;
use Fleetbase\Models\User;
use Illuminate\Console\Command;

class AssignAdminRoles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetbase:assign-admin-roles';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assigns the Administrator role to all company owners.';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $companies = Company::with('owner')->get();

        foreach ($companies as $company) {
            /** @var Company $company */
            $company->loadMissing('owner');
            if ($company->owner instanceof User) {
                $company->owner->setCompanyUserRelation($company);
                try {
                    $company->owner->assignSingleRole('Administrator');
                    $this->info($company->name . ' - Owner: ' . $company->owner->email . ' has been made Administrator.');
                } catch (\Throwable $e) {
                    $this->error($e->getMessage());
                }
            }
        }

        return Command::SUCCESS;
    }
}
