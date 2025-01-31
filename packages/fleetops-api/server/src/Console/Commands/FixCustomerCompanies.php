<?php

namespace Fleetbase\FleetOps\Console\Commands;

use Fleetbase\FleetOps\Models\Contact;
use Fleetbase\Models\Company;
use Fleetbase\Models\CompanyUser;
use Fleetbase\Models\User;
use Illuminate\Console\Command;

class FixCustomerCompanies extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetops:fix-customer-companies';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'This is a command which checks customer\'s users to make sure they are assigned to company, if not it assigns the user to the drivers company';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $customers = Contact::where('type', 'customer')->whereNotNull('company_uuid')->get();

        // Fix these customers
        foreach ($customers as $customer) {
            /** @var User $user */
            $customer->loadMissing('user');
            $user = $customer->user;
            if (!$user) {
                try {
                    $customer->createUser();
                    $this->info('User created for customer (' . $customer->name . ' - ' . $customer->email . ')');
                    $customer->loadMissing('user');
                    $user = $customer->user;
                } catch (\Exception $e) {
                    $this->error($e->getMessage());
                    $this->error('Existing user: ' . $customer->email);
                    // Assign existing user to the contact/customer
                    $existingUser = User::where('email', $customer->email)->first();
                    if ($existingUser) {
                        $customer->updateQuietly(['user_uuid' => $existingUser->uuid]);
                        $customer->setRelation('user', $existingUser);
                        $this->info('Update customer user to existing user of the same email address.');
                        $user = $existingUser;
                    }
                }
            }

            if ($user) {
                // Sync email if applicable
                $user->syncProperty('email', $customer);

                // Sync phone if applicable
                $user->syncProperty('phone', $customer);

                // Check if customers user has a customer user record with the company
                $doesntHaveCompanyUser = CompanyUser::where(['user_uuid' => $user->uuid, 'company_uuid' => $customer->company_uuid])->doesntExist();
                if ($doesntHaveCompanyUser) {
                    $this->line('Found user ' . $user->name . ' (' . $user->email . ') which doesnt have correct company assignment.');
                    $company = Company::where('uuid', $customer->company_uuid)->first();
                    if ($company) {
                        $user->assignCompany($company);
                        $this->line('User ' . $user->email . ' was assigned to company: ' . $company->name);
                    }
                }
            }
        }

        return Command::SUCCESS;
    }
}
