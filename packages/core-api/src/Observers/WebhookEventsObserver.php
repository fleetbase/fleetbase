<?php

namespace Fleetbase\Observers;

use Fleetbase\Events\ResourceLifecycleEvent;
use Fleetbase\Models\Model;

/**
 * Class WebhookEventsObserver.
 *
 * Broadcast webhook and socket events whenever a Fleetbase resource is either created, updated, or deleted.
 * These are lifecycle events for resources, other events may potentially be captured such as
 * "retrieved, creating, created, updating, updated, saving, saved, deleting, deleted, restoring, restored"
 *
 * Additional actionable events should be defined in their own events.
 */
class WebhookEventsObserver
{
    /**
     * Listen to the entity created event.
     *
     * @param  Model
     *
     * @return void
     */
    public function created(Model $model)
    {
        event(new ResourceLifecycleEvent($model, 'created'));
    }

    /**
     * Listen to the entity updated event.
     *
     * @param  Model
     *
     * @return void
     */
    public function updated(Model $model)
    {
        if ($model->wasChanged()) {
            event(new ResourceLifecycleEvent($model, 'updated'));
        }
    }

    /**
     * Listen to the entity deleted event.
     *
     * @param  Model
     *
     * @return void
     */
    public function deleted(Model $model)
    {
        event(new ResourceLifecycleEvent($model, 'deleted'));
    }
}
