<?php

namespace Fleetbase\FleetOps\Console\Commands;

use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\Models\Company;
use Fleetbase\Models\CompanyUser;
use Illuminate\Console\Command;

class FixDriverCompanies extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetops:fix-driver-companies';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'This is a command which checks driver\'s users to make sure they are assigned to company, if not it assigns the user to the drivers company';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $drivers = Driver::whereHas('user')->whereNotNull('company_uuid')->with(['user'])->get();

        // Fix these drivers
        foreach ($drivers as $driver) {
            /** @var \Fleetbase\Models\User $user */
            $user = $driver->user;
            if ($user) {
                // Sync email if applicable
                $user->syncProperty('email', $driver);

                // Sync phone if applicable
                $user->syncProperty('phone', $driver);

                // Check if customers user has a customer user record with the company
                $doesntHaveCompanyUser = CompanyUser::where(['user_uuid' => $user->uuid, 'company_uuid' => $driver->company_uuid])->doesntExist();
                if ($doesntHaveCompanyUser) {
                    $this->line('Found driver ' . $user->name . ' (' . $user->email . ') which doesnt have correct company assignment.');
                    $company = Company::where('uuid', $driver->company_uuid)->first();
                    if ($company) {
                        $user->assignCompany($company);
                        $this->line('Driver ' . $user->email . ' was assigned to company: ' . $company->name);
                    }
                }
            }
        }

        return Command::SUCCESS;
    }
}
