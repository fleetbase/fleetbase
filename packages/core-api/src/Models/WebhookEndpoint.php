<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class WebhookEndpoint extends Model
{
    use HasUuid;
    use HasApiModelBehavior;
    use LogsActivity;
    use Searchable;
    use Filterable;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'webhook_endpoints';

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['url', 'description'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['_key', 'company_uuid', 'created_by_uuid', 'updated_by_uuid', 'api_credential_uuid', 'url', 'mode', 'version', 'description', 'events', 'status'];

    /**
     * The attributes that should be casted to native types.
     *
     * @var array
     */
    protected $casts = [
        'events' => 'array',
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['is_listening_on_all_events', 'api_credential_name'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = ['apiCredential'];

    /**
     * Get the activity log options for the model.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly(['*'])->logOnlyDirty();
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function apiCredential()
    {
        return $this->belongsTo(ApiCredential::class);
    }

    /**
     * Determines if webhook is listening to all events.
     */
    public function getIsListeningOnAllEventsAttribute(): bool
    {
        return count(config('api.events')) === count($this->events ?? []) || empty($this->events);
    }

    /**
     * Get the api credential name or key.
     *
     * @return string
     */
    public function getApiCredentialNameAttribute()
    {
        if (isset($this->apiCredential->name)) {
            return static::attributeFromCache($this, 'apiCredential.name', function () {
                return $this->apiCredential->name . ' (' . $this->apiCredential->key . ')';
            });
        }

        return static::attributeFromCache($this, 'apiCredential.key');
    }

    /**
     * Determines if an event cannot be fired based on the current events array.
     *
     * Checks if the 'events' property is an array, it is not empty, and the specified
     * event is not present in the array. If these conditions are met, the event
     * cannot be fired.
     *
     * @param string $event the name of the event to check
     *
     * @return bool returns true if the event cannot be fired, otherwise false
     */
    public function cannotFireEvent(string $event): bool
    {
        return is_array($this->events) && count($this->events) && !in_array($event, $this->events);
    }

    /**
     * Determines if an event can be fired.
     *
     * Utilizes the `cannotFireEvent` method to check if the event cannot be fired.
     * If `cannotFireEvent` returns false, then it implies the event can be fired.
     *
     * @param string $event the name of the event to check
     *
     * @return bool returns true if the event can be fired, otherwise false
     */
    public function canFireEvent(string $event): bool
    {
        return !$this->cannotFireEvent($event);
    }

    /**
     * Enables the webhook.
     */
    public function enable(): bool
    {
        $this->status = 'enabled';

        return $this->save();
    }

    /**
     * Disables the webhook.
     */
    public function disable(): bool
    {
        $this->status = 'disabled';

        return $this->save();
    }
}
