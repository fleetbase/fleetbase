<?php

namespace Fleetbase\Events;

use Fleetbase\Models\Company;
use Fleetbase\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserRemovedFromCompany
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public User $user;
    public Company $company;

    /**
     * Create a new event instance.
     *
     * @return void
     */
    public function __construct(User $user, Company $company)
    {
        $this->user    = $user->setRelations([]);
        $this->company = $company->setRelations([]);
    }
}
