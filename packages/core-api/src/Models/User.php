<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Exceptions\InvalidVerificationCodeException;
use Fleetbase\Notifications\UserCreated;
use Fleetbase\Notifications\UserInvited;
use Fleetbase\Support\NotificationRegistry;
use Fleetbase\Support\Utils;
use Fleetbase\Traits\ClearsHttpCache;
use Fleetbase\Traits\Expandable;
use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasCacheableAttributes;
use Fleetbase\Traits\HasMetaAttributes;
use Fleetbase\Traits\HasPresence;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\ProxiesAuthorizationMethods;
use Fleetbase\Traits\Searchable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasTimestamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\CausesActivity;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;
use Fleetbase\FleetOps\Models\Driver;

class User extends Authenticatable
{
    use HasUuid;
    use HasPublicId;
    use HasPresence;
    use Searchable;
    use Notifiable;
    use HasApiTokens;
    use HasSlug;
    use HasApiModelBehavior;
    use HasCacheableAttributes;
    use HasMetaAttributes;
    use HasTimestamps;
    use LogsActivity;
    use CausesActivity;
    use SoftDeletes;
    use ProxiesAuthorizationMethods, Expandable {
        ProxiesAuthorizationMethods::__call insteadof Expandable;
        Expandable::__call as __callExpansion;
    }
    use Filterable;
    use ClearsHttpCache;

    /**
     * The database connection to use.
     *
     * @var string
     */
    protected $connection = 'mysql';

    /**
     * Override the default primary key.
     *
     * @var string
     */
    protected $primaryKey = 'uuid';

    /**
     * The "type" of the primary key ID.
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * Primary key is non incrementing.
     *
     * @var string
     */
    public $incrementing = false;

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'users';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'user';

    /**
     * The default guard for this model.
     *
     * @var string
     */
    public $guard_name = 'sanctum';

    /**
     * The attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['name', 'email', 'phone'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'uuid',
        'public_id',
        'company_uuid',
        '_key',
        'avatar_uuid',
        'username',
        'email',
        'name',
        'phone',
        'date_of_birth',
        'timezone',
        'meta',
        'country',
        'ip_address',
        'last_login',
        'email_verified_at',
        'phone_verified_at',
        'slug',
        'status',
    ];

    /**
     * Attributes which are not mass assignable.
     *
     * @var array
     */
    protected $guarded = ['password', 'type'];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = ['password', 'remember_token', 'secret', 'avatar', 'username', 'company', 'companyUsers', 'companies'];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = [
        'avatar_url',
        'session_status',
        'company_name',
        'is_admin',
        'is_online',
        'last_seen_at',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'meta'              => Json::class,
        'email_verified_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'last_login'        => 'datetime',
    ];

    /**
     * Get the options for generating the slug.
     */
    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    /**
     * Get the activity log options for the model.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'name',
                'username',
                'email',
                'phone',
                'date_of_birth',
                'timezone',
                'country',
                'avatar_uuid',
            ])
            ->logOnlyDirty()
            ->dontLogIfAttributesChangedOnly(['last_login']);
    }

    /**
     * Bootstraps the model and its events.
     *
     * This method overrides the default Eloquent model boot method
     * to add a custom 'creating' event listener. This listener is used
     * to set default values when a new model instance is being created.
     *
     * @return void
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->username = $model->username ? $model->username : static::generateUsername($model->name);
        });
    }

    /**
     * Defines the relationship between the user and their company.
     *
     * This method establishes a `BelongsTo` relationship, indicating that the user belongs to a single company.
     *
     * @return BelongsTo the relationship instance between the User and the Company model
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Defines the relationship between the user and their avatar file.
     *
     * This method establishes a `BelongsTo` relationship, indicating that the user's avatar is a file record.
     *
     * @return BelongsTo the relationship instance between the User and the File model
     */
    public function avatar(): BelongsTo
    {
        return $this->belongsTo(File::class);
    }

    /**
     * Defines the relationship between the user and their devices.
     *
     * This method establishes a `HasMany` relationship, indicating that the user can have multiple associated devices.
     *
     * @return HasMany the relationship instance between the User and the UserDevice model
     */
    public function devices(): HasMany
    {
        return $this->hasMany(UserDevice::class);
    }

