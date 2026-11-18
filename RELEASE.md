> v0.8.0 ~ "Laravel 12"

---
## Highlights

- **The API runs on Laravel 12.** Fleetbase moves from Laravel 10 to Laravel 12, with PHP 8.2 or later, Sanctum 4 and Carbon 3. core-api 2.0.0 and every bundled extension have new releases built for it. (#749)
- **No security advisory exceptions.** `composer audit` reports no advisories and no abandoned packages on the new dependency set, with no ignores, so the Composer advisory workarounds are gone.
- **Order config policies, triggers and templates.** An order config now decides how its orders are offered to drivers, matched, priced, and what customers may do, and runs actions when an order reaches an activity. Configs can be made from the `transport` or `passenger` template. See Fleet-Ops `0.7.0` below.
- **Every bundled extension is released against core-api 2.0.** Extensions built for core-api 1.6.x don't install on this release; see Upgrade Steps.

---
## Component Versions
- `console`: `0.8.0`
- `core-api`: `2.0.0`
- `fleetops`: `0.7.0`
- `storefront`: `0.5.0`
- `ledger`: `0.1.0`
- `customer-portal`: `0.1.0`
- `registry-bridge`: `0.2.0`
- `ai`: `0.1.0`
- `valhalla`: `0.1.0`
- `vroom`: `0.1.0`
- `dev-engine`: `0.2.18`
- `ember-ui`: `0.4.6`
- `ember-core`: `0.3.26`
- `fleetops-data`: `0.2.4`
- `iam-engine`: `0.1.13`

---
## Core API `2.0.0`
- **Laravel 12, Sanctum 4 and Carbon 3**, on PHP 8.2 or later. The constraint already admits Laravel 13.
- **`Request::array()` is now `inputArray()`.** Laravel 11+ ships a native `Request::array()` that wins over a macro of the same name and doesn't split comma-separated values, so `?sort=a,b` and `?without=a,b` would have returned a 500. Extensions must call `inputArray()`.
- **Doctrine DBAL removed.** Schema introspection uses Laravel's own `Schema` builder.
- **FCM push** works with kreait/laravel-firebase 6.
- New majors of Fleetbase's forks: `laravel-mysql-spatial` 2.0, `countries` 0.9 and `twilio` 6.0.

## Fleet-Ops `0.7.0`
- **Order config policies:** how adhoc orders are offered (all nearby drivers at once, or one at a time with a timed offer), driver matching by vehicle type, what customers may do (payment methods, quotes, cancelling, chat, rating, sharing tracking), and pricing an order again from the actual distance and time.
- **Triggers:** actions that run when an order reaches an activity, is created, completed or canceled, when no driver accepts, or when the driver nears the pickup or drop-off.
- **Templates:** **New Order Config** in the Console, or `php artisan fleetops:create-order-config {template} --company=`.
- **Customer API** for places, sign-in codes, an order's dispatch, cancel, driver, tracker and ETA, chat with the driver, ratings, tracking links and account deletion, as the order's config allows.

## Ledger `0.1.0`
- A Fleet-Ops order's customer can fetch and pay its invoice, a paid invoice settles the order's transaction, and order configs gain a `send_invoice` trigger action.
- The cash gateway can be set to staff-confirm only.

## Storefront `0.5.0`, Customer Portal `0.1.0`, Registry Bridge `0.2.0`, AI, Valhalla and Vroom `0.1.0`
- Released for Laravel 12 and core-api 2.0.

---
## Upgrade Steps
- **Back up the database first.** This is a major framework upgrade.
- Pull the new images and restart every API, queue, scheduler and events container. Octane workers must restart to load the new framework.
- Migrations run on deploy. core-api adds a guarded `personal_access_tokens` migration, which does nothing where the table already exists, so existing API tokens keep working.
- **Update installed extensions.** Every extension needs a release built for core-api 2.0. Update extensions installed from the registry to their latest release; an extension still on core-api 1.6.x won't install.
- **Custom code:** call `$request->inputArray()` instead of `$request->array()`, and check Carbon `diffIn*` calls, which now return signed floats.
- **If you set `CACHE_PREFIX`** without a trailing `:`, flush the cache when upgrading; Laravel 11+ no longer adds one. The default prefix now includes it.
- **If you maintain your own `api/bootstrap/app.php`,** keep `$app->dontMergeFrameworkConfiguration()`. Without it, Laravel 12's default database connection replaces the one core-api builds from `DATABASE_URL`, and the API connects to 127.0.0.1.
- Laravel 10 installs can stay on v0.7.75, with core-api 1.6.x and the earlier extension lines.

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
