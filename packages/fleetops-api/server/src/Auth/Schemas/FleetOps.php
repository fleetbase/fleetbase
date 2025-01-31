<?php

namespace Fleetbase\FleetOps\Auth\Schemas;

use Fleetbase\FleetOps\Auth\Directives\CustomerContacts;
use Fleetbase\FleetOps\Auth\Directives\CustomerListPlaces;
use Fleetbase\FleetOps\Auth\Directives\CustomerOrders;
use Fleetbase\FleetOps\Auth\Directives\CustomerPlaces;
use Fleetbase\FleetOps\Auth\Directives\CustomerUser;

class FleetOps
{
    /**
     * The permission schema Name.
     */
    public string $name = 'fleet-ops';

    /**
     * The permission schema Polict Name.
     */
    public string $policyName = 'Fleet-Ops';

    /**
     * Guards these permissions should apply to.
     */
    public array $guards = ['sanctum'];

    /**
     * The permission schema resources.
     */
    public array $resources = [
        [
            'name'    => 'order',
            'actions' => ['schedule', 'dispatch', 'cancel', 'optimize', 'export', 'import', 'assign-driver-for', 'assign-vehicle-for', 'update-route-for'],
        ],
        [
            'name'    => 'order-config',
            'actions' => ['clone'],
        ],
        [
            'name'    => 'route',
            'actions' => ['optimize'],
        ],
        [
            'name'    => 'service-rate',
            'actions' => ['import'],
        ],
        [
            'name'    => 'zone',
            'actions' => [],
        ],
        [
            'name'    => 'service-area',
            'actions' => [],
        ],
        [
            'name'    => 'driver',
            'actions' => ['notify', 'assign-vehicle-for', 'assign-order-for', 'dispatch-order-for', 'export', 'import', 'update-user-for'],
        ],
        [
            'name'    => 'vehicle',
            'actions' => ['assign-driver-for', 'export', 'import'],
        ],
        [
            'name'    => 'fleet',
            'actions' => ['assign-driver-for', 'assign-vehicle-for', 'remove-driver-for', 'remove-vehicle-for', 'export', 'import'],
        ],
        [
            'name'    => 'vendor',
            'actions' => ['subcontract', 'create-order-for', 'export', 'import'],
        ],
        [
            'name'    => 'contact',
            'actions' => ['subcontract', 'create-order-for', 'export', 'import'],
        ],
        [
            'name'    => 'customer',
            'actions' => ['reset-credentials-for'],
        ],
        [
            'name'    => 'facilitator',
            'actions' => [],
        ],
        [
            'name'    => 'entity',
            'actions' => [],
        ],
        [
            'name'    => 'activity',
            'actions' => [],
        ],
        [
            'name'    => 'scheduler',
            'actions' => [],
        ],
        [
            'name'    => 'place',
            'actions' => ['export', 'import'],
        ],
        [
            'name'    => 'fuel-report',
            'actions' => ['export', 'import'],
        ],
        [
            'name'    => 'issue',
            'actions' => ['export', 'import'],
        ],
        [
            'name'           => 'navigator-settings', // the navigator mobile app used by drivers
            'action'         => [],
            'remove_actions' => ['delete', 'export', 'list', 'create'],
        ],
        [
            'name'           => 'payments',
            'action'         => ['onboard'],
            'remove_actions' => ['delete', 'export', 'list', 'create'],
        ],
    ];

