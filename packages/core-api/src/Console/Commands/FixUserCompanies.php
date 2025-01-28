<?php

namespace Fleetbase\Console\Commands;

use Fleetbase\Models\Company;
use Fleetbase\Models\CompanyUser;
use Fleetbase\Models\User;
use Illuminate\Console\Command;

class FixUserCompanies extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetbase:fix-user-companies';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'This is a command which checks users\'s to make sure they are assigned to company, if not it assigns them to their correct company.';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $users = User::whereNotNull('company_uuid')->get();

        // Fix these users
        /** @var User $user */
        foreach ($users as $user) {
            // Check if user has a customer user record with the company
            $doesntHaveCompanyUser = CompanyUser::where(['user_uuid' => $user->uuid, 'company_uuid' => $user->company_uuid])->doesntExist();
            if ($doesntHaveCompanyUser) {
                $this->line('Found user ' . $user->name . ' (' . $user->email . ') which doesnt have correct company assignment.');
                $company = Company::where('uuid', $user->company_uuid)->first();
                if ($company) {
                    $user->assignCompany($company);
                    $this->line('User ' . $user->email . ' was assigned to company: ' . $company->name);
                }
            }
        }

        return Command::SUCCESS;
    }
}
