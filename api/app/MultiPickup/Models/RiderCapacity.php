<?php

namespace App\MultiPickup\Models;

use Illuminate\Database\Eloquent\Model;

class RiderCapacity extends Model
{
    protected $table = 'rider_capacities';

    protected $fillable = [
        'rider_id',
        'active_count',
        'order_ids',
    ];

    protected $casts = [
        'order_ids' => 'array',
    ];

    public static function hasCapacity(string $riderId): bool
    {
        return static::freeSlots($riderId) > 0;
    }

    public static function addPackage(string $riderId, string $orderId): bool
    {
        $record = static::firstOrCreate(
            ['rider_id' => $riderId],
            ['active_count' => 0, 'order_ids' => []]
        );

        $orderIds = collect($record->order_ids ?? [])
            ->push($orderId)
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (count($orderIds) > config('commission.max_packages_per_rider', 3)) {
            return false;
        }

        $record->update([
            'active_count' => count($orderIds),
            'order_ids' => $orderIds,
        ]);

        return true;
    }

    public static function removePackage(string $riderId, string $orderId): void
    {
        $record = static::where('rider_id', $riderId)->first();

        if (!$record) {
            return;
        }

        $orderIds = collect($record->order_ids ?? [])
            ->reject(fn ($id) => $id === $orderId)
            ->values()
            ->all();

        $record->update([
            'active_count' => count($orderIds),
            'order_ids' => $orderIds,
        ]);
    }

    public static function freeSlots(string $riderId): int
    {
        $max = (int) config('commission.max_packages_per_rider', 3);
        $record = static::where('rider_id', $riderId)->first();

        if (!$record) {
            return $max;
        }

        return max(0, $max - (int) $record->active_count);
    }
}