    /**
     * Retrieves all CompanyUser pivot records associated with the user.
     *
     * This method defines a one-to-many relationship between the User model and the CompanyUser model.
     * It allows fetching all pivot records that link the user to various companies through the
     * `company_users` pivot table using the `user_uuid` foreign key.
     *
     * **Usage Example:**
     * ```php
     * $user = User::find($userId);
     * $companyUsers = $user->companyUsers;
     * foreach ($companyUsers as $companyUser) {
     *     echo $companyUser->company->name;
     * }
     * ```
     *
     * @return HasMany the HasMany relationship instance
     *
     * @throws \LogicException if the relationship is improperly defined or the models do not exist
     *
     * @see CompanyUser
     * @see Company
     */
    public function companyUsers(): HasMany
    {
        return $this->hasMany(CompanyUser::class, 'user_uuid');
    }

    /**
     * Retrieves all companies associated with the user through the CompanyUser pivot table.
     *
     * This method defines a HasManyThrough relationship between the User model and the Company model
     * via the CompanyUser pivot table. It allows fetching all companies that the user is associated with
     * through their entries in the CompanyUser pivot.
     *
     * **Usage Example:**
     * ```php
     * $user = User::find($userId);
     * $companies = $user->companies;
     * foreach ($companies as $company) {
     *     echo $company->name;
     * }
     * ```
     *
     * @return HasManyThrough the HasManyThrough relationship instance
     *
     * @throws \LogicException if the relationship is improperly defined or the models do not exist
     *
     * @see CompanyUser
     * @see Company
     */
    public function companies(): HasManyThrough
    {
        return $this->hasManyThrough(Company::class, CompanyUser::class, 'company_uuid', 'uuid', 'uuid', 'user_uuid');
    }

    /**
     * Defines the relationship between the user and their current company user record.
     *
     * This method establishes a `HasOne` relationship, indicating that the user has one associated
     * `CompanyUser` record for the current company (determined by the `company_uuid` stored in the session).
     *
     * @return HasOne|Builder the relationship instance between the User and the CompanyUser model
     */
    public function companyUser(): HasOne|Builder
    {
        return $this->hasOne(CompanyUser::class, 'user_uuid', 'uuid')->where('company_uuid', $this->company_uuid);
    }

    /**
     * Defines the relationship between the user and any company user record.
     *
     * This method establishes a `HasOne` relationship, indicating that the user has one associated
     * `CompanyUser` record, regardless of the company.
     *
     * @return HasOne|Builder the relationship instance between the User and the CompanyUser model
     */
    public function anyCompanyUser(): HasOne|Builder
    {
        return $this->hasOne(CompanyUser::class, 'user_uuid', 'uuid');
    }

    /**
     * Defines the relationship between the user and the groups they are part of.
     *
     * This method establishes a `HasManyThrough` relationship, indicating that the user can belong to multiple groups
     * through the `GroupUser` pivot table.
     *
     * @return HasManyThrough the relationship instance between the User and the Group model
     */
    public function groups(): HasManyThrough
    {
        return $this->hasManyThrough(Group::class, GroupUser::class, 'user_uuid', 'uuid', 'uuid', 'group_uuid');
    }

    /**
     * Retrieves the locale setting for the company.
     *
     * This method fetches the locale preference associated with the company using the company's UUID.
     * It utilizes the `Setting::lookup` method to retrieve the locale value from the settings storage.
     * If no locale is set for the company, it defaults to `'en-us'`.
     *
     * **Usage Example:**
     * ```php
     * try {
     *     $company = Company::find($companyId);
     *     $locale = $company->getLocale();
     *     // $locale might return 'en-us' or any other locale set for the company
     * } catch (\Exception $e) {
     *     // Handle exception (e.g., log error, notify user)
     *     Log::error('Failed to retrieve company locale: ' . $e->getMessage());
     * }
     * ```
     *
     * @return string The locale code for the company (e.g., 'en-us', 'fr-fr').
     *
     * @throws \Exception if there is an issue accessing the settings storage
     *
     * @see Setting::lookup()
     */
    public function getLocale(): string
    {
        try {
            return Setting::lookup('user.' . $this->uuid . '.locale', 'en-us');
        } catch (\Exception $e) {
            throw new \Exception('Unable to retrieve user locale setting at this time.', 0, $e);
        }
    }

