<?php

namespace Fleetbase\FleetOps\Observers;

use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\Models\CompanyUser;

class CompanyUserObserver
{
    /**
     * Handle the CompanyUser "deleted" event.
     *
     * @return void
     */
    public function deleted(CompanyUser $companyUser)
    {
        // if the company user deleted is a driver, delete their driver record to
        Driver::where('user_uuid', $companyUser->user_uuid)->delete();
    }

    /**
     * Handle the CompanyUser "updated" event.
     *
     * @return void
     */
    public function updated(CompanyUser $companyUser)
    {
        // If the company user has any driver assosciated update status to same as company_users
        $driver = Driver::where('user_uuid', $companyUser->user_uuid)->first();
        if ($driver && $companyUser->wasChanged('status')) {
            $driver->update(['status' => $companyUser->status]);
        }
    }
}
