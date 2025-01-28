<?php

namespace Fleetbase\Support;

use Fleetbase\Attributes\SkipAuthorizationCheck;
use Fleetbase\Models\ApiCredential;
use Fleetbase\Models\Company;
use Fleetbase\Models\CompanyUser;
use Fleetbase\Models\Directive;
use Fleetbase\Models\Permission;
use Fleetbase\Models\Policy;
use Fleetbase\Models\Role;
use Fleetbase\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth as Authentication;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class Auth extends Authentication
{
    /**
     * Create company and user.
     *
     * @param array $owner   The owner to be created
     * @param array $company The company to be created
     *
     * @return \Fleetbase\Models\User;
     */
    public static function register($owner, $company)
    {
        // email is always lowercase
        if (isset($owner['email'])) {
            $owner['email'] = strtolower($owner['email']);
        }

        if (isset($company['email'])) {
            $company['email'] = strtolower($company['email']);
        }

        $owner   = User::create($owner);
        $company = Company::create($company)
            ->setOwner($owner)
            ->saveInstance();

        $owner->assignCompany($company);

        return $owner;
    }

    /**
     * Set session variables for user.
     *
     * @param User|ApiCredential|null $user
     */
    public static function setSession($user = null, $login = false): bool
    {
        if ($user === null) {
            return false;
        }

        if ($user instanceof ApiCredential) {
            $apiCredential = $user;
            session(['company' => $apiCredential->company_uuid, 'user' => $apiCredential->user_uuid]);
            // user couldn't be loaded, fallback with api credential if applicable
            $user = User::find($apiCredential->user_uuid);

            // Set is admin if user of api credential is admin
            if ($user) {
                session(['is_admin' => $user->isAdmin()]);
            }

            // track last usage of api credential
            $apiCredential->trackLastUsed();

            return true;
        }

        session(['company' => $user->company_uuid, 'user' => $user->uuid, 'is_admin' => $user->isAdmin(), 'is_customer' => $user->isType('customer'), 'is_driver' => $user->isType('driver')]);
        if ($login) {
            Authentication::login($user);
        }

        return true;
    }

    /**
     * Set session variables for api credentials being used.
     *
     * @return bool
     */
    public static function setApiKey(ApiCredential|PersonalAccessToken $apiCredential)
    {
        // If sanctum token indicate in session
        if ($apiCredential instanceof PersonalAccessToken) {
            session([
                'is_sanctum_token' => true,
                'api_credential'   => $apiCredential->id,
                'api_key'          => $apiCredential->token,
                'api_key_version'  => (string) $apiCredential->created_at,
                'api_secret'       => $apiCredential->token,
                'api_environment'  => 'live',
                'api_test_mode'    => false,
            ]);

            return true;
        }

        session([
            'api_credential'  => $apiCredential->uuid,
            'api_key'         => $apiCredential->key,
            'api_key_version' => (string) $apiCredential->created_at,
            'api_secret'      => $apiCredential->secret,
            'api_environment' => $apiCredential->test_mode ? 'test' : 'live',
            'api_test_mode'   => $apiCredential->test_mode,
        ]);

        return true;
    }

    /**
     * Get the current api key.
     */
    public static function getApiKey(): ?ApiCredential
    {
        if (!session('api_credential')) {
            return null;
        }

        return ApiCredential::where('uuid', session('api_credential'))->first();
    }

    /**
     * Checks the request header for sandbox headers if to set and switch to the sandbox database,
     * or uses the `ApiCredential` provided to set sandbox session.
     *
     * @param Request       $request
     * @param ApiCredential $apiCredential
     *
     * @return bool
     */
    public static function setSandboxSession($request, $apiCredential = null)
    {
        $isSandbox       = $request->header('Access-Console-Sandbox') ?? Utils::get($apiCredential, 'test_mode', false);
        $apiCredentialId = $request->header('Access-Console-Sandbox-Key') ?? Utils::get($apiCredential, 'uuid', false);
        $sandboxSession  = [];

        // if is sandbox environment switch to the sandbox database
        if ($isSandbox) {
            config(['database.default' => 'sandbox']);
            $sandboxSession['is_sandbox'] = (bool) $isSandbox;

            if ($apiCredentialId) {
                $sandboxSession['sandbox_api_credential'] = $apiCredentialId;
            }
        }

        session($sandboxSession);

        return true;
    }

    /**
     * Retrieves a company entity based on session or request parameters.
     *
     * This method first attempts to fetch the company information from the session. If it is not available,
     * it looks for the company identifier either as 'company' or 'company_uuid' in the request parameters.
     * The function supports dynamic selection of fields specified by the $select parameter, which can be
     * a string or an array of field names.
     *
     * @param string|array $select the fields to select from the company model, defaults to all (*)
     *
     * @return Company|null returns the Company object if found, or null if no company is identified
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException throws exception if no model is found
     */
    public static function getCompany(string|array $select = '*'): ?Company
    {
        $company = null;

        if (session()->has('company')) {
            $company = Company::select($select)->where('uuid', session('company'))->first();
        }

        if (!$company) {
            $companyId = request()->or(['company', 'company_uuid']);
            if ($companyId) {
                $company = Company::select($select)->where(function ($query) use ($companyId) {
                    $query->where('uuid', $companyId);
                    $query->orWhere('public_id', $companyId);
                })->first();
            }
        }

        return $company;
    }

    /**
     * Fetches a company entity based on the provided HTTP request.
     *
     * This method looks for a company identifier in the request using 'company' or 'company_uuid' keys.
     * It then retrieves a company from the database where the company's UUID or public ID matches the given identifier.
     * The method assumes the request object has a method `or` that fetches the values for specified keys.
     *
     * @param Request $request the HTTP request object containing potential company identifiers
     *
     * @return Company returns the Company object if found based on the identifiers
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException throws exception if no model is found
     */
    public static function getCompanyFromRequest(Request $request): Company
    {
        $company   = null;
        $companyId = $request->or(['company', 'company_uuid']);
        if ($companyId) {
            $company = Company::where(function ($query) use ($companyId) {
                $query->where('uuid', $companyId);
                $query->orWhere('public_id', $companyId);
            })->first();
        }

        return $company;
    }

    /**
     * Retrieve the currently authenticated user by checking multiple sources.
     *
     * This method extends the base Laravel Auth functionality to ensure robust user retrieval.
     * It attempts to fetch the user in the following order:
     * 1. Directly from the extended Auth class's user retrieval method.
     * 2. From the session, if the user's UUID is stored there.
     * 3. Returns null if no user can be authenticated through previous methods.
     *
     * @return User|null returns an instance of the User model if authenticated, or null if no user is authenticated
     */
    public static function getUserFromSession(?Request $request = null): ?User
    {
        // If request passed try to resolve directly from the request
        if ($request) {
            $user = $request->user();
            if ($user instanceof User) {
                return $user;
            }
        }

        // Attempt to retrieve the user using the extended Auth class method
        $user = auth()->user();
        if ($user instanceof User) {
            return $user;
        }

        // Check if the UUID is stored in the session and fetch the user from the database
        if (session()->has('user')) {
            return User::where('uuid', session('user'))->first();
        }

        // Return null if no user could be authenticated
        return null;
    }

    /**
     * Verifies a password against a hash.
     */
    public static function checkPassword(string $password, string $hashedPassword): bool
    {
        return Hash::check($password, $hashedPassword);
    }

    /**
     * Checks if password is invalid.
     */
    public static function isInvalidPassword(string $password, string $hashedPassword): bool
    {
        return !static::checkPassword($password, $hashedPassword);
    }

    /**
     * Retrieves the associated company session for the given user.
     *
     * This method attempts to fetch a company based on the UUID stored in the user's company_uuid property.
     * If no company is found or the UUID is invalid, it falls back to the user's first associated company.
     *
     * @param User $user the user for whom to retrieve the company session
     *
     * @return Company|null the Company object if found, or null if not
     */
    public static function getCompanySessionForUser(User $user): ?Company
    {
        if (Str::isUuid($user->company_uuid)) {
            $company = Company::where('uuid', $user->company_uuid)->first();
            if ($company) {
                return $company;
            }
        }

        // fallback to get user's first company
        $userCompany = CompanyUser::where('user_uuid', $user->uuid)->first();
        if ($userCompany) {
            $company = Company::where('uuid', $userCompany->company_uuid)->first();
            if ($company) {
                return $company;
            }
        }

        return null;
    }

    /**
     * Resolves the required permissions from the given request.
     *
     * This method resolves the controller, action, and resource from the request,
     * and then constructs the permission names based on the service, action, and
     * resource. It then uses the Permission model to find the permissions that
     * match the constructed names.
     *
     * @param Request $request The HTTP request
     *
     * @return Collection A collection of permission models
     */
    public static function resolvePermissionsFromRequest(Request $request): Collection
    {
        // If method has skip authorization check
        if (ControllerResolver::methodHasAttribute($request, SkipAuthorizationCheck::class)) {
            return collect();
        }

        $controller       = $request->getController();
        if (!method_exists($controller, 'getResourceSingularName')) {
            return collect();
        }

        $service    = $controller->getService();
        $resource   = str_replace('_', '-', $controller->getResourceSingularName());
        $action     = ActionMapper::resolve($request, $resource);

        // If the resource is not guarded at all
        if (!static::isResourceGuarded($resource)) {
            return collect();
        }

        $permissionName                = implode(' ', [$service, $action, $resource]);
        $permissionWildcardName        = implode(' ', [$service, '*', $resource]);
        $permissionWildcardServiceName = implode(' ', [$service, '*']);

        return Permission::findByNames([$permissionName, $permissionWildcardName, $permissionWildcardServiceName]);
    }

    /**
     * Retrieves a collection of directives associated with the permissions extracted from the given request.
     *
     * This method first resolves the user from the session and then extracts the permissions from the request.
     * It then queries the `Directive` model to retrieve all directives that correspond to those permissions,
     * loading the related `subject` (either a `Policy` or `Role`). After retrieving the directives, it filters
     * them based on whether the user has the associated policy or role assigned. The resulting collection
     * contains only the directives applicable to the current user.
     *
     * @param Request $request the HTTP request instance from which to resolve permissions
     *
     * @return Collection a collection of `Directive` models that are associated with the resolved permissions and applicable to the current user
     */
    public static function getDirectivesFromRequest(Request $request): Collection
    {
        $user        = static::getUserFromSession();
        $permissions = static::resolvePermissionsFromRequest($request);
        $directives  = Directive::whereIn('permission_uuid', $permissions->pluck('id'))
            ->with(['subject'])
            ->get()
            ->filter(
                function ($directive) use ($user) {
                    if ($directive->subject instanceof Policy) {
                        return $user->hasPolicyAssigned($directive->subject);
                    }

                    if ($directive->subject instanceof Role) {
                        return $user->hasRole($directive->subject);
                    }

                    return false;
                }
            );

        return $directives;
    }

    /**
     * Retrieves a collection of directives associated with the specified permissions.
     *
     * This method resolves the user from the session and looks up the specified permissions by name.
     * It then queries the `Directive` model to retrieve all directives that correspond to those permissions,
     * loading the related `subject` (either a `Policy` or `Role`). After retrieving the directives, it filters
     * them based on whether the user has the associated policy or role assigned. The resulting collection
     * contains only the directives that are applicable to the current user.
     *
     * @param array $names an array of permission names to look up and retrieve directives for
     *
     * @return Collection a collection of `Directive` models that are associated with the specified permissions and applicable to the current user
     */
    public static function getDirectivesForPermissions(array $names = []): Collection
    {
        $user        = static::getUserFromSession();
        $permissions = Permission::findByNames($names);
        $directives  = Directive::whereIn('permission_uuid', $permissions->pluck('id'))
            ->with(['subject'])
            ->get()
            ->filter(
                function ($directive) use ($user) {
                    if ($directive->subject instanceof Policy) {
                        return $user->hasPolicyAssigned($directive->subject);
                    }

                    if ($directive->subject instanceof Role) {
                        return $user->hasRole($directive->subject);
                    }

                    return false;
                }
            );

        return $directives;
    }

    /**
     * Applies directives to a query builder instance based on the permissions extracted from the request.
     *
     * This method retrieves directives associated with the current request and applies each directive
     * to the given query builder instance. If a request is not explicitly provided, the current request
     * is used by default. The method is typically used to enforce permissions and constraints dynamically
     * on a query based on the user's context or permissions.
     *
     * @param \Illuminate\Database\Eloquent\Builder $builder the query builder instance to which the directives will be applied
     * @param \Illuminate\Http\Request|null         $request An optional HTTP request instance. If not provided, the current request is used.
     *
     * @return \Illuminate\Database\Eloquent\Builder the query builder with the applied directives
     */
    public static function applyDirectivesToQuery($builder, ?Request $request = null)
    {
        $request    = $request instanceof Request ? $request : request();
        $directives = static::getDirectivesFromRequest($request);
        foreach ($directives as $directive) {
            $directive->apply($builder);
        }

        return $builder;
    }

    /**
     * Generates the required permission name based on the provided request.
     *
     * This method extracts the controller from the request, converts the associated resource name
     * to a singular, kebab-case format, and then determines the appropriate action using the
     * ActionMapper. The resulting permission name is constructed by combining the action and resource.
     *
     * @param Request $request the HTTP request object containing route and controller information
     *
     * @return string the generated permission name in the format '{action} {resource}'
     */
    public static function getRequiredPermissionNameFromRequest(Request $request): string
    {
        $controller = $request->getController();
        $resource   = str_replace('_', '-', $controller->getResourceSingularName());
        $action     = ActionMapper::resolve($request, $resource);

        return implode(' ', [$action, $resource]);
    }

    /**
     * Checks if a resource is guarded by any permissions.
     *
     * This method searches for any permissions in the database that end with the given resource name.
     * The resource is expected to be at the end of the permission name following the format
     * '{service} {ability} {resource}'. If a matching permission exists, the method returns true.
     *
     * @param string $resource the resource name to check for in the permissions
     *
     * @return bool true if the resource is guarded by any permissions, false otherwise
     */
    public static function isResourceGuarded(string $resource): bool
    {
        return Permission::where('name', 'like', '% ' . $resource)->exists();
    }

    /**
     * Determines if the current user has the specified permission.
     *
     * This method checks whether the current user session has the required permission by evaluating
     * the exact permission name, a wildcard action for the specified resource, or a wildcard service
     * permission. The method returns true if the user has any of the evaluated permissions.
     *
     * @param string $permission the permission string in the format '{service} {action} {resource}'
     *
     * @return bool true if the user has the specified permission, false otherwise
     */
    public static function can(string $permission): bool
    {
        [$service, $action, $resource] = explode(' ', $permission);
        $permissionName                = implode(' ', [$service, $action, $resource]);
        $permissionWildcardName        = implode(' ', [$service, '*', $resource]);
        $permissionWildcardServiceName = implode(' ', [$service, '*']);
        $permissionRecords             = Permission::findByNames([$permissionName, $permissionWildcardName, $permissionWildcardServiceName]);
        $user                          = static::getUserFromSession();

        return $permissionRecords->contains(function ($permissionRecord) use ($user) {
            return $user->hasPermissionTo($permissionRecord);
        });
    }

    /**
     * Determines if the current user lacks the specified permission.
     *
     * This method is a negation of the `can` method. It returns true if the user does not have the
     * specified permission and false if the user does have it.
     *
     * @param string $permission the permission string in the format '{service} {action} {resource}'
     *
     * @return bool true if the user does not have the specified permission, false otherwise
     */
    public static function cannot(string $permission): bool
    {
        return !static::can($permission);
    }
}