    /**
     * Generates a unique username based on the provided name.
     *
     * This method creates a username by taking the given name, appending
     * a random 4-character string, and then converting the combination
     * into a slug format. The name and the random string are separated
     * by an underscore. The slugification ensures the username is URL-friendly
     * (lowercase, with spaces and special characters turned into underscores).
     *
     * @param string $name the base name to be used for generating the username
     *
     * @return string the generated username in slug format with a random 4-character string
     */
    public static function generateUsername(string $name): string
    {
        return Str::slug($name . '_' . Str::random(4), '_');
    }

    /**
     * Retrieves the `CompanyUser` record for the user, either for the current or a specified company.
     *
     * This method first attempts to load the `companyUser` relationship, which is associated with the current company
     * (as determined by the session). If a `CompanyUser` record is found, it is returned.
     * If not, and a specific company is provided, the method searches the user's associated companies
     * for a `CompanyUser` record matching the given company UUID.
     *
     * @param Company|null $company the company to retrieve the `CompanyUser` record for, or null to use the current company
     *
     * @return CompanyUser|null the `CompanyUser` instance if found, or null if not found
     */
    public function getCompanyUser(?Company $company = null): ?CompanyUser
    {
        $this->loadMissing(['companyUser', 'companyUsers']);
        if ($this->companyUser) {
            return $this->companyUser;
        }

        $companyUuid = $company ? $company->uuid : $this->company_uuid;
        if (!$companyUuid) {
            return null;
        }

        $companyUser = $this->companyUsers()->where('company_uuid', $companyUuid)->first();
        if ($companyUser) {
            $this->setRelation('companyUser', $companyUser);

            return $companyUser;
        }

        return null;
    }

    /**
     * Load the associated company user relationship for the current user.
     *
     * This method ensures that the `companyUser` relationship is loaded for the user.
     * If the relationship is not already loaded and no associated `companyUser` exists,
     * it attempts to load the `company` relationship and retrieve the `companyUser`
     * associated with the loaded company. If a `companyUser` is found, it sets
     * the relationship accordingly.
     *
     * @return $this the current instance of the user model with the `companyUser` relationship loaded
     */
    public function loadCompanyUser(): self
    {
        $this->loadMissing('companyUser');

        if (!$this->companyUser) {
            $this->loadMissing('company');
            $companyUser = $this->getCompanyUser($this->company);
            if ($companyUser) {
                $this->setRelation('companyUser', $companyUser);
            }
        }

        return $this;
    }

    /**
     * Set the `companyUser` relation on the user for the specified company.
     *
     * This method searches for the `CompanyUser` relationship instance associated with the provided
     * company. If a matching `CompanyUser` record is found, it sets the `companyUser` relation
     * on the user model, allowing it to be accessed as if it were loaded through a relationship.
     *
     * @param Company $company the company instance to set the `companyUser` relation for
     */
    public function setCompanyUserRelation(Company $company): void
    {
        $companyUser = $this->companyUsers()->where('company_uuid', $company->uuid)->first();
        if ($companyUser) {
            $this->setRelation('companyUser', $companyUser);
        }
    }

    /**
     * Assigns the user to a company and handles related processes.
     *
     * This method assigns the given company to the user by updating the `company_uuid` attribute.
     * It creates a new `CompanyUser` record if it does not exist. If the user is not an admin
     * and is not the company owner, they will be invited to join the company and the company owner
     * will be notified that a user has been created.
     *
     * @param Company     $company the company to assign the user to
     * @param string|null $role    The name or ID of the role to assign to the user. Defaults to the user's current role if null.
     *
     * @return self returns the current User instance
     */
    public function assignCompany(Company $company, string $role = 'Administrator'): self
    {
        $this->company_uuid = $company->uuid;

        // Create company user record
        if (CompanyUser::where(['company_uuid' => $company->uuid, 'user_uuid' => $this->uuid])->doesntExist()) {
            $companyUser = $company->addUser($this, $role);
            $this->setRelation('companyUser', $companyUser);
        }

        // Determine if user should receive invite to join company
        if ($this->isNotAdmin() && !$this->isCompanyOwner($company)) {
            // Invite user to join company
            $this->sendInviteFromCompany($company);

            // Notify the company owner a user has been created
            NotificationRegistry::notify(UserCreated::class, $this, $company);
        }

        $this->save();

        return $this;
    }

