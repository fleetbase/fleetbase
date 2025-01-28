<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\Searchable;
use Illuminate\Notifications\DatabaseNotification;

class Notification extends DatabaseNotification
{
    use HasApiModelBehavior;
    use Searchable;
    use Filterable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['read_at', 'data', 'notifiable_id', 'notifiable_type', 'type'];

    /**
     * The searchable columns.
     *
     * @var array
     */
    protected $searchableColumns = ['data->message'];

    /**
     * Marks the notification as read.
     *
     * @param bool $save
     */
    public function markAsRead($save = true): Notification
    {
        $this->read_at = now();

        if ($save) {
            $this->save();
        }

        return $this;
    }

    /**
     * Delete the notification.
     *
     * @return void
     */
    public function deleteNotification()
    {
        $this->delete();
    }
}
