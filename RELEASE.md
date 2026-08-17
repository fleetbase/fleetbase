> v0.7.54 ~ "Marketplace APIs, Fleet-Ops hardening, portal visibility, and release CI fixes"

---
## Highlights
Fleetbase `0.7.54` is a focused reliability and API hardening release. It updates Core API settings cache behavior, tightens Fleet-Ops public API and verification flows, restores Storefront marketplace backend support, fixes Customer Portal order visibility, and keeps Ledger wallet routes and release contract workflows aligned.

---
## Component Versions
- `console`: `0.7.54`
- `core-api`: `1.6.58`
- `fleetops`: `0.6.60`
- `customer-portal`: `0.0.13`
- `storefront`: `0.4.19`
- `ledger`: `0.0.10`

---
## Core API
- Fixed system setting cache invalidation so writes clear the same cache entries read by `Setting::system()`.
- Fixed platform API token validation after token rotation on file-cache installs.
- Made Redis-only pattern cache clearing skip safely when Redis is unavailable.
- Deferred the database-backed user deletion service until command execution so Composer package discovery no longer requires a live MySQL connection.
- Kept the settings cache regression covered by the full Core API suite.

---
## Fleet-Ops
- Fixed driver verification-code bypass behavior and limited the review bypass to configured non-production review accounts.
- Fixed unknown onboard organization lookups to return `404` instead of a server error.
- Fixed duplicate part SKU and fuel provider transaction IDs to return validation errors instead of database exceptions.
- Restored customer signup with place-backed addresses and maintenance vehicle schedule workflows.
- Fixed sensor creation, driver register-device routes, fuel report creation without location data, geofence driver history lookup, QR debug content, and QR lookup failures.
- Updated Fleet-Ops CI so server, Ember, and Postman workflows run on release branches.

---
## Storefront
- Restored the marketplace backend required by the refactored Storefront App.
- Added paginated marketplace member-store APIs with search, category/tag, online, rating, trending, age, popularity, nearest, and distance filters.
- Added marketplace member locations, categories, products, merchant metadata, reviews, and payment gateway surfaces.
- Hardened carts and checkout across tenant scope, authenticated customer identity, merchant/store ownership, product availability, multi-store policy, currency, and service quote handling.
- Fixed API errors around carts, unknown store locations, malformed Apple identity tokens, missing review subjects, SMS login without Twilio credentials, account closure, phone verification, checked-out carts, and checkout token responses.

---
## Customer Portal
- Fixed dispatcher-created order visibility by authorizing portal orders through tenant-scoped customer UUIDs instead of strict polymorphic type matching.
- Kept other customers, companies, and soft-deleted orders isolated.
- Added regression coverage for portal-created, dispatcher-created, contact, and vendor orders.

---
## Ledger
- Updated Ledger to `0.0.10` with release branch and contract-workflow alignment.
- Fixed unauthenticated Ledger API responses so they return JSON errors instead of HTML pages.
- Fixed public wallet routes that were unreachable by valid credentials.
- Carried forward release-branch Postman contract workflow updates.

---
## Release and CI
- Updated release branch contract workflows so module PRs test the branch API code instead of only the published package.
- Added release-tag automation child updates for Fleet-Ops, Storefront, Ledger, and Customer Portal.
- Kept Postman contract checks aligned with the latest release flow.

---
## Bug Fixes
- Fixed stale Core API system settings after updates.
- Fixed Fleet-Ops verification-code bypass and duplicate-key API errors.
- Fixed Fleet-Ops registration, sensor, fuel report, geofence, QR, and maintenance workflow regressions.
- Fixed Storefront marketplace, checkout, customer verification, cart, review, and identity error paths.
- Fixed Customer Portal order visibility for dispatcher-created orders.
- Fixed Ledger wallet route access and unauthenticated response format.

---
## API Changes
- Core API system setting writes now invalidate direct setting cache keys reliably across cache drivers.
- Fleet-Ops verification bypass behavior is gated by environment, configuration, and designated review accounts.
- Fleet-Ops duplicate part SKU and fuel transaction ID conflicts now return validation responses.
- Storefront marketplace APIs now expose network member stores, marketplace products, merchant metadata, reviews, member locations, categories, and payment gateway data with tenant-safe filtering.
- Storefront checkout now treats authenticated `Customer-Token` identity as authoritative and rejects mismatched customer IDs.
- Customer Portal order access now supports dispatcher-created orders through tenant-scoped customer UUID matching.
- Ledger public wallet routes are reachable with valid credentials and unauthenticated failures return JSON.

---
## Upgrade Steps
```bash
# Pull latest version
git pull origin main --no-rebase
# Update docker
docker compose pull
docker compose down && docker compose up -d
# Run deploy script
docker compose exec application bash -c "./deploy.sh"
```

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