    /**
     * Sets the user's company without any additional processing.
     *
     * This method directly assigns the given company to the user by updating the `company_uuid` attribute
     * and saving the model.
     *
     * @param Company $company the company to set for the user
     *
     * @return self returns the current User instance
     */
    public function setCompany(Company $company): self
    {
        $this->company_uuid = $company->uuid;
        $this->save();

        return $this;
    }

    /**
     * Checks if the user is the owner of the given company.
     *
     * This method compares the user's UUID with the owner's UUID of the specified company
     * to determine if the user is the owner.
     *
     * @param Company $company the company to check ownership of
     *
     * @return bool returns true if the user is the company owner, false otherwise
     */
    public function isCompanyOwner(Company $company): bool
    {
        return $this->uuid === $company->owner_uuid;
    }

    /**
     * Assigns the user to a company based on a company ID or public ID.
     *
     * This method checks if the provided ID is a valid UUID or public ID.
     * If a company is found with the given ID, the user is assigned to that company.
     *
     * @param string|null $id the UUID or public ID of the company to assign the user to
     *
     * @return self returns the current User instance
     */
    public function assignCompanyFromId(?string $id): self
    {
        if (!Str::isUuid($id) && !Utils::isPublicId($id)) {
            return $this;
        }

        // Get company record
        $company = Company::where('uuid', $id)->orWhere('public_id', $id)->first();
        if ($company) {
            return $this->assignCompany($company);
        }

        return $this;
    }

    /**
     * Accessor for the user's role.
     *
     * This method retrieves the first role assigned to the user in the current company context.
     *
     * @return Role|null the first Role instance associated with the user, or null if no role is found
     */
    public function getRoleAttribute(): ?Role
    {
        $this->loadCompanyUser();
        if (!$this->companyUser) {
            return null;
        }

        return $this->companyUser->roles()->first();
    }

    /**
     * Accessor for the user's roles.
     *
     * This method retrieves all roles assigned to the user in the current company context.
     *
     * @return Collection a collection of Role instances associated with the user, or null if no roles are found
     */
    public function getRolesAttribute(): Collection
    {
        $this->loadCompanyUser();
        if (!$this->companyUser) {
            return collect();
        }

        return $this->companyUser->roles()->get();
    }

    /**
     * Accessor for the user's policies.
     *
     * This method retrieves all policies assigned to the user in the current company context.
     *
     * @return Collection a collection of Policy instances associated with the user, or null if no policies are found
     */
    public function getPoliciesAttribute(): Collection
    {
        $this->loadCompanyUser();
        if (!$this->companyUser) {
            return collect();
        }

        return $this->companyUser->policies()->get();
    }

    /**
     * Accessor for the user's permissions.
     *
     * This method retrieves all permissions assigned to the user in the current company context.
     *
     * @return Collection a collection of Permission instances associated with the user, or null if no permissions are found
     */
    public function getPermissionsAttribute(): Collection
    {
        $this->loadCompanyUser();
        if (!$this->companyUser) {
            return collect();
        }

        return $this->companyUser->permissions()->get();
    }

    /**
     * Accessor for the user's session status.
     *
     * This method retrieves the user's status in the current company context.
     * If no status is found, it defaults to 'pending'.
     *
     * @return string the user's session status, or 'pending' if not set
     */
    public function getSessionStatusAttribute(): string
    {
        $this->loadCompanyUser();

        return $this->companyUser ? $this->companyUser->status : 'pending';
    }

    /**
     * Finds and sets the user's session status.
     *
     * This method retrieves the user's status in the current company context
     * and sets it as an attribute on the user model. If no status is found, it defaults to 'pending'.
     *
     * @return string the user's session status, or 'pending' if not set
     */
    public function findSessionStatus(): string
    {
        $this->loadCompanyUser();
        $status = $this->companyUser ? $this->companyUser->status : 'pending';
        $this->setAttribute('session_status', $status);

        return $status;
    }

    /**
     * Specifies the user's FCM tokens.
     */
    public function routeNotificationForFcm(): array
    {
        $this->loadMissing('devices');

        return $this->devices->where('platform', 'android')->map(
            function ($userDevice) {
                return $userDevice->token;
            }
        )->toArray();
    }

