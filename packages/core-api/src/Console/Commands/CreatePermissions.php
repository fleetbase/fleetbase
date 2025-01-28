<?php

namespace Fleetbase\Console\Commands;

use Fleetbase\Models\Directive;
use Fleetbase\Models\Permission;
use Fleetbase\Models\Policy;
use Fleetbase\Models\Role;
use Fleetbase\Support\Utils;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Spatie\Permission\Exceptions\GuardDoesNotMatch;
use Spatie\Permission\Exceptions\PermissionDoesNotExist;

class CreatePermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetbase:create-permissions {--reset}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create or reset all permissions, policies and roles';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $reset = $this->option('reset');

        if ($reset) {
            Schema::withoutForeignKeyConstraints(function () {
                Permission::truncate();
                Policy::truncate();
                DB::table('model_has_permissions')->truncate();
                DB::table('model_has_roles')->truncate();
                DB::table('model_has_policies')->truncate();
            });
        }

        // Always truncate directives
        Schema::withoutForeignKeyConstraints(function () {
            Directive::truncate();
        });

        $actions = ['create', 'update', 'delete', 'view', 'list', 'see'];
        $schemas = Utils::getAuthSchemas();

        foreach ($schemas as $schema) {
            $service     = $schema->name;
            $resources   = $schema->resources ?? [];
            $permissions = $schema->permissions ?? [];
            $policies    = $schema->policies ?? [];
            $roles       = $schema->roles ?? [];
            $guard       = 'sanctum';

            // Add visibility permission for service
            $visibilityPermission = Permission::updateOrCreate(
                [
                    'name'             => $service . ' see extension',
                    'guard_name'       => $guard,
                ],
                [
                    'name'       => $service . ' see extension',
                    'guard_name' => $guard,
                    'service'    => $service,
                ]
            );

            // Output message for permissions creation
            $this->info('Created permission: ' . $visibilityPermission->name);

            // First create a wilcard permission for the entire schema
            $administratorPolicy = Policy::updateOrCreate(
                [
                    'name'        => 'AdministratorAccess',
                    'guard_name'  => $guard,
                ],
                [
                    'name'        => 'AdministratorAccess',
                    'guard_name'  => $guard,
                    'description' => 'Policy for full access to Fleetbase extensions and resources.',
                    'service'     => $service,
                ]
            );

            // Give visibility to service
            $administratorPolicy->givePermissionTo($visibilityPermission);

            // Create wildcard permission for service
            $permission = Permission::updateOrCreate(
                [
                    'name'       => $service . ' *',
                    'guard_name' => $guard,
                ],
                [
                    'name'       => $service . ' *',
                    'guard_name' => $guard,
                    'service'    => $service,
                ]
            );

            // Add wildcard permissions to administrator access policy
            try {
                $administratorPolicy->givePermissionTo($permission);
            } catch (GuardDoesNotMatch $e) {
                return $this->error($e->getMessage());
            }

            // Output message for permissions creation
            $this->info('Created permission: ' . $permission->name);

            // Check if schema has direct permissions to add
            if (is_array($permissions)) {
                foreach ($permissions as $action) {
                    $permission = Permission::updateOrCreate(
                        [
                            'name'       => $service . ' ' . $action,
                            'guard_name' => $guard,
                        ],
                        [
                            'name'       => $service . ' ' . $action,
                            'guard_name' => $guard,
                            'service'    => $service,
                        ]
                    );

                    // Add wildcard permissions to administrator access policy
                    try {
                        $administratorPolicy->givePermissionTo($permission);
                    } catch (GuardDoesNotMatch $e) {
                        return $this->error($e->getMessage());
                    }

                    // output message for permissions creation
                    $this->info('Created permission: ' . $permission->name);
                }
            }

            // Create a resource policy for full access
            $fullAccessPolicy = Policy::updateOrCreate(
                [
                    'name'       => Str::studly(data_get($schema, 'policyName')) . 'FullAccess',
                    'guard_name' => $guard,
                ],
                [
                    'name'        => Str::studly(data_get($schema, 'policyName')) . 'FullAccess',
                    'description' => 'Policy for full access to ' . Str::studly(data_get($schema, 'policyName')) . '.',
                    'guard_name'  => $guard,
                    'service'     => $service,
                ]
            );

            // Give visibility to service
            $fullAccessPolicy->givePermissionTo($visibilityPermission);

            // Create a resource policy for read-only access
            $readOnlyPolicy = Policy::updateOrCreate(
                [
                    'name'       => Str::studly(data_get($schema, 'policyName')) . 'ReadOnly',
                    'guard_name' => $guard,
                ],
                [
                    'name'        => Str::studly(data_get($schema, 'policyName')) . 'ReadOnly',
                    'description' => 'Policy for read-only access to ' . Str::studly(data_get($schema, 'policyName')) . '.',
                    'guard_name'  => $guard,
                    'service'     => $service,
                ]
            );

            // Give visibility to service
            $readOnlyPolicy->givePermissionTo($visibilityPermission);

            // Create wilcard permission for service and all resources
            foreach ($resources as $resource) {
                $permission = Permission::updateOrCreate(
                    [
                        'name'       => $service . ' * ' . data_get($resource, 'name'),
                        'guard_name' => $guard,
                    ],
                    [
                        'name'       => $service . ' * ' . data_get($resource, 'name'),
                        'guard_name' => $guard,
                        'service'    => $service,
                    ]
                );

                // Add wildcard permissions to full access policy
                try {
                    $fullAccessPolicy->givePermissionTo($permission);
                } catch (GuardDoesNotMatch $e) {
                    return $this->error($e->getMessage());
                }

                // Output message for permissions creation
                $this->info('Created permission: ' . $permission->name);

                // Create action permissions
                $resourceActions = array_merge($actions, data_get($resource, 'actions', []));

                // if some actions should be excluded
                if (is_array(data_get($resource, 'remove_actions', null))) {
                    foreach (data_get($resource, 'remove_actions') as $remove) {
                        if (($key = array_search($remove, $actions)) !== false) {
                            unset($resourceActions[$key]);
                        }
                    }
                }

                // Create action permissions
                foreach ($resourceActions as $action) {
                    $permission = Permission::updateOrCreate(
                        [
                            'name'       => $service . ' ' . $action . ' ' . data_get($resource, 'name'),
                            'guard_name' => $guard,
                        ],
                        [
                            'name'       => $service . ' ' . $action . ' ' . data_get($resource, 'name'),
                            'guard_name' => $guard,
                            'service'    => $service,
                        ]
                    );

                    // Add the permission to the read only policy
                    if ($action === 'view' || $action === 'list') {
                        try {
                            $readOnlyPolicy->givePermissionTo($permission);
                        } catch (GuardDoesNotMatch $e) {
                            return $this->error($e->getMessage());
                        }
                    }

                    // Add resource specific action permission to administrator policy
                    try {
                        $administratorPolicy->givePermissionTo($permission);
                    } catch (GuardDoesNotMatch $e) {
                        return $this->error($e->getMessage());
                    }

                    // Output message for permissions creation
                    $this->info('Created permission: ' . $permission->name);
                }
            }

            // Create administrator role
            $adminitratorRole = Role::updateOrCreate(
                [
                    'name'       => 'Administrator',
                    'guard_name' => $guard,
                ],
                [
                    'name'        => 'Administrator',
                    'guard_name'  => $guard,
                    'description' => 'Role for full administrator access to an organization',
                ]
            );

            // Assign administrator policy to admin role
            $adminitratorRole->assignPolicy($administratorPolicy);

            // Create policies if schema has provided
            foreach ($policies as $policyScheme) {
                $policy = Policy::updateOrCreate(
                    [
                        'name'        => data_get($policyScheme, 'name'),
                        'guard_name'  => $guard,
                    ],
                    [
                        'name'        => data_get($policyScheme, 'name'),
                        'guard_name'  => $guard,
                        'description' => data_get($policyScheme, 'description'),
                        'service'     => $service,
                    ]
                );

                $policyPermissions = data_get($policyScheme, 'permissions', []);
                $policyDirectives  = data_get($policyScheme, 'directives', []);

                $this->assignPermissions($policy, $service, $guard, $policyPermissions);
                $this->createDirectives($policy, $service, $guard, $policyDirectives);
                $this->info('New Policy for service ' . $service . ' created as ' . $policy->name);
            }

            // Create roles if schema has provided
            foreach ($roles as $roleSchema) {
                $role = Role::updateOrCreate(
                    [
                        'name'        => data_get($roleSchema, 'name'),
                        'guard_name'  => $guard,
                    ],
                    [
                        'name'        => data_get($roleSchema, 'name'),
                        'guard_name'  => $guard,
                        'description' => data_get($roleSchema, 'description'),
                        'service'     => $service,
                    ]
                );

                $rolePolicies    = data_get($roleSchema, 'policies', []);
                $rolePermissions = data_get($roleSchema, 'permissions', []);
                $roleDirectives  = data_get($roleSchema, 'directives', []);

                $this->assignPolicies($role, $guard, $rolePolicies);
                $this->assignPermissions($role, $service, $guard, $rolePermissions);
                $this->createDirectives($role, $service, $guard, $roleDirectives);

                // Inform
                $this->info('New Role for service ' . $service . ' created as ' . $role->name);
            }
        }
    }

    /**
     * Creates and assigns directives to a given subject based on the provided service, guard, and directives array.
     *
     * This method iterates over the provided directives array, validates the permission names, looks up the corresponding
     * permissions, and then creates or updates directives in the database. It handles shorthand permission names by
     * prefixing them with the service name if necessary. If a directive's permission name does not conform to the expected
     * format, or if the permission cannot be found, the method logs an error and continues processing the remaining directives.
     *
     * @param Model  $subject    The subject (e.g., role, policy) to which the directives belong.
     * @param string $service    the service name used as a prefix for shorthand permission names
     * @param string $guard      the guard name associated with the permissions
     * @param array  $directives an associative array where the key is the permission name and the value is an array of rules
     *
     * @return Collection a collection of created or updated Directive instances
     */
    public function createDirectives(Model $subject, string $service, string $guard, array $directives = []): Collection
    {
        $directiveRecords = collect();
        if (empty($directives)) {
            return $directiveRecords;
        }

        foreach ($directives as $permission => $rules) {
            $permissionSegmentCount = count(explode(' ', $permission));
            if ($permissionSegmentCount === 3) {
                $permissionName = $permission;
            } else {
                // role permission names can be shorthanded by excluding the service since the schema provides the service name
                $permissionName = Str::startsWith($permission, $service) ? $permission : $service . ' ' . $permission;
            }

            // next we validate the permission name
            $permissionNameSegmentsCount = count(explode(' ', $permissionName));
            if ($permissionNameSegmentsCount !== 3) {
                $this->error('Invalid directive provided by ' . Str::singular($subject->getTable()) . ' (' . $subject->name . ') in Schema for ' . $service . '; found ' . $permissionName . ' which has ' . $permissionNameSegmentsCount . ' but should be 3 segments.');
                continue;
            }

            // lookup permission record
            try {
                $permissionRecord = Permission::findByName($permissionName, $guard);
            } catch (PermissionDoesNotExist|\Exception $e) {
                $this->error($e->getMessage());
                continue;
            }

            // Create the directive
            $directive = Directive::create(
                [
                    'permission_uuid' => $permissionRecord->id,
                    'subject_type'    => Utils::getMutationType($subject),
                    'subject_uuid'    => $subject->{$subject->getKeyName()},
                    'key'             => Directive::createKey($rules),
                    'rules'           => $rules,
                ]
            );

            // Inform
            $this->info('Created directive for ' . Str::singular($subject->getTable()) . ' (' . $subject->name . ') as ' . $directive->key);

            // Add the directive
            $directiveRecords->push($directive);
        }

        return $directiveRecords;
    }

    /**
     * Assigns permissions to a given subject based on the provided service, guard, and permissions array.
     *
     * This method processes each permission in the provided array, validates its name, and looks up the corresponding
     * permission record. It handles shorthand permission names by prefixing them with the service name if necessary.
     * If a permission name does not conform to the expected format, or if the permission cannot be found, the method
     * logs an error and continues processing the remaining permissions. Valid permissions are then assigned to the subject.
     *
     * @param Model  $subject     The subject (e.g., role, policy) to which the permissions will be assigned.
     * @param string $service     the service name used as a prefix for shorthand permission names
     * @param string $guard       the guard name associated with the permissions
     * @param array  $permissions an array of permission names to be assigned to the subject
     *
     * @return Model the subject with the assigned permissions
     */
    public function assignPermissions(Model $subject, string $service, string $guard, array $permissions = []): Model
    {
        foreach ($permissions as $permissionName) {
            $permissionSegmentCount = count(explode(' ', $permissionName));
            if ($permissionSegmentCount === 3) {
                $permissionName = $permissionName;
            } else {
                // role permission names can be shorthanded by excluding the service since the schema provides the service name
                $permissionName = Str::startsWith($permissionName, $service) ? $permissionName : $service . ' ' . $permissionName;
            }

            // next we validate the permission name
            $permissionNameSegmentsCount = count(explode(' ', $permissionName));
            if ($permissionNameSegmentsCount !== 3) {
                $this->error('Invalid permission provided by ' . Str::singular($subject->getTable()) . ' (' . $subject->name . ') in Schema for ' . $service . '; found ' . $permissionName . ' which has ' . $permissionNameSegmentsCount . ' but should be 3 segments.');
                continue;
            }
            // lookup the permission record by name
            try {
                $permissionRecord = Permission::findByName($permissionName, $guard);
            } catch (PermissionDoesNotExist|\Exception $e) {
                $this->error($e->getMessage());
                continue;
            }

            // apply the permission to the policy
            $subject->givePermissionTo($permissionRecord);
        }

        return $subject;
    }

    /**
     * Assigns policies to a given subject based on the provided guard and policies array.
     *
     * This method processes each policy in the provided array, looks up the corresponding policy record,
     * and assigns it to the subject. If the policy cannot be found, the method logs an error and continues
     * processing the remaining policies. Valid policies are then assigned to the subject.
     *
     * @param Model  $subject  The subject (e.g., role, policy) to which the policies will be assigned.
     * @param string $guard    the guard name associated with the policies
     * @param array  $policies an array of policy names to be assigned to the subject
     *
     * @return Model the subject with the assigned policies
     */
    public function assignPolicies(Model $subject, string $guard, array $policies = []): Model
    {
        foreach ($policies as $policyName) {
            // lookup the policy record by name
            try {
                $policyRecord = Policy::findByName($policyName, $guard);
            } catch (\Exception $e) {
                $this->error($e->getMessage());
                continue;
            }
            // apply the policy to the role
            $subject->assignPolicy($policyRecord);
        }

        return $subject;
    }
}
