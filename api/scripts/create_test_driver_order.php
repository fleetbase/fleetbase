<?php

declare(strict_types=1);

use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\Models\Company;
use Fleetbase\Models\CompanyUser;
use Fleetbase\Models\Role;
use Fleetbase\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Str;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$company = Company::where('uuid', '16a1663a-4951-4594-918d-061b118f409b')->firstOrFail();
$owner = User::where('uuid', '62720a6a-bb5d-4c66-a528-d60eaf7b7136')->firstOrFail();
$role = Role::where('name', 'Driver')->where('guard_name', 'sanctum')->firstOrFail();

$user = User::where('email', 'driver@test.com')->first();

if (!$user) {
    $user = User::create([
        'name' => 'Drivertest',
        'email' => 'driver@test.com',
        'phone' => '+2567145673345',
        'company_uuid' => $company->uuid,
        'status' => 'active',
        'password' => bcrypt('DriverPass123!'),
    ]);
}

$user->name = 'Drivertest';
$user->phone = '+2567145673345';
$user->company_uuid = $company->uuid;
$user->status = 'active';
$user->setType('driver');
$user->save();

$companyUser = CompanyUser::firstOrCreate(
    [
        'company_uuid' => $company->uuid,
        'user_uuid' => $user->uuid,
    ],
    [
        'uuid' => (string) Str::uuid(),
        'status' => 'active',
    ]
);

$companyUser->status = 'active';
$companyUser->save();
$companyUser->assignSingleRole($role->name);

$driver = Driver::firstOrCreate(
    [
        'company_uuid' => $company->uuid,
        'user_uuid' => $user->uuid,
    ],
    [
        'uuid' => (string) Str::uuid(),
        'public_id' => 'DRIVER-TEST-001',
        'slug' => $user->slug ?: Str::slug($user->name . '-' . Str::random(4)),
        'location' => new Point(0.3476, 32.5825),
        'latitude' => '0.3476',
        'longitude' => '32.5825',
        'online' => 1,
        'status' => 'active',
    ]
);

$driver->public_id = $driver->public_id ?: 'DRIVER-TEST-001';
$driver->location = new Point(0.3476, 32.5825);
$driver->latitude = '0.3476';
$driver->longitude = '32.5825';
$driver->online = 1;
$driver->status = 'active';
$driver->slug = $driver->slug ?: ($user->slug ?: Str::slug($user->name . '-' . Str::random(4)));
$driver->save();

$order = Order::firstOrCreate(
    [
        'public_id' => 'ORDER-TEST-001',
    ],
    [
        'uuid' => (string) Str::uuid(),
        'company_uuid' => $company->uuid,
        'created_by_uuid' => $owner->uuid,
        'updated_by_uuid' => $owner->uuid,
        'driver_assigned_uuid' => $driver->uuid,
        'dispatched' => 1,
        'dispatched_at' => now(),
        'status' => 'dispatched',
        'type' => 'delivery',
        'notes' => 'Backend-created test order for multi-pickup verification',
    ]
);

$order->company_uuid = $company->uuid;
$order->created_by_uuid = $order->created_by_uuid ?: $owner->uuid;
$order->updated_by_uuid = $owner->uuid;
$order->driver_assigned_uuid = $driver->uuid;
$order->dispatched = true;
$order->dispatched_at = $order->dispatched_at ?: now();
$order->status = 'dispatched';
$order->type = $order->type ?: 'delivery';
$order->save();

echo json_encode([
    'user_uuid' => $user->uuid,
    'company_user_uuid' => $companyUser->uuid,
    'driver_uuid' => $driver->uuid,
    'driver_public_id' => $driver->public_id,
    'order_uuid' => $order->uuid,
    'order_public_id' => $order->public_id,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