    /**
     * Specifies the user's APNS tokens.
     */
    public function routeNotificationForApn(): array
    {
        $this->loadMissing('devices');

        return $this->devices->where('platform', 'ios')->map(
            function ($userDevice) {
                return $userDevice->token;
            }
        )->toArray();
    }

    /**
     * Get avatar URL attribute.
     */
    public function getAvatarUrlAttribute(): string
    {
        if ($this->avatar instanceof File) {
            return $this->avatar->url;
        }

        return data_get($this, 'avatar.url', 'https://s3.ap-southeast-1.amazonaws.com/flb-assets/static/no-avatar.png');
    }

    /**
     * Get the users's company name.
     */
    public function getCompanyNameAttribute(): ?string
    {
        return data_get($this, 'company.name');
    }

    /**
     * Get the users's company name.
     */
    public function getDriverUuidAttribute(): ?string
    {
        return data_get($this, 'driver.uuid');
    }

    /**
     * Checks if the user is admin.
     */
    public function isAdmin(): bool
    {
        return $this->type === 'admin';
    }

    /**
     * Checks if the user is NOT admin.
     */
    public function isNotAdmin(): bool
    {
        return $this->type !== 'admin';
    }

    /**
     * Checks if the user is NOT admin.
     */
    public function isType(string $type): bool
    {
        return $this->type === $type;
    }

    /**
     * Checks if the user is NOT admin.
     */
    public function isNotType(string $type): bool
    {
        return $this->type !== $type;
    }

    /**
     * Adds a boolean dynamic property to check if user is an admin.
     *
     * @return void
     */
    public function getIsAdminAttribute(): bool
    {
        return $this->isAdmin();
    }

    /**
     * Set the user type.
     */
    public function setType(string $type): self
    {
        static::unguarded(function () use ($type) {
            $this->type = $type;
            $this->save();
        });

        return $this;
    }

    /**
     * Get the user type.
     */
    public function getType(): ?string
    {
        return $this->getAttribute('type');
    }

    /**
     * Set and hash password.
     */
    public function setPasswordAttribute($value): void
    {
        $this->attributes['password'] = Hash::make($value);
    }

    /**
     * Set the default status to `active`.
     */
    public function setStatusAttribute($value = 'active'): void
    {
        $this->attributes['status'] = $value ?? 'active';
    }

    /**
     * Retrieves the user's timezone.
     *
     * This method returns the timezone associated with the user. If no timezone is set,
     * it defaults to 'Asia/Singapore'.
     *
     * @return string the user's timezone, or 'Asia/Singapore' if not set
     */
    public function getTimezone(): string
    {
        return data_get($this, 'timezone', 'Asia/Singapore');
    }

    /**
     * Retrieves the company associated with the user.
     *
     * This method first attempts to load the company relationship. If the relationship
     * is not found, it attempts to locate the company using the user's `company_uuid` attribute.
     *
     * @return Company|null the associated Company instance, or null if no company is found
     */
    public function getCompany(): Company
    {
        // Get company relationship
        $company = $this->load(['company'])->company;

        // Attempt to find company using `uuid`
        if (empty($company) && Str::isUuid($this->getAttribute('company_uuid'))) {
            $company = Company::where('uuid', $this->company_uuid)->first();
        }

        return $company;
    }

    /**
     * Updates the user's last login timestamp.
     *
     * This method sets the user's `last_login` attribute to the current date and time
     * and then saves the model.
     *
     * @return self returns the current User instance
     */
    public function updateLastLogin(): self
    {
        $this->last_login = Carbon::now()->toDateTimeString();
        $this->save();

        return $this;
    }

    /**
     * Changes the user's password.
     *
     * This method updates the user's password to the provided new password and saves the model.
     *
     * @param string $newPassword the new password for the user
     *
     * @return self returns the current User instance
     */
    public function changePassword($newPassword): self
    {
        $this->password = $newPassword;
        $this->save();

        return $this;
    }

    /**
     * Verifies the given password against the user's stored password.
     *
     * This method checks if the provided password matches the user's current password.
     *
     * @param string $password the plain text password to verify
     *
     * @return bool returns true if the password matches, false otherwise
     */
    public function checkPassword(string $password): bool
    {
        return Hash::check($password, $this->password);
    }

