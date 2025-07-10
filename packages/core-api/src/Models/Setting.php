<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Support\Utils;
use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\Searchable;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class Setting extends EloquentModel
{
    use HasApiModelBehavior;
    use Searchable;
    use Filterable;

    /**
     * Create a new instance of the model.
     *
     * @param array $attributes the attributes to set on the model
     *
     * @return void
     */
    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);

        $this->connection = config('fleetbase.db.connection');
    }

    /**
     * No timestamp columns.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'settings';

    /**
     * The database connection to use.
     *
     * @var string
     */
    protected $connection = 'mysql';

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['key'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'key',
        'value',
    ];

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
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'value' => Json::class,
    ];

    /**
     * Bootstraps the model and registers model event listeners.
     * It attaches events to clear cache entries whenever a setting is saved or deleted.
     * This ensures that updates to settings immediately reflect in the system without requiring
     * a manual cache clear, maintaining data integrity and freshness across user sessions.
     */
    protected static function boot()
    {
        parent::boot();

        // Using saved event to cover both creating and updating scenarios
        static::saved(function ($setting) {
            $cacheKey = 'system_settings.' . $setting->key;
            cache()->forget($cacheKey);
        });

        // Handle the setting deletion scenario
        static::deleted(function ($setting) {
            $cacheKey = 'system_settings.' . $setting->key;
            cache()->forget($cacheKey);
        });
    }

    /**
     * Retrieves a system setting by key, with optional default value. The settings are cached indefinitely
     * to optimize performance by reducing database access. If the setting involves nested keys, it uses a dot notation
     * to fetch sub-keys from JSON or serialized arrays stored in the database.
     *
     * @param string $key          the key of the setting to retrieve, which can include dot notation for nested data
     * @param mixed  $defaultValue the default value to return if the setting does not exist
     *
     * @return mixed returns the setting value if found; otherwise, returns the default value
     */
    public static function system($key, $defaultValue = null)
    {
        if (!$key || !is_string($key)) {
            return $defaultValue;
        }

        $cacheKey = 'system_settings.' . $key;

        // Attempt to get the value from the cache
        return cache()->rememberForever($cacheKey, function () use ($key, $defaultValue) {
            $prefix     = Str::startsWith($key, 'system.') ? '' : 'system.';
            $segments   = explode('.', $key);
            $settingKey = $prefix . $key;

            if (count($segments) >= 3) {
                $queryKey   = $prefix . $segments[0] . '.' . $segments[1];
                $subKey     = implode('.', array_slice($segments, 2));
                $setting    = static::where('key', $queryKey)->first();
                if ($setting) {
                    return data_get($setting->value, $subKey, $defaultValue);
                }
            }

            $setting = static::where('key', $settingKey)->first();

            return $setting ? $setting->value : $defaultValue;
        });
    }

    /**
     * Updates a system setting by the specified key with the provided value.
     * If the setting does not exist, it creates a new one. This method is primarily used
     * for system-level configuration values.
     *
     * @param string $key   the key identifier for the setting
     * @param mixed  $value The value to be set. If null, the setting is updated to have a null value.
     *
     * @return Setting|null returns the updated or newly created setting instance, or null if the update fails
     */
    public static function configureSystem($key, $value = null): ?Setting
    {
        return static::configure('system.' . $key, $value, function () {
            static::clearSystemCache();
        });
    }

    /**
     * Updates a system setting by key and value, or creates it if it does not exist.
     * This function is typically used to dynamically configure system settings during runtime.
     *
     * @param string        $key      the key of the setting to update or create
     * @param mixed         $value    The value to set for the setting. If null, it updates the setting with null.
     * @param \Closure|null $callback a callback to do something with the setting record
     *
     * @return Setting|null the updated or created setting instance, or null if the operation fails
     */
    public static function configure($key, $value = null, ?\Closure $callback = null): ?Setting
    {
        $setting = static::updateOrCreate(
            ['key' => $key],
            [
                'key'   => $key,
                'value' => $value,
            ]
        );

        if (is_callable($callback)) {
            $callback($setting);
        }

        return $setting;
    }

    /**
     * Configures a company-specific setting by key and value.
     * This is useful in multi-tenant environments where settings may vary between companies.
     *
     * @param string $key   the key of the setting to configure, prefixed by the company identifier
     * @param mixed  $value the value to set for the setting
     *
     * @return bool returns true if the setting is successfully updated or created, false if not or if the company session is missing
     */
    public static function configureCompany(string $key, $value)
    {
        if (session()->missing('company')) {
            return false;
        }

        return static::configure('company.' . session('company') . '.' . $key, $value);
    }

    /**
     * Look up a setting by key and return its value, or a default value if the setting does not exist.
     * This is a generic lookup function used for retrieving setting values directly from the database.
     *
     * @param string $key          the key of the setting to retrieve
     * @param mixed  $defaultValue the default value to return if the setting does not exist
     *
     * @return mixed|null returns the value of the setting if found, or the default value if not
     */
    public static function lookup(string $key, $defaultValue = null)
    {
        $setting = static::where('key', $key)->first();

        if (!$setting) {
            return $defaultValue;
        }

        return data_get($setting, 'value', $defaultValue);
    }

    /**
     * Retrieves a setting specific to a company from the session context. If the company identifier is not
     * available in the session, it returns the default value.
     *
     * @param string     $key          the setting key associated with a company
     * @param mixed|null $defaultValue the default value to return if the setting or company is not found
     *
     * @return mixed returns the value of the setting if found, or the default value if not
     */
    public static function lookupFromCompany(string $key, $defaultValue = null)
    {
        if (session()->missing('company')) {
            return $defaultValue;
        }

        return static::lookup('company.' . session('company') . '.' . $key, $defaultValue);
    }

    /**
     * Alias for `lookupFromCompany'
     * Retrieves a setting specific to a company from the session context. If the company identifier is not
     * available in the session, it returns the default value.
     *
     * @param string     $key          the setting key associated with a company
     * @param mixed|null $defaultValue the default value to return if the setting or company is not found
     *
     * @return mixed returns the value of the setting if found, or the default value if not
     */
    public static function lookupCompany(string $key, $defaultValue = null)
    {
        return static::lookupFromCompany($key, $defaultValue);
    }

    /**
     * Retrieve a specific setting record by its key.
     *
     * @param string $key the key of the setting to retrieve
     *
     * @return Setting|null returns the setting instance if found, or null if no setting exists with the provided key
     */
    public static function getByKey(string $key)
    {
        return static::where('key', $key)->first();
    }

    /**
     * Retrieve the branding settings.
     *
     * This function fetches the branding settings, including icon URL, logo URL, and default theme.
     * It first retrieves the values from the configuration and then checks for any overrides
     * in the settings database. If the icon or logo UUID is valid, it fetches the corresponding
     * file record to get the URL.
     *
     * @return array an associative array containing branding settings such as 'icon_url', 'logo_url', and 'default_theme'
     */
    public static function getBranding()
    {
        $lightTheme = 'light';
        $brandingSettings = [
            'id'       => 1,
            'uuid'     => 1,
            'icon_url' => config('fleetbase.branding.icon_url'),
            'logo_url' => config('fleetbase.branding.logo_url'),
        ];
        $iconUuid         = static::where('key', 'branding.icon_uuid')->value('value');
        $logoUuid         = static::where('key', 'branding.logo_uuid')->value('value');
        $defaultTheme     = static::where('key', 'branding.default_theme')->value('value');

        // get icon file record
        if (Str::isUuid($iconUuid)) {
            $icon = File::where('uuid', $iconUuid)->first();

            if ($icon && $icon instanceof File) {
                $brandingSettings['icon_url'] = $icon->url;
            }
        }

        // getlogo file record
        if (Str::isUuid($logoUuid)) {
            $logo = File::where('uuid', $logoUuid)->first();

            if ($logo && $logo instanceof File) {
                $brandingSettings['logo_url'] = $logo->url;
            }
        }

        // set branding settings
        $brandingSettings['icon_uuid']     = $iconUuid;
        $brandingSettings['logo_uuid']     = $logoUuid;
        $brandingSettings['default_theme'] = $defaultTheme ?? $lightTheme;
        return $brandingSettings;
    }

    /**
     * Retrieve the branding logo URL.
     *
     * This function fetches the logo URL for branding purposes. It first checks the settings database
     * for a logo UUID. If a valid UUID is found, it retrieves the corresponding file record and returns the URL.
     * If no valid UUID is found, it returns the default logo URL from the configuration.
     *
     * @return string the URL of the branding logo
     */
    public static function getBrandingLogoUrl()
    {
        $logoUuid         = static::where('key', 'branding.logo_uuid')->value('value');

        if (Str::isUuid($logoUuid)) {
            $logo = File::where('uuid', $logoUuid)->first();

            if ($logo && $logo instanceof File) {
                return $logo->url;
            }
        }

        return config('fleetbase.branding.logo_url');
    }

    /**
     * Retrieve the branding icon URL.
     *
     * This function fetches the icon URL for branding purposes. It first checks the settings database
     * for an icon UUID. If a valid UUID is found, it retrieves the corresponding file record and returns the URL.
     * If no valid UUID is found, it returns the default icon URL from the configuration.
     *
     * @return string the URL of the branding icon
     */
    public static function getBrandingIconUrl()
    {
        $iconUuid         = static::where('key', 'branding.icon_uuid')->value('value');

        if (Str::isUuid($iconUuid)) {
            $icon = File::where('uuid', $iconUuid)->first();

            if ($icon && $icon instanceof File) {
                return $icon->url;
            }
        }

        return config('fleetbase.branding.icon_url');
    }

    /**
     * Retrieve a value from the setting.
     *
     * This function fetches a value from the setting's stored JSON data. If the key is not found,
     * it returns the provided default value.
     *
     * @param string $key          the key to retrieve the value for
     * @param mixed  $defaultValue the default value to return if the key is not found
     *
     * @return mixed the value corresponding to the key, or the default value if the key is not found
     */
    public function getValue(string $key, $defaultValue = null)
    {
        return data_get($this->value, $key, $defaultValue);
    }

    /**
     * Retrieve a boolean value from the setting.
     *
     * This function fetches a value from the setting's stored JSON data and casts it to a boolean.
     *
     * @param string $key the key to retrieve the boolean value for
     *
     * @return bool the boolean value corresponding to the key
     */
    public function getBoolean(string $key)
    {
        return Utils::castBoolean($this->getValue($key, false));
    }

    /**
     * Check if there is a database connection.
     *
     * This function attempts to establish a connection to the database and checks if the 'settings' table exists.
     * If the connection or table check fails, it returns false.
     *
     * @return bool true if there is a valid database connection and the 'settings' table exists, otherwise false
     */
    public static function hasConnection(): bool
    {
        try {
            // Try to make a simple DB call
            DB::connection()->getPdo();

            // Check if the settings table exists
            if (!Schema::hasTable('settings')) {
                return false;
            }
        } catch (\Throwable $e) {
            // Connection failed, or other error occurred
            return false;
        }

        return true;
    }

    /**
     * Check if there is no database connection.
     *
     * This function checks if there is no valid database connection by negating the result of `hasConnection`.
     *
     * @return bool true if there is no valid database connection, otherwise false
     */
    public static function doesntHaveConnection(): bool
    {
        return !static::hasConnection();
    }

    /**
     * Clears all cache entries with keys that start with "system_setting".
     *
     * This method connects to the Redis cache store and retrieves all keys
     * that begin with the prefix "system_setting". It then iterates through each key
     * and removes the corresponding cache entry using Laravel's Cache facade.
     *
     * Note: This function assumes that the application is using Redis as the
     * cache driver. If a different cache driver is being used, this method
     * may not function as expected.
     */
    public static function clearSystemCache(): void
    {
        Utils::clearCacheByPattern('system_setting*');
    }

    public function getCompany(): ?Company
    {
        $keySegments = explode('.', $this->key);
        if (count($keySegments) >= 3 && $keySegments[0] === 'company' && Str::isUuid($keySegments[1])) {
            return Company::where('uuid', $keySegments[1])->first();
        }
    }

    public function getUser(): ?User
    {
        $keySegments = explode('.', $this->key);
        if (count($keySegments) >= 3 && $keySegments[0] === 'user' && Str::isUuid($keySegments[1])) {
            return User::where('uuid', $keySegments[1])->first();
        }
    }
}
