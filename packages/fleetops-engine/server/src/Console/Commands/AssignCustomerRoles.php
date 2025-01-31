<?php

namespace Fleetbase\FleetOps\Console\Commands;

use Fleetbase\FleetOps\Models\Contact;
use Illuminate\Console\Command;

class AssignCustomerRoles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetops:assign-customer-roles';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assigns the Customer role to all customer type contacts.';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $customers = Contact::where('type', 'customer')->get();

        foreach ($customers as $customer) {
            $customer->loadMissing('user');
            if (!$customer->user) {
                $customer->createUser();
                $customer->loadMissing('user');
            }

            try {
                $customer->user->assignSingleRole('Fleet-Ops Customer');
                $this->info($customer->name . ' - Customer: ' . $customer->email . ' has been assigned the Customer role.');
            } catch (\Throwable $e) {
                $this->error($e->getMessage());
            }
        }

        return Command::SUCCESS;
    }
}