    /**
     * Deactivates the user.
     *
     * This method sets the user's status to 'inactive' and saves the model.
     *
     * @return self returns the current User instance
     */
    public function deactivate(): self
    {
        $this->status = 'inactive';
        $this->save();

        $this->loadCompanyUser();
        if ($this->companyUser) {
            $this->companyUser->status = 'inactive';
            $this->companyUser->save();
        }

        return $this;
    }

    /**
     * Activates the user.
     *
     * This method sets the user's status to 'active' and saves the model.
     *
     * @return self returns the current User instance
     */
    public function activate(): self
    {
        $this->status = 'active';
        $this->save();

        $this->loadCompanyUser();
        if ($this->companyUser) {
            $this->companyUser->status = 'active';
            $this->companyUser->save();
        }

        return $this;
    }

    /**
     * Retrieve the verification code for the given type and code.
     *
     * @param string $code  the verification code to verify
     * @param array  $types The types of verification to check (e.g., 'email_verification', 'phone_verification').
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function getVerificationCodeOrFail(string $code, array $types = ['email_verification', 'phone_verification']): VerificationCode
    {
        $verifyCode = VerificationCode::where('subject_uuid', $this->uuid)
            ->whereIn('for', $types)
            ->where('code', $code)
            ->firstOrFail();

        return $verifyCode;
    }

    /**
     * Verify the user's email or phone based on the verification code.
     *
     * @param string|\Fleetbase\Models\VerificationCode $code the verification code or its model instance
     *
     * @throws InvalidVerificationCodeException
     */
    public function verify(VerificationCode|string $code): self
    {
        // Check if $code is a string, and retrieve the verification code model if necessary
        if (is_string($code)) {
            $verifyCode = $this->getVerificationCodeOrFail($code);
        } elseif ($code instanceof VerificationCode) {
            $verifyCode = $code;
        } else {
            throw new InvalidVerificationCodeException('Invalid verification code.');
        }

        // Get the current time
        $verifiedAt = Carbon::now();

        // Verify the user's email or phone based on the type of verification
        if ($verifyCode->for === 'email_verification') {
            $this->email_verified_at = $verifiedAt;
        } elseif ($verifyCode->for === 'phone_verification') {
            $this->phone_verified_at = $verifiedAt;
        } else {
            throw new InvalidVerificationCodeException('Invalid verification type.');
        }

        // Save the user's verification status
        $this->save();

        return $this;
    }

    /**
     * Manually verify the user's email .
     */
    public function manualVerify(): self
    {
        $this->email_verified_at = Carbon::now();
        $this->save();

        return $this;
    }

    /**
     * Get the date and time when the user was verified.
     *
     * @return \Illuminate\Support\Carbon|null the date and time of verification, or null if not verified
     */
    public function getDateVerified(): ?Carbon
    {
        return $this->email_verified_at ?? $this->phone_verified_at;
    }

    /**
     * Determines if the model is searchable.
     *
     * @return bool true if the class uses the Searchable trait or the 'searchable' property exists and is true, false otherwise
     */
    public static function isSearchable(): bool
    {
        return class_uses_recursive(Searchable::class) || (property_exists(new static(), 'searchable') && static::$searchable);
    }

    /**
     * Accessor to check if the model instance is searchable.
     *
     * @return bool true if the model instance is searchable, false otherwise
     */
    public function searchable(): bool
    {
        return static::isSearchable();
    }

    /**
     * Get the phone number to which the notification should be routed.
     *
     * @return string the phone number of the model instance
     */
    public function routeNotificationForTwilio(): string
    {
        return $this->phone;
    }

    /**
     * The channels the user receives notification broadcasts on.
     */
    public function receivesBroadcastNotificationsOn(): string
    {
        return 'user.' . $this->uuid;
    }

    /**
     * Sets the user's type and saves the model.
     *
     * This method assigns the given type to the user and immediately persists the change to the database.
     *
     * @param string $type the type to assign to the user
     *
     * @return self returns the current User instance
     */
    public function setUserType(string $type): self
    {
        $this->type = $type;
        $this->save();

        return $this;
    }

