<?php

namespace Fleetbase\Auth\Schemas;

class IAM
{
    /**
     * The permission schema Name.
     */
    public string $name = 'iam';

    /**
     * The permission schema Polict Name.
     */
    public string $policyName = 'IAM';

    /**
     * Guards these permissions should apply to.
     */
    public array $guards = ['sanctum'];

    /**
     * Direct permissions for the schema.
     */
    public array $permissions = ['change-password'];

    /**
     * The permission schema resources.
     */
    public array $resources = [
        [
            'name'    => 'group',
            'actions' => ['export'],
        ],
        [
            'name'    => 'user',
            'actions' => ['deactivate', 'activate', 'verify', 'export', 'change-password-for'],
        ],
        [
            'name'    => 'role',
            'actions' => ['export'],
        ],
        [
            'name'    => 'policy',
            'actions' => ['export'],
        ],
    ];

    /**
     * Policies provided by this schema.
     */
    public array $policies = [
        [
            'name'        => 'UserManager',
            'description' => 'Policy for managing users, roles and groups.',
            'permissions' => [
                'see extension',
                '* user',
                '* role',
                '* group',
            ],
        ],
        [
            'name'        => 'PolicyManager',
            'description' => 'Policy for managing policies and roles.',
            'permissions' => [
                'see extension',
                '* policy',
                '* role',
            ],
        ],
    ];

    /**
     * Roles provided by this schema.
     */
    public array $roles = [
        [
            'name'        => 'IAM User Manager',
            'description' => 'Role for managing users, roles, and groups.',
            'policies'    => [
                'UserManager',
            ],
        ],
        [
            'name'        => 'IAM Policy Manager',
            'description' => 'Role for managing users, roles, and groups.',
            'policies'    => [
                'PolicyManager',
            ],
        ],
        [
            'name'        => 'IAM Administrator',
            'description' => 'Role for managing all users, roles, groups and policies.',
            'permissions' => [
                'see extension',
                '* user',
                '* group',
                '* role',
                '* policy',
            ],
        ],
    ];
}
