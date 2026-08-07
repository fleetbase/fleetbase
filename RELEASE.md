> v0.7.53 ~ "CI hardening, full coverage foundations, Fleet-Ops reliability, and Taler refunds"

---
## Highlights
Fleetbase `0.7.53` is a quality and reliability release. It adds root install-smoke, API, Console, and Postman contract CI, expands backend coverage across the core modules, and ships targeted fixes for Fleet-Ops operations, Storefront checkout behavior, Ledger Taler refunds, and shared platform runtime paths.

---
## Component Versions
- `console`: `0.7.53`
- `core-api`: `1.6.55`
- `ai`: `0.0.4`
- `fleetops`: `0.6.59`
- `ledger`: `0.0.9`
- `storefront`: `0.4.18`

---
## Platform CI and Coverage
- Added root-level CI for install-smoke, API tests, Console tests, and coverage reporting.
- Added a live-stack Postman contract workflow that can mint an API key and run the official Fleetbase collections.
- Replaced API stub tests with real host-app coverage for health checks, outbound HTTP logging, users, and event-provider behavior.
- Expanded Console QUnit coverage, fixed lint blockers, and added coverage reporting for the root Console workflow.
- Fixed Docker install smoke issues around release image targets, bundled database privileges, API key minting, Codecov uploads, and package registry resolution.

---
## Core API
- Expanded Core API backend coverage to a full baseline across controllers, requests, resources, reports, templates, files, notifications, auth, metrics/search, settings, middleware, webhooks, services, models, traits, and console commands.
- Improved coverage reporting when Clover omits aggregate class metrics.
- Added broader contract coverage for SMS providers, two-factor auth, scheduling, API credential tracking, resource expansion, report execution, policy behavior, and tenant-scoped helper paths.
- Updated the host API dependency to `fleetbase/core-api` `1.6.55`.

---
## Fleet-Ops
- Expanded Fleet-Ops backend coverage from the high-70% range to a near-complete baseline while cleaning up dead or unreachable branches.
- Fixed production defects found during coverage work, including plain-address place insertion, reverse-geocode validation, empty reverse-geocode results, Lalamove market quotations, missing order config defaults, and service-rate sorting.
- Added a View Label action for individual entities and scoped order, waypoint, and entity label lookup by company.
- Fixed GeoJSON fallback coordinate handling so bare coordinate pairs are read in GeoJSON longitude/latitude order.
- Fixed vehicle vendor filtering, driver device registration without an explicit driver id, and default device `last_position` creation.
- Added coverage for AFAQY transport, Lalamove quotes, service quotes, geofencing, maintenance/work-order imports, order imports, waypoint activity, vendor bridges, tracking, fuel reports, and driver assignment flows.

---
## Ledger and Taler
- Completed the customer-facing GNU Taler refund lifecycle with persistent refund URIs, refund history, public wallet handoff, QR/copy fallback, and refund email delivery.
- Added scheduled and manual Taler refund verification so invoices remain pending until wallet acceptance is confirmed.
- Improved Taler driver support for refund status polling, order-status checks, gateway diagnostics, and credential validation.
- Expanded Ledger backend coverage to a full baseline across gateways, invoices, wallet, payments, refunds, revenue lifecycle, webhooks, listeners, resources, filters, notifications, commands, and routes.
- Added Ledger API contract workflow support and coverage reporting.

---
## AI and Storefront
- Expanded Fleetbase AI backend coverage to a full baseline, including sessions, tasks, attachments, providers, admin endpoints, query execution, capability helpers, and coverage-summary reporting.
- Organized AI backend tests into explicit unit and feature suites and added CI coverage reporting.
- Expanded Storefront backend coverage to a full baseline across checkout, payment initialization, Stripe/QPay flows, customer auth, integrated vendors, food trucks, commerce resources, commands, middleware, requests, and provider integrations.
- Fixed Storefront issues found by coverage around pickup-store resolution, order configuration projection, Twilio-specific errors, dashboard behavior, and Stripe checkout errors.

---
## Bug Fixes
- Fixed Console lint failures that blocked the release workflow before tests and coverage could run.
- Fixed missing Console translation keys used by set-password and common action flows.
- Fixed Fleet-Ops label lookup cross-company leakage.
- Fixed Fleet-Ops vehicle vendor filtering returning no public API results.
- Fixed Fleet-Ops driver device registration and device default position creation returning `500`s.
- Fixed Storefront checkout and Stripe error paths surfaced by backend coverage.
- Fixed Ledger refund reversal and wallet refund state handling for Taler refunds.

---
## API Changes
- Added root API contract workflow support for live-stack Postman collection runs.
- Updated Core API to `1.6.55` and widened backend contract coverage across public, internal, admin, reporting, auth, webhook, search, settings, and file routes.
- Fleet-Ops entity labels now use the existing order label endpoint and enforce company-scoped subject resolution.
- Fleet-Ops GeoJSON fallback coordinate parsing now preserves GeoJSON longitude/latitude order for affected bare-pair inputs.
- Fleet-Ops public vehicle vendor filtering now accepts public/internal vendor identifiers, while internal routes can still resolve vendor UUIDs.
- Fleet-Ops driver device registration can resolve the current driver when no id is supplied, and devices default missing `last_position` to `POINT(0,0)`.
- Ledger adds public Taler refund handoff, refund-history access, refund verification command support, and pending refund state transitions.

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