    /**
     * Sends an invitation to the user to join a company.
     *
     * This method checks if a company is provided. If not, it loads the user's associated company.
     * It then verifies that the company is valid and that the user hasn't already been invited.
     * If these checks pass, it creates an invitation and sends a notification to the user.
     *
     * @param Company|null $company The company to send the invitation from. If null, the user's associated company will be used.
     *
     * @return bool returns true if the invitation was sent successfully, or false if the invitation could not be sent
     */
    public function sendInviteFromCompany(?Company $company = null): bool
    {
        if ($company === null) {
            $this->load(['company']);
            $company = $this->company;
        }

        // make sure company is valid
        if (!$company instanceof Company) {
            return false;
        }

        // if no email cant send invite
        if (!$this->email) {
            return false;
        }

        // make sure user isn't already invited
        $isAlreadyInvited = Invite::isAlreadySentToJoinCompany($this, $company);
        if ($isAlreadyInvited) {
            return false;
        }

        // create invitation
        $invitation = Invite::create([
            'company_uuid'    => $company->uuid,
            'created_by_uuid' => $this->uuid,
            'subject_uuid'    => $company->uuid,
            'subject_type'    => Utils::getMutationType($company),
            'protocol'        => 'email',
            'recipients'      => [$this->email],
            'reason'          => 'join_company',
        ]);

        // notify user
        $this->notify(new UserInvited($invitation));

        return true;
    }

    /**
     * Retrieves the user's primary identity.
     *
     * This method returns the user's email if available. If the email is not set,
     * it returns the user's phone number. If neither is set, it returns null.
     *
     * @return string|null the user's email, phone number, or null if neither is available
     */
    public function getIdentity(): string
    {
        $email    = data_get($this, 'email');
        $phone    = data_get($this, 'phone');
        $username = data_get($this, 'username');

        return $email ?? $phone ?? $username;
    }

    /**
     * Checks if the user is verified.
     *
     * This method determines if the user has been verified based on their email or phone verification status.
     * If the user is an admin, they are considered verified by default.
     *
     * @return bool returns true if the user is verified, or false otherwise
     */
    public function isVerified(): bool
    {
        if ($this->type === 'admin') {
            return true;
        }

        return !empty($this->email_verified_at) || !empty($this->phone_verified_at);
    }

    /**
     * Checks if the user is not verified.
     *
     * This method is the inverse of `isVerified()`. It returns true if the user is not verified,
     * and false if the user is verified.
     *
     * @return bool returns true if the user is not verified, or false if the user is verified
     */
    public function isNotVerified(): bool
    {
        return $this->isVerified() === false;
    }

    /**
     * Applies user information from the request to the provided attributes array.
     *
     * This function attempts to gather additional information about the user from their IP address,
     * such as country, timezone, and other relevant metadata. If successful, this information
     * is added to the attributes array. This function utilizes an external service to lookup
     * IP information.
     *
     * @param \Illuminate\Http\Request $request    the request object containing user's IP address and optional timezone
     * @param array                    $attributes an array of user attributes to which the additional information is appended
     *
     * @return array the array of attributes with added user information
     */
    public static function applyUserInfoFromRequest($request, array $attributes = []): array
    {
        $info = null;
        // Lookup user default details
        try {
            $info = \Fleetbase\Support\Http::lookupIp($request);
        } catch (\Exception $e) {
        }

        if ($info) {
            $attributes['country']    = data_get($info, 'country_code');
            $attributes['ip_address'] = data_get($info, 'ip', $request->ip());
            $tzInfo                   = data_get($info, 'time_zone.name', $request->input('timezone'));
            if ($tzInfo) {
                $attributes['timezone'] = $tzInfo;
            }
            $attributes['meta'] = [
                'areacode'   => data_get($info, 'calling_code'),
                'currency'   => data_get($info, 'currency.code'),
                'language'   => data_get($info, 'languages.0'),
                'country'    => data_get($info, 'country_name'),
                'contintent' => data_get($info, 'continent_name'),
                'latitude'   => data_get($info, 'latitude'),
                'longitude'  => data_get($info, 'longitude'),
            ];
        }

        return $attributes;
    }

