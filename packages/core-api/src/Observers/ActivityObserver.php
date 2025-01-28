<?php

namespace Fleetbase\Observers;

use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;

class ActivityObserver
{
    /**
     * Handle the Activity "creating" event.
     *
     * @return void
     */
    public function creating(Activity $activity)
    {
        $activity->company_id = session('company');
        $activity->uuid       = static::generateUuidForActivity();
    }

    /**
     * Generate a unique UUID for an activity.
     *
     * This function generates a UUID and checks if it already exists in the Activity table. If it does, it recursively generates a new UUID until a unique one is found.
     *
     * @return string the unique UUID generated for the activity
     */
    public static function generateUuidForActivity()
    {
        $uuid   = (string) Str::uuid();
        $exists = Activity::where('uuid', $uuid)->exists();

        if ($exists) {
            return static::generateUuidForActivity('uuid');
        }

        return $uuid;
    }
}