    /**
     * Policies provided by this schema.
     */
    public array $policies = [
        [
            'name'        => 'DispatchManager',
            'description' => 'Policy for dispatching and managing orders.',
            'permissions' => [
                'see extension',
                '* order',
                '* route',
                'see order-config',
                'list order-config',
                'view order-config',
                'see driver',
                'list driver',
                'view driver',
                'assign-vehicle-for driver',
                'assign-order-for driver',
                'dispatch-order-for driver',
                'see vehicle',
                'list vehicle',
                'view vehicle',
                'assign-driver-for vehicle',
                'see fleet',
                'list fleet',
                'view fleet',
                'assign-driver-for fleet',
                'assign-vehicle-for fleet',
                'remove-driver-for fleet',
                'remove-vehicle-for fleet',
                'see contact',
                'list contact',
                'view contact',
                'see vendor',
                'list vendor',
                'view vendor',
                'see facilitator',
                'list facilitator',
                'view facilitator',
                'see customer',
                'list customer',
                'view customer',
            ],
        ],
        [
            'name'        => 'FleetManager',
            'description' => 'Policy for managing vehicles, drivers and fleets.',
            'permissions' => [
                'see extension',
                '* fleet',
                '* driver',
                '* vehicle',
            ],
        ],
        [
            'name'        => 'OrderCoordinator',
            'description' => 'Policy for coordinating and managing orders without full dispatch capabilities.',
            'permissions' => [
                'see extension',
                'see order',
                'list order',
                'view order',
                'update order',
                'create order',
                'schedule order',
                'import order',
                'cancel order',
                'assign-driver-for order',
                'assign-vehicle-for order',
                'update-route-for order',
                'see driver',
                'list driver',
                'view driver',
                'see vehicle',
                'list vehicle',
                'view vehicle',
                'see fleet',
                'list fleet',
                'view fleet',
                'see contact',
                'list contact',
                'view contact',
                'see vendor',
                'list vendor',
                'view vendor',
                'see facilitator',
                'list facilitator',
                'view facilitator',
                'see customer',
                'list customer',
                'view customer',
            ],
        ],
        [
            'name'        => 'ServiceRateManager',
            'description' => 'Policy for managing service rates, including importing rate information.',
            'permissions' => [
                'see extension',
                '* service-rate',
                'see order',
                'list order',
                'see service-area',
                'list service-area',
                'view service-area',
                'see zone',
                'list zone',
                'view zone',
            ],
        ],
        [
            'name'        => 'ServiceAreaManager',
            'description' => 'Policy for managing zones and service areas.',
            'permissions' => [
                'see extension',
                '* service-area',
                '* zone',
                'see order',
                'list order',
            ],
        ],
        [
            'name'        => 'OperationsAdmin',
            'description' => 'Policy for monitoring activities, issues, and fuel reports within the fleet operations.',
            'permissions' => [
                'see extension',
                '* order',
                '* route',
                '* service-rate',
                '* service-area',
                '* fuel-report',
                '* issue',
                '* place',
            ],
        ],
        [
            'name'        => 'NavigatorSettingsManager',
            'description' => 'Policy for managing settings related to the Navigator mobile app used by drivers.',
            'permissions' => [
                'see extension',
                '* navigator-settings',
                'see order',
                'list order',
                'see driver',
                'list driver',
                'see vehicle',
                'list vehicle',
            ],
        ],
        [
            'name'        => 'DriverOperations',
            'description' => 'Policy for drivers to manage their assigned tasks and access necessary information.',
            'permissions' => [
                'see extension',
                'see order',
                'list order',
                'view order',
                'update-route-for order',
                'assign-vehicle-for order',
                'see driver',
                'list driver',
                'view driver',
                'update driver',
                'update-user-for driver',
                'assign-vehicle-for driver',
                'see entity',
                'list entity',
                'view entity',
                'list service-rate',
                'list service-area',
                'list zone',
                'see vehicle',
                'list vehicle',
                'view vehicle',
                'see fleet',
                'list fleet',
                'view fleet',
            ],
            'directives' => [
                'list driver'   => ['where', 'uuid', '=', 'session.driver'],
                'view driver'   => ['where', 'uuid', '=', 'session.driver'],
                'update driver' => ['where', 'uuid', '=', 'session.driver'],
                'list order'    => ['where', 'orders.driver_assigned_uuid', '=', 'session.driver'],
                'list vehicle'  => ['whereHas', 'driver', 'where', 'uuid', '=', 'session.driver'],
                'view vehicle'  => ['whereHas', 'driver', 'where', 'uuid', '=', 'session.driver'],
                'list fleet'    => ['whereHas', 'drivers', 'where', 'uuid', '=', 'session.driver'],
                'view fleet'    => ['whereHas', 'drivers', 'where', 'uuid', '=', 'session.driver'],
            ],
        ],
    ];

    /**
     * Roles provided by this schema.
     */
    public array $roles = [
        [
            'name'        => 'Operations Manager',
            'description' => 'Role responsible for overseeing all operations, including dispatch, fleet management, and order coordination.',
            'policies'    => [
                'DispatchManager',
                'FleetManager',
                'OrderCoordinator',
            ],
        ],
        [
            'name'        => 'Fleet Supervisor',
            'description' => 'Role with responsibilities focused on fleet and driver management.',
            'policies'    => [
                'FleetManager',
                'ServiceAreaManager',
            ],
        ],
        [
            'name'        => 'Service Coordinator',
            'description' => 'Role dedicated to managing service rates and zones.',
            'policies'    => [
                'ServiceRateManager',
                'ServiceAreaManager',
            ],
        ],
        [
            'name'        => 'Operations Administrator',
            'description' => 'Role with complete administrative access to all operational aspects of Fleet-Ops.',
            'policies'    => [
                'OperationsAdmin',
            ],
        ],
        [
            'name'        => 'Driver Coordinator',
            'description' => 'Role responsible for coordinating drivers, vehicles, and orders.',
            'policies'    => [
                'OrderCoordinator',
                'FleetManager',
            ],
        ],
        [
            'name'        => 'Navigator App Manager',
            'description' => 'Role responsible for managing the Navigator mobile app settings.',
            'policies'    => [
                'NavigatorSettingsManager',
            ],
        ],
        [
            'name'        => 'Driver',
            'description' => 'Role for drivers with the necessary access to manage their daily tasks, including order management, and vehicle assignment.',
            'policies'    => [
                'DriverOperations',
            ],
        ],
        [
            'name'           => 'Fleet-Ops Customer',
            'description'    => 'Role for customers with the necessary access to view their orders.',
            'permissions'    => [
                'see extension',
                'list order',
                'view order',
                'list order-config',
                'view order-config',
                'cancel order',
                'create order',
                'list place',
                'create place',
                'update place',
                'delete place',
                'list contact',
                'create contact',
                'update contact',
                'delete contact',
                'iam update user',
            ],
            'directives' => [
                'list order'            => [CustomerOrders::class],
                'view order'            => [CustomerOrders::class],
                'cancel order'          => [CustomerOrders::class],
                'view place'            => [CustomerPlaces::class],
                'list place'            => [CustomerListPlaces::class],
                'update place'          => [CustomerPlaces::class],
                'delete place'          => [CustomerPlaces::class],
                'list contact'          => [CustomerContacts::class],
                'view contact'          => [CustomerContacts::class],
                'update contact'        => [CustomerContacts::class],
                'delete contact'        => [CustomerContacts::class],
                'iam update user'       => [CustomerUser::class],
            ],
        ],
        [
            'name'           => 'Fleet-Ops Contact',
            'description'    => 'Role for contacts.',
            'permissions'    => [],
            'directives'     => [],
        ],
    ];
}
