<?php

namespace App\Http\Controllers;

use App\MultiPickup\Models\RiderCapacity;
use App\MultiPickup\Services\RiderNotificationService;
use App\MultiPickup\Support\NearbyPickupFinder;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

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

    public function quote(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'merchant' => 'required|array',
            'merchant.id' => 'nullable|string',
            'merchant.sales_channel_id' => 'nullable|string',
            'merchant.name' => 'nullable|string',
            'merchant.phone' => 'nullable|string',
            'cart' => 'required|array',
            'cart.id' => 'required|string',
            'cart.currency_code' => 'required|string|size:3',
            'cart.email' => 'nullable|email',
            'cart.item_count' => 'nullable|integer|min:0',
            'cart.subtotal' => 'nullable|numeric|min:0',
            'cart.weight_grams' => 'nullable|integer|min:0',
            'pickup' => 'required|array',
            'pickup.name' => 'required|string',
            'pickup.phone' => 'nullable|string',
            'pickup.address_line_1' => 'required|string',
            'pickup.address_line_2' => 'nullable|string',
            'pickup.city' => 'required|string',
            'pickup.state' => 'nullable|string',
            'pickup.postal_code' => 'nullable|string',
            'pickup.country_code' => 'required|string|size:2',
            'pickup.latitude' => 'required|numeric',
            'pickup.longitude' => 'required|numeric',
            'dropoff' => 'required|array',
            'dropoff.name' => 'required|string',
            'dropoff.phone' => 'nullable|string',
            'dropoff.address_line_1' => 'required|string',
            'dropoff.address_line_2' => 'nullable|string',
            'dropoff.city' => 'required|string',
            'dropoff.state' => 'nullable|string',
            'dropoff.postal_code' => 'nullable|string',
            'dropoff.country_code' => 'required|string|size:2',
            'dropoff.latitude' => 'required|numeric',
            'dropoff.longitude' => 'required|numeric',
            'options' => 'nullable|array',
            'options.service_type' => 'nullable|string',
            'options.collect_cash' => 'nullable|boolean',
            'meta' => 'nullable|array',
        ]);

        $distanceKm = round($this->calculateDistanceKm(
            (float) data_get($payload, 'pickup.latitude'),
            (float) data_get($payload, 'pickup.longitude'),
            (float) data_get($payload, 'dropoff.latitude'),
            (float) data_get($payload, 'dropoff.longitude')
        ), 2);

        $breakdown = $this->buildQuoteBreakdown(
            $distanceKm,
            (int) data_get($payload, 'cart.weight_grams', 0)
        );
        $amount = array_sum($breakdown);
        $quoteId = 'fq_' . Str::upper(Str::random(12));
        $expiresAt = now()->addMinutes((int) config('commission.logistics_quote_ttl_minutes', 15));

        $quote = [
            'quote_id' => $quoteId,
            'provider' => 'fleetbase',
            'currency_code' => strtolower((string) data_get($payload, 'cart.currency_code')),
            'amount' => $amount,
            'breakdown' => $breakdown,
            'distance_km' => $distanceKm,
            'estimated_pickup_minutes' => max(10, (int) ceil($distanceKm * 2)),
            'estimated_dropoff_minutes' => max(20, (int) ceil($distanceKm * 5)),
            'expires_at' => $expiresAt->toIso8601String(),
            'meta' => [
                'sales_channel_id' => data_get($payload, 'merchant.sales_channel_id'),
                'cart_id' => data_get($payload, 'cart.id'),
                'merchant_id' => data_get($payload, 'merchant.id'),
            ],
            'request' => $payload,
        ];

        cache()->put($this->quoteCacheKey($quoteId), $quote, $expiresAt);

        return response()->json([
            'ok' => true,
        ] + Arr::except($quote, ['request']));
    }

    public function createDelivery(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'quote_id' => 'required|string',
            'merchant' => 'required|array',
            'merchant.id' => 'nullable|string',
            'merchant.sales_channel_id' => 'nullable|string',
            'merchant.name' => 'nullable|string',
            'order' => 'required|array',
            'order.id' => 'required|string',
            'order.display_id' => 'nullable|string',
            'order.fulfillment_id' => 'required|string',
            'order.currency_code' => 'nullable|string|size:3',
            'order.delivery_amount' => 'nullable|numeric|min:0',
            'order.email' => 'nullable|email',
            'pickup' => 'required|array',
            'pickup.name' => 'required|string',
            'pickup.phone' => 'nullable|string',
            'pickup.address_line_1' => 'required|string',
            'pickup.city' => 'required|string',
            'pickup.country_code' => 'required|string|size:2',
            'pickup.latitude' => 'required|numeric',
            'pickup.longitude' => 'required|numeric',
            'dropoff' => 'required|array',
            'dropoff.name' => 'required|string',
            'dropoff.phone' => 'nullable|string',
            'dropoff.address_line_1' => 'required|string',
            'dropoff.city' => 'required|string',
            'dropoff.country_code' => 'required|string|size:2',
            'dropoff.latitude' => 'required|numeric',
            'dropoff.longitude' => 'required|numeric',
            'dropoff.notes' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.title' => 'nullable|string',
            'items.*.quantity' => 'nullable|integer|min:1',
            'meta' => 'nullable|array',
        ]);

        $company = $this->resolveLogisticsCompany($payload);

        if (!$company) {
            return response()->json([
                'ok' => false,
                'error' => 'No Fleetbase company is configured for logistics delivery creation.',
            ], 422);
        }

        $existingOrder = $this->findExistingMedusaDelivery(
            $company->uuid,
            (string) data_get($payload, 'order.id'),
            (string) data_get($payload, 'order.fulfillment_id')
        );

        if ($existingOrder) {
            return response()->json([
                'ok' => true,
                'delivery' => $this->formatDeliveryResponse($request, $existingOrder),
            ]);
        }

        $quote = cache()->get($this->quoteCacheKey((string) $payload['quote_id']));

        if (!$quote) {
            return response()->json([
                'ok' => false,
                'error' => 'Quote not found or expired.',
            ], 422);
        }

        $driver = $this->findAvailableDriver(
            $company->uuid,
            (float) data_get($payload, 'pickup.latitude'),
            (float) data_get($payload, 'pickup.longitude')
        );

        $externalDisplayId = (string) data_get($payload, 'order.display_id', data_get($payload, 'order.id'));
        $status = $driver ? 'dispatched' : 'created';

        $order = new Order();
        $order->company_uuid = $company->uuid;
        $order->created_by_uuid = $company->owner_uuid;
        $order->updated_by_uuid = $company->owner_uuid;
        $order->driver_assigned_uuid = data_get($driver, 'uuid');
        $order->dispatched = !is_null($driver);
        $order->dispatched_at = $driver ? now() : null;
        $order->type = 'delivery';
        $order->status = $status;
        $order->notes = sprintf('Medusa logistics delivery for %s', $externalDisplayId);
        $order->meta = [
            'source' => data_get($payload, 'meta.source', 'shopifyme'),
            'quote_id' => $payload['quote_id'],
            'quote_amount' => data_get($quote, 'amount'),
            'quote_currency_code' => data_get($quote, 'currency_code'),
            'merchant_id' => data_get($payload, 'merchant.id'),
            'merchant_name' => data_get($payload, 'merchant.name'),
            'sales_channel_id' => data_get($payload, 'merchant.sales_channel_id'),
            'medusa_order_id' => data_get($payload, 'order.id'),
            'medusa_display_id' => data_get($payload, 'order.display_id'),
            'fulfillment_id' => data_get($payload, 'order.fulfillment_id'),
            'customer_email' => data_get($payload, 'order.email'),
            'delivery_amount' => data_get($payload, 'order.delivery_amount', data_get($quote, 'amount')),
            'pickup' => data_get($payload, 'pickup'),
            'dropoff' => data_get($payload, 'dropoff'),
            'items' => data_get($payload, 'items', []),
        ];
        $order->save();

        if ($driver) {
            RiderCapacity::addPackage($driver->uuid, $order->uuid);
        }

        return response()->json([
            'ok' => true,
            'delivery' => $this->formatDeliveryResponse($request, $order),
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

    protected function buildQuoteBreakdown(float $distanceKm, int $weightGrams = 0): array
    {
        $baseFee = (int) config('commission.logistics_quote_base_fee', 3000);
        $distanceFee = (int) round(max(1, $distanceKm) * (int) config('commission.logistics_quote_per_km_fee', 500));
        $serviceFee = (int) config('commission.logistics_quote_service_fee', 1000);
        $includedWeight = (int) config('commission.logistics_quote_weight_included_grams', 3000);
        $extraKgFee = (int) config('commission.logistics_quote_extra_kg_fee', 250);
        $extraWeightFee = 0;

        if ($weightGrams > $includedWeight) {
            $extraWeightFee = (int) ceil(($weightGrams - $includedWeight) / 1000) * $extraKgFee;
        }

        return [
            'base_fee' => $baseFee,
            'distance_fee' => $distanceFee,
            'service_fee' => $serviceFee,
            'commission_fee' => $extraWeightFee,
        ];
    }

    protected function quoteCacheKey(string $quoteId): string
    {
        return sprintf('logistics:quote:%s', $quoteId);
    }

    protected function resolveLogisticsCompany(array $payload): ?Company
    {
        $configuredCompanyUuid = data_get($payload, 'meta.fleetbase_company_uuid')
            ?: config('commission.logistics_default_company_uuid');

        if (filled($configuredCompanyUuid)) {
            return Company::where('uuid', $configuredCompanyUuid)->first();
        }

        return Company::query()
            ->orderByDesc('onboarding_completed_at')
            ->orderBy('created_at')
            ->first();
    }

    protected function findExistingMedusaDelivery(string $companyUuid, string $orderId, string $fulfillmentId): ?Order
    {
        $existing = DB::table('orders')
            ->where('company_uuid', $companyUuid)
            ->whereNull('deleted_at')
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(meta, '$.medusa_order_id')) = ?", [$orderId])
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(meta, '$.fulfillment_id')) = ?", [$fulfillmentId])
            ->select('uuid')
            ->first();

        if (!$existing) {
            return null;
        }

        return Order::query()->where('uuid', $existing->uuid)->first();
    }

    protected function formatDeliveryResponse(Request $request, Order $order): array
    {
        $order->refresh();

        return [
            'fleetbase_order_uuid' => $order->uuid,
            'fleetbase_order_public_id' => $order->public_id,
            'status' => $this->determineTrackingStatus((object) [
                'status' => $order->status,
                'started' => $order->started,
                'started_at' => $order->started_at,
                'dispatched' => $order->dispatched,
                'dispatched_at' => $order->dispatched_at,
                'driver_uuid' => $order->driver_assigned_uuid,
            ]),
            'tracking_url' => $this->buildTrackingUrl(
                $request,
                $order->public_id ?: $order->uuid,
                (string) data_get($order->meta, 'merchant_name', 'Merchant')
            ),
            'driver_assigned_uuid' => $order->driver_assigned_uuid,
        ];
    }

    protected function buildTrackingUrl(Request $request, string $orderId, string $merchantName): string
    {
        return $request->getSchemeAndHttpHost() . '/track?' . http_build_query([
            'order_id' => $orderId,
            'display_id' => $orderId,
            'merchant' => $merchantName,
        ]);
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

    protected function findAvailableDriver(string $companyUuid, float $latitude, float $longitude): ?object
    {
        $candidates = DB::table('drivers as d')
            ->leftJoin('users as u', 'u.uuid', '=', 'd.user_uuid')
            ->where('d.company_uuid', $companyUuid)
            ->whereNull('d.deleted_at')
            ->where('d.online', 1)
            ->where('d.status', 'active')
            ->whereNotNull('d.location')
            ->select([
                'd.uuid',
                'd.user_uuid',
                'u.name',
                'u.phone',
                DB::raw(sprintf(
                    'ST_Distance_Sphere(d.location, POINT(%F, %F)) as distance_meters',
                    $longitude,
                    $latitude
                )),
            ])
            ->orderByRaw('distance_meters asc')
            ->limit(10)
            ->get();

        foreach ($candidates as $candidate) {
            if (RiderCapacity::hasCapacity($candidate->uuid)) {
                return $candidate;
            }
        }

        return null;
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

    protected function calculateDistanceKm(
        float $pickupLatitude,
        float $pickupLongitude,
        float $dropoffLatitude,
        float $dropoffLongitude
    ): float {
        $earthRadiusKm = 6371;
        $latitudeDelta = deg2rad($dropoffLatitude - $pickupLatitude);
        $longitudeDelta = deg2rad($dropoffLongitude - $pickupLongitude);
        $pickupLatitude = deg2rad($pickupLatitude);
        $dropoffLatitude = deg2rad($dropoffLatitude);

        $haversine = sin($latitudeDelta / 2) ** 2
            + cos($pickupLatitude) * cos($dropoffLatitude) * sin($longitudeDelta / 2) ** 2;

        return $earthRadiusKm * (2 * asin(min(1, sqrt($haversine))));
    }
}
