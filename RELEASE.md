> v0.7.42 ~ "Customer APIs, multi-zone pricing, CLI installation, and operations hardening"
---
## ✨ Highlights
This release updates Fleetbase Console `0.7.42`, FleetOps `0.6.50`, FleetOps Data `0.1.34`, Core API `1.6.49`, and Ember UI `0.3.32`. It adds a public FleetOps customer API for customer portals, first-class public order config discovery, multi-zone distance service-rate pricing, safer driver and vehicle availability defaults, hardened live-map viewport loading, and a new CLI-driven installation flow that replaces the old web-based installer with a not-configured landing page.

---
## 📦 Component Versions
- `console`: `0.7.42`
- `fleetops`: `0.6.50`
- `fleetops-data`: `0.1.34`
- `ember-ui`: `0.3.32`
- `core-api`: `1.6.49`

---
## 🚚 FleetOps
### Public customer API and order config discovery
- Added a B2C FleetOps customer API under `/v1/customers/*` so customer portals can use a Fleetbase API credential directly, without Storefront publishable-key or Store/Network coupling.
- Added public customer signup, verification-code, login, SMS login, password reset, logout, device registration, profile, saved-place, customer-order listing, customer-order create, and customer-order detail flows.
- Added `Customer-Token` authentication backed by Sanctum personal access tokens, with company checks against the API credential session so tokens cannot cross company boundaries.
- Added a FleetOps `Customer` contact specialization and customer auth helper for company-preferred token resolution.
- Kept the API boundary canonical: customer place payloads use the standard Place shape, customer order creation mirrors the normal FleetOps order shape, and customer-created orders force `customer_uuid` from the token.
- Added optional `service_quote` consumption on customer order creation so customer portals can submit selected quotes and lock purchase rates onto the resulting order.
- Added public read-only `/v1/order-configs` and `/v1/order-configs/{id}` endpoints with a public-safe `OrderConfig` resource exposing activity flow metadata for portals, drivers, and integrations.
- Added a `company` object to customer responses with public-safe company details and canonical transaction currency resolution.

### Multi-zone distance service rates
- Added a generic `multi_zone_distance` service-rate calculation method for routes that cross multiple priced zones or service areas.
- Added geographic pricing rule metadata on service-rate fees, including service area or zone references, labels, priority, and fallback behavior.
- Priced route distance by sampling route legs against configured zone/service-area polygons and returning per-zone quote line items.
- Added FleetOps service-rate form and detail UI support for configuring and reviewing multi-zone distance fees.
- Fixed preliminary quote currency filtering so service quotes respect the submitted currency.

### Operations workflow hardening
- Hardened live-map viewport loading with SRID-safe coordinate predicates, validated viewport bounds, normalized bounds cache keys, result caps, debounced frontend reloads, and an explicit live-map resource limit.
- Defaulted driver and vehicle availability to `available` across backend creation, frontend forms, dispatch/orchestrator lookups, seeders, and existing null or legacy `active` records.
- Added order form required-field indicators backed by create-order validation, and updated multi-waypoint route rows to use RouteList-style markers.
- Added driver assign/unassign quick actions from order rows and order details.
- Improved multi-stop order activity flow behavior, activity-flow horizontal scrolling, order config flow normalization/rendering, route/tracking display, and order ETA gating by tracking lifecycle.
- Fixed FleetOps order file/document handling, label rendering, vehicle assignment behavior, service area map context menus, and a broken `vehicle/pill` translation key.
- Added customer contact user identity conflict handling and an audit command to surface customer/user type mismatches.

---
## 🧩 FleetOps Data
- Added model and serializer support for multi-zone distance service-rate rules.
- Added service-rate-fee fields for zone/service-area references, labels, priority, fallback configuration, and embedded rule preservation.
- Added service-rate helpers for detecting multi-zone distance rates, sorting rules, and creating default rules.
- Defaulted FleetOps Data driver and vehicle model statuses to `available` so frontend data defaults match FleetOps backend behavior.

---
## 🧱 Core API and Console
### CLI-driven installation flow
- Removed the old web-based installer execution flow from Console and replaced it with a passive not-configured landing page that points operators to the local and cloud install docs.
- Added a shared Console installation service that detects `fleetbase_not_configured` API responses, redirects to `/install`, checks onboarding state through `onboard/should-onboard`, and returns configured installs to onboarding or login.
- Added install-completion socket listening on the `fleetbase.install` channel so open install pages refresh after CLI/container setup finishes.
- Added the Core API `fleetbase:notify-installed` command and wired `api/deploy.sh` to broadcast install completion after migrations, caches, and registry initialization.
- Removed internal web installer controller routes and shifted configuration guarding into Core API middleware for the new installer method.

### Platform and integrations
- Updated the CallPro.mn SMS integration to the new API base URL and refreshed SMS handling coverage.
- Updated deployment workflows to install the latest pnpm action version during release builds.

---
## 🧪 Tests and Coverage
- Added FleetOps static-shape coverage for customer endpoints, customer order canonical fields, customer portal alias prevention, and public order config resources.
- Added FleetOps coverage for live-map viewport bounds, driver/vehicle status defaults, order form required indicators, and multi-zone service-rate behavior.
- Added FleetOps Data unit coverage for multi-zone rule sorting and default rule creation.
- Added Core API unit coverage for the updated CallPro SMS service.
- Added Console unit coverage for the installation service, application route error handling, login/onboarding redirects, and install route behavior.

---
## 🐛 Bug Fixes
- Fixed customer signup verification failures caused by unsaved verification subjects and guarded User fields.
- Fixed customer signup/login idempotency, password mutator usage, and reset-password double hashing.
- Fixed customer order creation so client-supplied dispatch, driver, vehicle, facilitator, and customer fields cannot override the authenticated customer context.
- Fixed multi-zone fee persistence, embedded fee refresh after edit, duplicate fee serialization, geography inference, and quote breakdown labels.
- Fixed live-map database errors and inefficient loading caused by envelope-based viewport filtering.
- Fixed driver and vehicle records defaulting to legacy `active` or null statuses instead of the dispatch-ready `available` status.
- Fixed order config flow serialization and frontend rendering drift.
- Fixed install boot behavior so an unconfigured instance no longer attempts web-based install actions from the browser.

---
## 🔌 API Changes
- Added `POST /v1/customers/request-creation-code`.
- Added `POST /v1/customers`, `POST /v1/customers/login`, `POST /v1/customers/login-with-sms`, `POST /v1/customers/verify-code`, `POST /v1/customers/forgot-password`, and `POST /v1/customers/reset-password`.
- Added customer-token protected `GET/PUT /v1/customers/me`, `POST /v1/customers/logout`, `POST /v1/customers/logout-all`, `GET /v1/customers/places`, `GET/POST /v1/customers/orders`, `GET /v1/customers/orders/{id}`, and `POST /v1/customers/register-device`.
- Added public read-only `GET /v1/order-configs` and `GET /v1/order-configs/{id}`.
- Added Core API middleware behavior for unconfigured instances using the `fleetbase_not_configured` error code.
- Removed the internal browser-driven installer API surface in favor of CLI/container installation and the install-completion notification command.

---
## 🔧 Upgrade Steps
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
