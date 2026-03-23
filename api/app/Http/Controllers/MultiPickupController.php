<?php

namespace App\Http\Controllers;

use App\MultiPickup\Models\RiderCapacity;
use App\MultiPickup\Services\RiderNotificationService;
use App\MultiPickup\Support\NearbyPickupFinder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MultiPickupController extends Controller
{
    public function __construct(
        protected NearbyPickupFinder $nearbyPickupFinder,
        protected RiderNotificationService $notifier
    ) {
    }

    public function getRiderCapacity(string $riderId): JsonResponse
    {
        $max = (int) config('commission.max_packages_per_rider', 3);
        $freeSlots = RiderCapacity::freeSlots($riderId);

        return response()->json([
            'rider_id' => $riderId,
            'max' => $max,
            'active' => $max - $freeSlots,
            'free_slots' => $freeSlots,
            'has_capacity' => $freeSlots > 0,
        ]);
    }

    public function addPackage(Request $request, string $riderId): JsonResponse
    {
        $payload = $request->validate([
            'order_id' => 'required|string',
        ]);

        $added = RiderCapacity::addPackage($riderId, $payload['order_id']);

        if (!$added) {
            return response()->json([
                'ok' => false,
                'error' => sprintf(
                    'Rider is at maximum capacity (%d packages).',
                    config('commission.max_packages_per_rider', 3)
                ),
                'has_capacity' => false,
            ], 422);
        }

        return response()->json([
            'ok' => true,
            'free_slots' => RiderCapacity::freeSlots($riderId),
        ]);
    }

    public function removePackage(Request $request, string $riderId): JsonResponse
    {
        $payload = $request->validate([
            'order_id' => 'required|string',
        ]);

        RiderCapacity::removePackage($riderId, $payload['order_id']);

        return response()->json([
            'ok' => true,
            'free_slots' => RiderCapacity::freeSlots($riderId),
        ]);
    }

    public function customerConfirm(Request $request, string $orderId): JsonResponse
    {
        $payload = $request->validate([
            'customer_note' => 'nullable|string|max:200',
        ]);

        $order = $this->findOrder($orderId);

        if (!$order) {
            return response()->json([
                'ok' => false,
                'error' => 'Order not found.',
            ], 404);
        }

        $cacheKey = sprintf('multi-pickup:customer-confirmed:%s', $order->uuid);
        $cachePayload = [
            'confirmed_at' => now()->toIso8601String(),
            'customer_note' => $payload['customer_note'] ?? null,
        ];

        cache()->put($cacheKey, $cachePayload, now()->addHours(6));

        if ($order->driver_uuid) {
            $this->notifier->notify('customer_confirmed_ready', [
                'order_uuid' => $order->uuid,
                'order_public_id' => $order->public_id,
                'driver_uuid' => $order->driver_uuid,
                'driver_user_uuid' => $order->driver_user_uuid,
                'driver_name' => $order->driver_name,
                'customer_note' => $cachePayload['customer_note'],
                'confirmed_at' => $cachePayload['confirmed_at'],
            ]);
        }

        return response()->json([
            'ok' => true,
            'message' => 'Your rider has been notified.',
        ] + $cachePayload);
    }

    public function isCustomerConfirmed(string $orderId): JsonResponse
    {
        $order = $this->findOrder($orderId);

        if (!$order) {
            return response()->json([
                'confirmed' => false,
                'error' => 'Order not found.',
            ], 404);
        }

        $cacheKey = sprintf('multi-pickup:customer-confirmed:%s', $order->uuid);
        $data = cache()->get($cacheKey);

        return response()->json([
            'confirmed' => !is_null($data),
            'confirmed_at' => data_get($data, 'confirmed_at'),
            'customer_note' => data_get($data, 'customer_note'),
        ]);
    }

    public function getNearbyPickups(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'rider_id' => 'required|string',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
        ]);

        $riderId = $payload['rider_id'];

        if (!RiderCapacity::hasCapacity($riderId)) {
            return response()->json([
                'rider_id' => $riderId,
                'free_slots' => 0,
                'radius_km' => (float) config('commission.nearby_pickup_radius_km', 2),
                'nearby_pickups' => [],
                'message' => 'Rider is already at full capacity.',
            ]);
        }

        $pickups = $this->nearbyPickupFinder->forRider(
            $riderId,
            isset($payload['lat']) ? (float) $payload['lat'] : null,
            isset($payload['lng']) ? (float) $payload['lng'] : null
        );

        return response()->json([
            'rider_id' => $riderId,
            'free_slots' => RiderCapacity::freeSlots($riderId),
            'radius_km' => (float) config('commission.nearby_pickup_radius_km', 2),
            'nearby_pickups' => $pickups->values()->all(),
        ]);
    }

    public function tracking(string $orderId): JsonResponse
    {
        $order = $this->findOrder($orderId);

        if (!$order) {
            return response()->json([
                'error' => 'Order not found.',
            ], 404);
        }

        $effectiveStatus = $this->determineTrackingStatus($order);

        return response()->json([
            'uuid' => $order->uuid,
            'public_id' => $order->public_id,
            'status' => $effectiveStatus,
            'raw_status' => $order->status,
            'driver' => [
                'uuid' => $order->driver_uuid,
                'user_uuid' => $order->driver_user_uuid,
                'name' => $order->driver_name,
                'phone' => $order->driver_phone,
                'latitude' => $this->toFloat($order->driver_latitude),
                'longitude' => $this->toFloat($order->driver_longitude),
            ],
            'timeline' => [
                'created_at' => $this->toIso8601String($order->created_at),
                'dispatched_at' => $this->toIso8601String($order->dispatched_at),
                'started_at' => $this->toIso8601String($order->started_at),
                'updated_at' => $this->toIso8601String($order->updated_at),
            ],
        ]);
    }

    public function fleetbaseWebhook(Request $request): JsonResponse
    {
        $inboundSecret = $request->header('X-Webhook-Secret');
        $expectedSecret = config('commission.fleetbase_webhook_secret');

        if (filled($expectedSecret) && $inboundSecret !== $expectedSecret) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $event = $request->input('event', $request->input('type'));
        $data = $request->input('data', $request->all());
        $status = strtolower((string) data_get($data, 'status', ''));
        $driverId = data_get($data, 'driver.uuid') ?? data_get($data, 'driver_assigned_uuid');
        $fleetbaseOrderId = data_get($data, 'uuid') ?? data_get($data, 'order_uuid');

        if ($driverId && $fleetbaseOrderId && $this->shouldIncrementCapacity($event, $status)) {
            RiderCapacity::addPackage($driverId, $fleetbaseOrderId);
        }

        if ($driverId && $fleetbaseOrderId && $this->shouldReleaseCapacity($event, $status)) {
            RiderCapacity::removePackage($driverId, $fleetbaseOrderId);
        }

        if ($this->isDeliveryCompleted($event, $status)) {
            $this->notifyMedusaDelivered($data);
        }

        return response()->json(['ok' => true]);
    }

    protected function notifyMedusaDelivered(array $data): void
    {
        $medusaUrl = rtrim((string) config('commission.medusa_backend_url'), '/');
        $medusaPath = '/' . ltrim((string) config('commission.medusa_delivery_confirmed_path', '/courier/delivery-confirmed'), '/');
        $secret = (string) config('commission.medusa_webhook_secret');

        if (blank($medusaUrl)) {
            Log::info('Skipping Medusa delivery confirmation because MEDUSA_BACKEND_URL is not configured.');

            return;
        }

        $orderId = data_get($data, 'meta.medusa_order_id');
        $fulfillmentId = data_get($data, 'meta.fulfillment_id');

        if (!$orderId || !$fulfillmentId) {
            Log::warning('Skipping Medusa delivery confirmation because required order metadata is missing.', [
                'meta' => data_get($data, 'meta', []),
            ]);

            return;
        }

        try {
            Http::withHeaders([
                'Content-Type' => 'application/json',
                'X-Webhook-Secret' => $secret,
            ])->post($medusaUrl . $medusaPath, [
                'order_id' => $orderId,
                'fulfillment_id' => $fulfillmentId,
                'source' => 'fleetbase',
                'delivered_at' => now()->toIso8601String(),
                'fleetbase_order_uuid' => data_get($data, 'uuid'),
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Medusa delivery confirmation failed.', [
                'error' => $exception->getMessage(),
                'order_id' => $orderId,
                'fulfillment_id' => $fulfillmentId,
            ]);
        }
    }

    protected function shouldIncrementCapacity(?string $event, string $status): bool
    {
        return in_array($event, ['order.assigned', 'order.dispatched', 'order.started'], true)
            || in_array($status, ['assigned', 'dispatched', 'started', 'in_progress'], true);
    }

    protected function shouldReleaseCapacity(?string $event, string $status): bool
    {
        return in_array($event, ['order.completed', 'order.canceled', 'order.cancelled', 'order.failed'], true)
            || in_array($status, ['completed', 'canceled', 'cancelled', 'failed'], true);
    }

    protected function isDeliveryCompleted(?string $event, string $status): bool
    {
        return $event === 'order.completed' || $status === 'completed';
    }

    protected function findOrder(string $identifier): ?object
    {
        return DB::table('orders as o')
            ->leftJoin('drivers as d', 'd.uuid', '=', 'o.driver_assigned_uuid')
            ->leftJoin('users as u', 'u.uuid', '=', 'd.user_uuid')
            ->whereNull('o.deleted_at')
            ->where(function ($query) use ($identifier) {
                $query->where('o.uuid', $identifier)
                    ->orWhere('o.public_id', $identifier);
            })
            ->select([
                'o.uuid',
                'o.public_id',
                'o.status',
                'o.dispatched',
                'o.dispatched_at',
                'o.started',
                'o.started_at',
                'o.created_at',
                'o.updated_at',
                'd.uuid as driver_uuid',
                'd.user_uuid as driver_user_uuid',
                DB::raw('ST_Y(d.location) as driver_latitude'),
                DB::raw('ST_X(d.location) as driver_longitude'),
                'u.name as driver_name',
                'u.phone as driver_phone',
            ])
            ->first();
    }

    protected function determineTrackingStatus(object $order): string
    {
        $rawStatus = strtolower((string) ($order->status ?? ''));

        if (in_array($rawStatus, ['completed', 'cancelled', 'canceled', 'failed'], true)) {
            return $rawStatus;
        }

        if (!empty($order->started_at) || (int) ($order->started ?? 0) === 1) {
            return 'started';
        }

        if (!empty($order->dispatched_at) || (int) ($order->dispatched ?? 0) === 1 || !empty($order->driver_uuid)) {
            return 'dispatched';
        }

        if ($rawStatus !== '') {
            return $rawStatus;
        }

        return 'created';
    }

    protected function toFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (float) $value;
    }

    protected function toIso8601String(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Carbon::parse($value)->toIso8601String();
    }
}
