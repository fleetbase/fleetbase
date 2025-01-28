<?php

namespace Fleetbase\FleetOps\Observers;

use Fleetbase\FleetOps\Models\Contact;
use Fleetbase\Models\User;

class ContactObserver
{
    /**
     * Handle the Contact "creating" event.
     *
     * @return void
     */
    public function created(Contact $contact)
    {
        // Create a user account for the contact
        $contact->createUser();
    }

    /**
     * Handle the Contact "creating" event.
     *
     * @return void
     */
    public function updating(Contact $contact)
    {
        // Get the contacts assosciated user
        if ($contact->doesntHaveUser()) {
            $contact->createUser();
        }

        // Validate email is available to user
        if ($contact->isDirty('email') && $this->isEmailUnavailable($contact)) {
            throw new \Exception('Email attempting to update for ' . $contact->type . ' is not available.');
        }

        // Validate phone is available to user
        if ($contact->isDirty('phone') && $this->isPhoneUnavailable($contact)) {
            throw new \Exception('Phone attempting to update for ' . $contact->type . ' is not available.');
        }

        // Sync updates from contact to user
        $contact->syncWithUser();
    }

    /**
     * Handle the Contact "deleted" event.
     *
     * @return void
     */
    public function deleted(Contact $contact)
    {
        // Delete the assosciated user account
        $contact->deleteUser();
    }

    private function isEmailUnavailable(Contact $contact)
    {
        return User::where('email', $contact->email)->whereNot('uuid', $contact->user_uuid)->exists() || Contact::where('email', $contact->email)->whereNot('uuid', $contact->uuid)->exists();
    }

    private function isPhoneUnavailable(Contact $contact)
    {
        return User::where('phone', $contact->phone)->whereNot('uuid', $contact->user_uuid)->exists() || Contact::where('phone', $contact->phone)->whereNot('uuid', $contact->uuid)->exists();
    }
}
