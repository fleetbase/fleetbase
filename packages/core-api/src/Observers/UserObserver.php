<?php

namespace Fleetbase\Observers;

use Fleetbase\Models\CompanyUser;
use Fleetbase\Models\User;

class UserObserver
{
    /**
     * Handle the User "deleted" event.
     *
     * @return void
     */
    public function deleted(User $user)
    {
        // remove company user records
        if (session('company')) {
            CompanyUser::where(['company_uuid' => session('company'), 'user_uuid' => $user->uuid])->delete();
        }
    }
}
