<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasOptionsAttributes;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Fleetbase\Traits\SendsWebhooks;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Company extends Model
{
    use HasUuid;
    use HasPublicId;
    use TracksApiCredential;
    use HasApiModelBehavior;
    use HasOptionsAttributes;
    use HasSlug;
    use Searchable;
    use SendsWebhooks;
    use Notifiable;

    /**
     * The database connection to use.
     *
     * @var string
     */
    protected $connection = 'mysql';

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'companies';

    /**
     * The HTTP resource to use for responses.
     *
     * @var string
     */
    public $resource = \Fleetbase\Http\Resources\Organization::class;

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'company';

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['name', 'description'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'uuid', // syncable
        'public_id', // syncable
        'stripe_customer_id',
        'stripe_connect_id',
        'name',
        'owner_uuid',
        'logo_uuid',
        'backdrop_uuid',
        'place_uuid',
        'website_url',
        'description',
        'options',
        'type',
        'currency',
        'country',
        'phone',
        'timezone',
        'plan',
        'status',
        'slug',
        'trial_ends_at',
        'parking_zone_max_distance',
        'language_id',
        'number_of_drivers',    // Number of drivers in the company
        'number_of_web_users',  // Number of web users in the company
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['logo_url', 'backdrop_url'];

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
        'options'       => Json::class,
        'trial_ends_at' => 'datetime',
    ];

    /**
     * Properties which activity needs to be logged.
     *
     * @var array
     */
    protected static $logAttributes = '*';

    /**
     * Do not log empty changed.
     *
     * @var bool
     */
    protected static $submitEmptyLogs = false;

    /**
     * The name of the subject to log.
     *
     * @var string
     */
    protected static $logName = 'company';

    /**
     * Get the options for generating the slug.
     */
    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    public function creator(): BelongsTo|Builder
    {
        return $this->belongsTo(User::class)->whereHas('anyCompanyUser', function ($query) {
            $query->where('company_uuid', $this->uuid);
        });
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'company_users',
            'company_uuid',
            'user_uuid',
            'uuid',
            'uuid'
        );
    }

    public function companyUsers(): HasManyThrough
    {
        return $this->hasManyThrough(User::class, CompanyUser::class, 'company_uuid', 'uuid', 'uuid', 'user_uuid');
    }

    public function logo(): BelongsTo
    {
        return $this->belongsTo(File::class);
    }

    public function backdrop(): BelongsTo
    {
        return $this->belongsTo(File::class);
    }

    public function drivers(): HasMany
    {
        return $this->hasMany(Driver::class);
    }

    public function apiCredentials(): HasMany
    {
        return $this->hasMany(ApiCredential::class);
    }

    public function loadCompanyOwner(): self
    {
        $this->loadMissing(['owner', 'creator']);
        $owner = $this->owner ?? $this->creator;

        if ($owner) {
            $this->setRelation('owner', $owner);

            return $this;
        }

        if (Str::isUuid($this->owner_uuid)) {
            $owner = User::where('uuid', $this->owner_uuid)->first();
            if ($owner) {
                $this->setRelation('owner', $owner);

                return $this;
            }
        }

        return $this;
    }

    /**
     * Assigns the owner of the company.
     *
     * @method assignOwner
     */
    public function assignOwner(User $user): User
    {
        $this->owner_uuid = $user->uuid;
        $this->save();

        // Set owner role to Administrator
        $this->changeUserRole($user, 'Administrator');

        return $user;
    }

    /**
     * Set the owner of the company.
     *
     * @method setOwner
     *
     * @return Company
     */
    public function setOwner(User $user)
    {
        $this->owner_uuid = $user->uuid;

        return $this;
    }

    /**
     * Set the status of the company.
     *
     * @method setStatus
     *
     * @return Company
     */
    public function setStatus($status = 'active')
    {
        $this->status = $status;

        return $this;
    }

    /**
     * Sets the owner of the company.
     */
    public function activate()
    {
        return $this->setStatus('active');
    }

    /**
     * @return string
     */
    public function getLogoUrlAttribute()
    {
        return $this->logo->url ?? 'https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/image-file-icon.png';
    }

    /**
     * @return string
     */
    public function getBackdropUrlAttribute()
    {
        return $this->backdrop->url ?? 'https://flb-assets.s3.ap-southeast-1.amazonaws.com/static/default-storefront-backdrop.png';
    }

    /**
     * Determines if the currently authenticated user is the owner of the company.
     *
     * @return bool
     */
    public function getIsOwnerAttribute()
    {
        return auth()->check() && auth()->user()->uuid === $this->owner_uuid;
    }

    /**
     * Checks if a user is the owner of this company.
     *
     * @method isOwner
     *
     * @param \Fleetbae\Models\User
     *
     * @return bool
     */
    public function isOwner(User $user)
    {
        return $user->uuid === $this->owner_uuid;
    }

    /**
     * Company field that should be used for Twilio notifications.
     *
     * @return string
     */
    public function routeNotificationForTwilio()
    {
        return $this->phone;
    }

    /**
     * Retrieves the current session's Company instance.
     *
     * This static method fetches the 'company' identifier from the session and attempts to retrieve
     * the corresponding Company model. If no company identifier is found in the session, it returns null.
     *
     * @return Company|null the current session's Company instance or null if not found
     */
    public static function currentSession(): ?Company
    {
        $id = session('company');

        if ($id) {
            return static::where('uuid', $id)->first();
        }

        return null;
    }

    /**
     * Adds a user to the company with an optional role and status.
     *
     * This method associates a given User with the company by creating or retrieving a CompanyUser record.
     * If a role name is provided, it assigns that role to the CompanyUser. If no role name is specified,
     * it defaults to the user's current role. The status can also be specified, defaulting to 'active'.
     *
     * @param User        $user   the user to be added to the company
     * @param string|null $role   The name or ID of the role to assign to the user. Defaults to the user's current role if null.
     * @param string      $status The status of the user within the company. Defaults to 'active'.
     *
     * @return CompanyUser the CompanyUser instance representing the association between the user and the company
     */
    public function addUser(User $user, string $role = 'Administrator', string $status = 'active'): CompanyUser
    {
        // Get the currentuser role
        $role = $role;

        $companyUser = CompanyUser::firstOrCreate(
            [
                'company_uuid'     => $this->uuid,
                'user_uuid'        => $user->uuid,
            ],
            [
                'company_uuid' => $this->uuid,
                'user_uuid'    => $user->uuid,
                'status'       => $user->status ?? $status,
            ]
        );

        // Assign the role to the new user
        $companyUser->assignSingleRole($role);

        return $companyUser;
    }

    /**
     * Changes the role of a specified user within the company.
     *
     * This method assigns a new role to a user associated with the company. It first retrieves the
     * `CompanyUser` pivot model for the given user using the `getCompanyUserPivot` method. If the
     * pivot exists, it assigns the specified role using the `assignSingleRole` method and returns
     * `true` to indicate a successful role change. If the user is not associated with the company,
     * the method returns `false`.
     *
     * **Usage Example:**
     * ```php
     * $company = Company::find($companyId);
     * $user = User::find($userId);
     * $roleName = 'Administrator';
     *
     * try {
     *     if ($company->changeUserRole($user, $roleName)) {
     *         // Role changed successfully
     *     } else {
     *         // Failed to change role (e.g., user not found in the company)
     *     }
     * } catch (\Exception $e) {
     *     // Handle exception (e.g., log error, notify user)
     *     Log::error('Role change failed: ' . $e->getMessage());
     * }
     * ```
     *
     * @param User   $user     the user whose role is to be changed within the company
     * @param string $roleName the name of the new role to assign to the user
     *
     * @return bool returns `true` if the role was successfully changed; otherwise, returns `false`
     *
     * @throws \InvalidArgumentException if the provided user is not associated with the company
     * @throws \Exception                If the role assignment fails due to underlying issues (e.g., database errors).
     *
     * @see getCompanyUserPivot()
     * @see CompanyUser::assignSingleRole()
     */
    public function changeUserRole(User $user, string $roleName): bool
    {
        $companyUser = $this->getCompanyUserPivot($user);
        if (!$companyUser) {
            throw new \InvalidArgumentException('The specified user is not associated with the company.');
        }

        try {
            $companyUser->assignSingleRole($roleName);

            return true;
        } catch (\Exception $e) {
            throw new \Exception('Role assignment failed. Please try again later.');
        }
    }

    /**
     * Assigns a user to the company and sets their role.
     *
     * This method adds a user to the company using the addUser method and then associates the company with the user.
     * It optionally allows specifying a role name for the user within the company.
     *
     * @param User $user the user to assign to the company
     *
     * @return CompanyUser the CompanyUser instance representing the association between the user and the company
     */
    public function assignUser(User $user, ?string $role = null): CompanyUser
    {
        $companyUser = $this->addUser($user, $role);
        $user->assignCompany($this);

        return $companyUser;
    }

    /**
     * Retrieves the timestamp of the most recent user login in the company.
     *
     * This method queries the company's associated users and returns the latest 'last_login' timestamp.
     *
     * @return string|null the timestamp of the last user login in 'Y-m-d H:i:s' format, or null if no logins are recorded
     */
    public function getLastUserLogin()
    {
        return $this->companyUsers()->max('last_login');
    }

    /**
     * Retrieves the associated User instance for a given user identifier or User object.
     *
     * This method accepts either a user's UUID as a string or a User instance and returns the corresponding
     * User associated with the company. It performs a lookup within the company's users based on the provided
     * identifier.
     *
     * **Usage Example:**
     * ```php
     * // Using a User instance
     * $user = User::find($userId);
     * $companyUser = $company->getCompanyUser($user);
     *
     * // Using a user UUID
     * $companyUser = $company->getCompanyUser('uuid-string-here');
     * ```
     *
     * @param string|User $user the user identifier (UUID) or a User instance to retrieve the associated User
     *
     * @return User|null the User instance associated with the company, or null if not found
     *
     * @throws \InvalidArgumentException if the provided argument is neither a string nor an instance of User
     */
    public function getCompanyUser(string|User $user): ?User
    {
        $id = $user instanceof User ? $user->uuid : $user;

        return $this->companyUsers()->where('user_uuid', $id)->first();
    }

    /**
     * Retrieves the CompanyUser pivot instance for a given user identifier or User object.
     *
     * This method accepts either a user's UUID as a string or a User instance and returns the corresponding
     * CompanyUser pivot model that represents the association between the company and the user. It performs
     * a direct lookup in the CompanyUser model based on the company's UUID and the provided user identifier.
     *
     * **Usage Example:**
     * ```php
     * // Using a User instance
     * $user = User::find($userId);
     * $companyUserPivot = $company->getCompanyUserPivot($user);
     *
     * // Using a user UUID
     * $companyUserPivot = $company->getCompanyUserPivot('uuid-string-here');
     * ```
     *
     * @param string|User $user the user identifier (UUID) or a User instance to retrieve the associated CompanyUser pivot
     *
     * @return CompanyUser|null the CompanyUser pivot instance representing the association, or null if not found
     *
     * @throws \InvalidArgumentException if the provided argument is neither a string nor an instance of User
     */
    public function getCompanyUserPivot(string|User $user): ?CompanyUser
    {
        $id = $user instanceof User ? $user->uuid : $user;

        return CompanyUser::where(['company_uuid' => $this->uuid, 'user_uuid' => $id])->first();
    }
}
