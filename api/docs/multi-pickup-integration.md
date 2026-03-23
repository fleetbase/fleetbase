# Multi-Pickup Integration

This repo already separates the Laravel app into [`api/`](/Users/leslieaine/shopify/fleetbase/api), so the `fleetbase-setup` code was integrated directly into the real app instead of being kept as a Docker-only side package.

## What was carried over

- Rider capacity tracking with a max-packages cap in [`rider_capacities`](/Users/leslieaine/shopify/fleetbase/api/database/migrations/2026_03_22_000001_create_rider_capacities_table.php)
- Nearby pickup lookup and a scheduled scanner in [`NearbyPickupFinder.php`](/Users/leslieaine/shopify/fleetbase/api/app/MultiPickup/Support/NearbyPickupFinder.php) and [`NearbyPickupScanner.php`](/Users/leslieaine/shopify/fleetbase/api/app/MultiPickup/Support/NearbyPickupScanner.php)
- Customer confirmation and a tracking page in [`MultiPickupController.php`](/Users/leslieaine/shopify/fleetbase/api/app/Http/Controllers/MultiPickupController.php) and [`tracking.blade.php`](/Users/leslieaine/shopify/fleetbase/api/resources/views/tracking.blade.php)
- Medusa delivery confirmation webhook forwarding from [`MultiPickupController.php`](/Users/leslieaine/shopify/fleetbase/api/app/Http/Controllers/MultiPickupController.php)

## What was intentionally not copied as-is

- `docker-compose.yml`, `scripts/setup.sh`, and `scripts/init.sql`
  These are Docker bootstrap helpers from the setup repo, not application code for this monorepo.
- The original SQL table names from Claude's scaffold
  Fleetbase's ERD in [`database.mmd`](/Users/leslieaine/shopify/fleetbase/database.mmd) uses `fleetbase_*` tables, so the nearby-pickup and tracking queries were corrected to match `fleetbase_orders`, `fleetbase_payloads`, `fleetbase_waypoints`, `fleetbase_places`, and `fleetbase_drivers`.
- The FCM-token-specific listener logic
  The schema in this repo does not expose an obvious `fcm_token` column. Notifications now go through an optional webhook configured with `MULTI_PICKUP_NOTIFY_WEBHOOK_URL`, and otherwise fall back to logging.
- The payout helper
  The original script assumed `orders.total` and direct driver phone fields that are not present in this repo's ERD, so it was left out instead of shipping a misleading script.

## Routes added

- `GET /track`
- `GET /api/v1/multi-pickup/capacity/{riderId}`
- `POST /api/v1/multi-pickup/capacity/{riderId}/add`
- `POST /api/v1/multi-pickup/capacity/{riderId}/remove`
- `GET /api/v1/multi-pickup/nearby-pickups`
- `GET /api/v1/multi-pickup/orders/{orderId}/tracking`
- `POST /api/v1/multi-pickup/orders/{orderId}/customer-confirm`
- `GET /api/v1/multi-pickup/orders/{orderId}/customer-confirmed`
- `POST /api/v1/multi-pickup/fleetbase-webhook`

## Env vars

Add these to your local `.env`:

```env
PLATFORM_COMMISSION_PERCENTAGE=7
MAX_PACKAGES_PER_RIDER=3
NEARBY_PICKUP_RADIUS_KM=2
NEARBY_PICKUP_PENDING_STATUSES=created,pending
MEDUSA_BACKEND_URL=http://localhost:9000
MEDUSA_DELIVERY_CONFIRMED_PATH=/courier/delivery-confirmed
FLEETBASE_WEBHOOK_SECRET=
MEDUSA_WEBHOOK_SECRET=
AFRICASTALKING_API_KEY=
AFRICASTALKING_USERNAME=sandbox
MULTI_PICKUP_NOTIFY_WEBHOOK_URL=
```

## Remaining integration points

- Hard enforcement inside Fleetbase's internal driver-assignment engine still depends on the upstream `fleetbase/fleetops-api` package. In this repo we added the capacity endpoints and webhook sync points, but not a patch to the package's private assignment algorithm because that package source is not checked into this tree.
- To auto-sync rider capacity without app-side polling, register relevant order webhooks to `POST /api/v1/multi-pickup/fleetbase-webhook` and include at least assignment/dispatched/completed events if your Fleetbase instance emits them.
- To push rider alerts into Navigator or another mobile bridge, point `MULTI_PICKUP_NOTIFY_WEBHOOK_URL` at that notification service.
