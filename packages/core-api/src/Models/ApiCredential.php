<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Support\Utils;
use Fleetbase\Traits\Expirable;
use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPolicies;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasPermissions;

class ApiCredential extends Model
{
    use HasUuid;
    use HasApiModelBehavior;
    use LogsActivity;
    use Searchable;
    use Expirable;
    use Filterable;
    use HasPolicies;
    use HasPermissions;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'api_credentials';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['uuid', '_key', 'user_uuid', 'company_uuid', 'name', 'key', 'secret', 'test_mode', 'api', 'browser_origins', 'last_used_at', 'expires_at'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'test_mode'       => 'boolean',
        'last_used_at'    => 'datetime',
        'expires_at'      => 'datetime',
        'browser_origins' => Json::class,
    ];

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['name'];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = [];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [];

    /**
     * Tables that should be skipped when rolling api credential or initializing `_key`.
     *
     * @todo Refactor so that tables can be added from extensions
     */
    public static array $skipTables = ['vehicles_data', 'permissions', 'roles', 'role_has_permissions', 'model_has_permissions', 'model_has_roles', 'model_has_policies'];

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
    public function user()
    {
        return $this->belongsTo(User::class)->withoutGlobalScopes();
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function company()
    {
        return $this->belongsTo(Company::class)->withoutGlobalScopes();
    }

    /**
     * Set the test_mode attribute based on the request header.
     *
     * This function sets the test_mode attribute by checking the 'Access-Console-Sandbox' header in the request. If the header value is true, the test_mode attribute will be set accordingly.
     *
     * @param bool $testMode Optional. The default value is false, but can be overridden by the request header.
     */
    public function setTestModeAttribute($testMode = false)
    {
        $this->attributes['test_mode'] = Utils::isTrue(request()->header('Access-Console-Sandbox'));
    }

    /**
     * Set the expires at, if value is string convert to date.
     *
     * @return void
     */
    public function setExpiresAtAttribute($expiresAt)
    {
        // if expires at is null or falsy set to null
        if ($expiresAt === null || !$expiresAt) {
            $this->attributes['expires_at'] = null;

            return;
        }
        // if string and not explicit date assume relative time
        // relative options 'never', 'immediately', 'in 1 hour', 'in 24 hours', 'in 3 days', 'in 7 days'
        if (is_string($expiresAt) && !Utils::isDate($expiresAt)) {
            // if never then set to null
            if ($expiresAt === 'never') {
                $this->attributes['expires_at'] = null;

                return;
            }
            // if immediately then set to current date time
            if ($expiresAt === 'immediately') {
                $this->attributes['expires_at'] = Carbon::now()->toDatetime();

                return;
            }
            // parse relative time string to datetime
            $expiresAt          = trim(str_replace('in', '', $expiresAt));
            $expiresAtTimestamp = strtotime('+ ' . $expiresAt);
            // convert timestamp to datetime
            $this->attributes['expires_at'] = Utils::toDatetime($expiresAtTimestamp);

            return;
        }
        $this->attributes['expires_at'] = Utils::toDatetime($expiresAt);
    }

    /**
     * Generate an API Key.
     *
     * @return array
     */
    public static function generateKeys($encode, $testKey = false)
    {
        $sqids = new \Sqids\Sqids();
        $key   = $sqids->encode($encode);
        $hash  = Hash::make($key);

        return [
            'key'    => ($testKey ? 'flb_test_' : 'flb_live_') . $key,
            'secret' => $hash,
        ];
    }

    /**
     * Update the datetime of the last usage.
     *
     * @return bool
     */
    public function trackLastUsed()
    {
        return $this->update(['last_used_at' => now()]);
    }
}
