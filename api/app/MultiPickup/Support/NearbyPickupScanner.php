<?php

namespace App\MultiPickup\Support;

use App\MultiPickup\Models\RiderCapacity;
use App\MultiPickup\Services\RiderNotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NearbyPickupScanner
{
    public function __construct(
        protected NearbyPickupFinder $finder,
        protected RiderNotificationService $notifier
    ) {
    }

    public function run(): void
    {
        $activeDrivers = DB::table('drivers as d')
            ->leftJoin('users as u', 'u.uuid', '=', 'd.user_uuid')
            ->whereNull('d.deleted_at')
            ->where('d.online', 1)
            ->whereNotNull('d.location')
            ->select([
                'd.uuid',
                'd.public_id',
                'd.user_uuid',
                'u.name as rider_name',
            ])
            ->get();

        foreach ($activeDrivers as $driver) {
            if (!RiderCapacity::hasCapacity($driver->uuid)) {
                continue;
            }

            $pickups = $this->finder->forRider($driver->uuid);

            foreach ($pickups as $pickup) {
                $cacheKey = sprintf('multi-pickup:notified:%s:%s', $driver->uuid, $pickup['uuid']);

                if (cache()->has($cacheKey)) {
                    continue;
                }

                cache()->put($cacheKey, true, now()->addMinutes(10));

                $this->notifier->notify('nearby_pickup_available', [
                    'rider_uuid' => $driver->uuid,
                    'rider_public_id' => $driver->public_id,
                    'rider_user_uuid' => $driver->user_uuid,
                    'rider_name' => $driver->rider_name,
                    'pickup' => $pickup,
                ]);
            }
        }

        Log::info('Completed nearby pickup scan.', ['drivers' => $activeDrivers->count()]);
    }
}
