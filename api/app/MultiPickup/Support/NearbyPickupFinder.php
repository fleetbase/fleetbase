<?php

namespace App\MultiPickup\Support;

use App\MultiPickup\Models\RiderCapacity;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class NearbyPickupFinder
{
    public function forRider(string $riderId, ?float $latitude = null, ?float $longitude = null): Collection
    {
        $driver = DB::table('drivers')
            ->where('uuid', $riderId)
            ->whereNull('deleted_at')
            ->select([
                'uuid',
                'company_uuid',
                DB::raw('ST_Y(location) as latitude'),
                DB::raw('ST_X(location) as longitude'),
            ])
            ->first();

        if (!$driver) {
            return collect();
        }

        $lat = $latitude ?? $this->toFloat($driver->latitude);
        $lng = $longitude ?? $this->toFloat($driver->longitude);

        if ($lat === null || $lng === null) {
            return collect();
        }

        $limit = RiderCapacity::freeSlots($riderId);
        if ($limit < 1) {
            return collect();
        }

        $radiusKm = (float) config('commission.nearby_pickup_radius_km', 2);
        $pendingStatuses = collect(config('commission.nearby_pickup_pending_statuses', ['created', 'pending']))
            ->filter()
            ->values()
            ->all();

        if (count($pendingStatuses) === 0) {
            $pendingStatuses = ['created', 'pending'];
        }

        $statusPlaceholders = implode(', ', array_fill(0, count($pendingStatuses), '?'));

        $bindings = [
            $lat,
            $lng,
            $lat,
            $driver->company_uuid,
            ...$pendingStatuses,
            $radiusKm,
        ];

        $rows = DB::select(
            "
            SELECT
                o.uuid,
                o.public_id,
                o.status,
                p.name AS pickup_name,
                p.street1 AS pickup_address,
                CAST(ST_Y(p.location) AS DECIMAL(10, 7)) AS pickup_lat,
                CAST(ST_X(p.location) AS DECIMAL(10, 7)) AS pickup_lng,
                (
                    6371 * acos(
                        cos(radians(?)) * cos(radians(CAST(ST_Y(p.location) AS DECIMAL(10, 7))))
                        * cos(radians(CAST(ST_X(p.location) AS DECIMAL(10, 7))) - radians(?))
                        + sin(radians(?)) * sin(radians(CAST(ST_Y(p.location) AS DECIMAL(10, 7))))
                    )
                ) AS distance_km
            FROM orders o
            JOIN payloads payload ON payload.uuid = o.payload_uuid
            JOIN waypoints waypoint ON waypoint.uuid = payload.pickup_uuid
            JOIN places p ON p.uuid = waypoint.place_uuid
            WHERE o.deleted_at IS NULL
              AND payload.deleted_at IS NULL
              AND waypoint.deleted_at IS NULL
              AND p.deleted_at IS NULL
              AND o.company_uuid = ?
              AND o.driver_assigned_uuid IS NULL
              AND o.status IN ({$statusPlaceholders})
              AND p.location IS NOT NULL
            HAVING distance_km <= ?
            ORDER BY distance_km ASC
            LIMIT {$limit}
            ",
            $bindings
        );

        return collect($rows)->map(function ($row) {
            return [
                'uuid' => $row->uuid,
                'public_id' => $row->public_id,
                'status' => $row->status,
                'pickup_name' => $row->pickup_name,
                'pickup_address' => $row->pickup_address,
                'pickup_lat' => $this->toFloat($row->pickup_lat),
                'pickup_lng' => $this->toFloat($row->pickup_lng),
                'distance_km' => round((float) $row->distance_km, 2),
            ];
        });
    }

    private function toFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (float) $value;
    }
}