    /**
     * Create a new User instance with enriched attributes from the request.
     *
     * This static method constructs a new User object using information obtained from
     * a request object. It enhances the initial user attributes with additional details
     * such as country, timezone, and IP-related metadata by leveraging the
     * applyUserInfoFromRequest() method. This method is ideal for initializing a user with
     * comprehensive details at the point of creation, particularly during registration processes.
     *
     * @param \Illuminate\Http\Request $request    the request object containing user's IP address and possibly other details
     * @param array                    $attributes an optional array of initial attributes that may be provided for the user
     *
     * @return User returns the newly created User instance with enriched attributes
     */
    public static function newUserWithRequestInfo($request, $attributes = []): self
    {
        return new User(static::applyUserInfoFromRequest($request, $attributes));
    }

    /**
     * Sets user information from the request on the current User model instance.
     *
     * This method fetches user information based on the request data (IP address, timezone)
     * and updates the current User model instance with this information. If the save parameter
     * is true, it also persists these changes to the database.
     *
     * @param \Illuminate\Http\Request $request the request object to extract user information from
     * @param bool                     $save    Determines whether to persist changes to the database. Defaults to false.
     *
     * @return User the current User model instance with updated information
     */
    public function setUserInfoFromRequest($request, bool $save = false): self
    {
        $userInfoAttributes = static::getUserInfoFromRequest($request);

        foreach ($userInfoAttributes as $key => $value) {
            if ($this->isFillable($key)) {
                $this->setAttribute($key, $value);
            }
        }

        if ($save) {
            $this->save();
        }

        return $this;
    }

    /**
     * Retrieve the last seen timestamp of the user.
     *
     * This method acts as an accessor for the 'lastSeenAt' attribute of the User model.
     * It returns the datetime when the user was last active in the system. This can be
     * used to display the last seen status or to calculate if the user is offline.
     *
     * @return \Carbon\Carbon|null returns the Carbon instance for the last seen timestamp or null if not set
     */
    public function getLastSeenAtAttribute()
    {
        return $this->lastSeenAt();
    }

    /**
     * Check if the user is currently online.
     *
     * This accessor method for the 'isOnline' attribute determines if the user is considered
     * online based on certain criteria like their last activity timestamp. It leverages the
     * isOnline() method, which should contain the logic to ascertain the user's online status.
     *
     * @return bool returns true if the user is online, otherwise false
     */
    public function getIsOnlineAttribute()
    {
        return $this->isOnline();
    }

    /**
     * Assigns a single role to the user for the current company.
     *
     * This method loads the related `companyUser` relationship if it hasn't been loaded already.
     * It then delegates the role assignment to the `assignRole` method on the `CompanyUser` model,
     * which is responsible for managing roles within the context of a specific company.
     *
     * @param string|\Fleetbase\Models\Role $role the role instance or role name to be assigned
     *
     * @return CompanyUser returns the current CompanyUser instance
     *
     * @throws \Exception if the `companyUser` relationship is not available or the role assignment fails
     */
    public function assignSingleRole($role): self
    {
        $this->loadCompanyUser();
        if ($this->companyUser) {
            $this->companyUser->assignSingleRole($role);

            return $this;
        }

        throw new \Exception('Company User relationship not found!');
    }

    /**
     * Retrieves the first Role associated with the user.
     *
     * This method fetches the first Role linked to the user via the roles relationship.
     * If the user has no roles assigned, it returns null.
     *
     * @return Role|null the first Role associated with the user, or null if no roles are found
     */
    public function getRole(): ?Role
    {
        return $this->roles()->first();
    }

    /**
     * Retrieves the name of the first Role associated with the user.
     *
     * This method obtains the first Role linked to the user and returns its name.
     * If the user has no roles assigned, it returns null.
     *
     * @return string|null the name of the first Role associated with the user, or null if no roles are found
     */
    public function getRoleName(): ?string
    {
        $role = $this->getRole();
        if ($role) {
            return $role->name;
        }

        return null;
    }

    public function syncProperty(string $property, Model $model): bool
    {
        $synced = false;

        if ($this->isFillable($property) && !$this->{$property} && $model->{$property}) {
            $this->updateQuietly([$property => $model->{$property}]);
            $synced = true;
        }

        if ($model->isFillable($property) && !$model->{$property} && $this->{$property}) {
            $model->updateQuietly([$property => $this->{$property}]);
            $synced = true;
        }

        return $synced;
    }
    public function driver()
    {
        return $this->hasOne(Driver::class); // Adjust the relationship type and class as per your schema
    }

}
