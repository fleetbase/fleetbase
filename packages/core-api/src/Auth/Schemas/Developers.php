<?php

namespace Fleetbase\Auth\Schemas;

class Developers
{
    /**
     * The permission schema Name.
     */
    public string $name = 'developers';

    /**
     * The permission schema Polict Name.
     */
    public string $policyName = 'Developers';

    /**
     * Guards these permissions should apply to.
     */
    public array $guards = ['sanctum'];

    /**
     * The permission schema resources.
     */
    public array $resources = [
        [
            'name'    => 'api-key',
            'actions' => ['roll', 'export'],
        ],
        [
            'name'    => 'webhook',
            'actions' => ['enable', 'disable'],
        ],
        [
            'name'           => 'socket',
            'actions'        => [],
            'remove_actions' => ['create', 'update', 'delete'],
        ],
        [
            'name'           => 'log',
            'actions'        => ['export'],
            'remove_actions' => ['create', 'update', 'delete'],
        ],
        [
            'name'           => 'event',
            'actions'        => ['export'],
            'remove_actions' => ['create', 'update', 'delete'],
        ],
    ];

    /**
     * Policies provided by this schema.
     */
    public array $policies = [
        [
            'name'        => 'FLBDeveloper',
            'description' => 'Policy for developers to create api credentials, webhooks and view logs.',
            'permissions' => [
                'see extension',
                '* api-key',
                '* webhook',
                '* event',
                '* log',
                '* socket',
            ],
        ],
        [
            'name'        => 'FLBDevProjectManager',
            'description' => 'Policy for view and read access to development resources.',
            'permissions' => [
                'see extension',
                'see api-key',
                'list api-key',
                'view api-key',
                'see webhook',
                'list webhook',
                'view webhook',
                'see event',
                'list event',
                'view event',
                'see log',
                'list log',
                'view log',
            ],
        ],
    ];

    /**
     * Roles provided by this schema.
     */
    public array $roles = [
        [
            'name'        => 'Fleetbase Developer',
            'description' => 'Role for developers to create api credentials, webhooks and view real time events and logs.',
            'policies'    => [
                'FLBDeveloper',
            ],
        ],
    ];
}
