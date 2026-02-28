# 🚀 Fleetbase v0.7.30 — 2026-02-28

> "Driver validation hardening, public extension discovery, and account lifecycle management improvements"

---

## ✨ Highlights

This release delivers **targeted bug fixes and quality-of-life improvements** across the FleetOps extension, the Registry Bridge, the Fleetbase CLI, and the core internals. The primary focus areas are driver creation reliability, a fully public and sanitized extension discovery API, a new CLI search command for browsing available extensions without authentication, and a more robust account deletion workflow with a 14-day grace period.

### 🚛 FleetOps — Driver Vehicle Validation

A `TypeError` that occurred when creating a driver with a vehicle object (rather than a plain ID string) sent from the frontend has been resolved. A new `ResolvableVehicle` validation rule now accepts a `public_id` string (e.g., `vehicle_abc123`), a UUID string, or an object/array containing an `id`, `public_id`, or `uuid` key. Vehicle normalization has been added to both `createRecord()` and `updateRecord()` in `DriverController` so the correct vehicle UUID is always resolved before persistence.

### 🔌 Registry Bridge — Public Extension Discovery

The public extensions listing endpoint (`~registry/v1/extensions`) has been hardened so that self-hosted users can browse the marketplace without a Fleetbase cloud account or authentication token. A dedicated `PublicRegistryExtension` API resource now sanitizes the response, stripping all sensitive fields (internal UUIDs, Stripe IDs, and private relationships) before they leave the server. The `install_count` aggregation has been corrected to use `withCount('installs')` and the incorrect `author` relationship has been replaced with the proper `company` relationship. The endpoint now returns a clean, flat array.

### 🔍 Fleetbase CLI — Extension Search Command

A new `flb search [query]` command (alias: `flb list-extensions`) allows developers and administrators to browse all publicly available extensions directly from the terminal without any authentication. Results are displayed in a formatted, colour-coded table showing the extension name, category, publisher, version, price, and both supported install formats. Filtering options include `--category`, `--free`, `--json` (machine-readable output), `--simple` (plain text), and `--host` (for self-hosted registries).

### 🗓️ Internals — Account Deletion Lifecycle

The account deletion grace period has been extended from 7 days to **14 days**, giving users more time to reactivate before their data is permanently removed. The `PurgeSuspendedOrganizations` command has been corrected to target only `canceled` subscriptions, preventing accidental deletion of `past_due` accounts that may still recover. The `WarnSuspendedOrganizations` command now automatically clears any scheduled deletion date when an account is reactivated, and a `deletion_warning` case has been added to the `TestEmails` artisan command for easier QA. Email templates for deletion warnings have been updated to use branded components and a professional tone.

---

## ✨ New Features

### CLI
- **[fleetbase-cli]** Added `flb search [query]` command (alias: `flb list-extensions`) to browse available extensions without authentication
- **[fleetbase-cli]** `--category` filter to narrow search results by extension category
- **[fleetbase-cli]** `--free` flag to list only free extensions
- **[fleetbase-cli]** `--json` flag for machine-readable JSON output
- **[fleetbase-cli]** `--simple` flag for plain-text terminal output
- **[fleetbase-cli]** `--host` option to target self-hosted registry instances

### Registry
- **[registry-bridge]** `PublicRegistryExtension` API resource for sanitized public extension responses
- **[registry-bridge]** Public extensions endpoint now accessible without authentication for self-hosted users

---

## 🐛 Bug Fixes

### FleetOps
- **[fleetops]** Fixed `TypeError` when creating a driver with a vehicle object sent from the frontend
- **[fleetops]** Added `ResolvableVehicle` validation rule accepting `public_id`, UUID, or object with `id`/`public_id`/`uuid`
- **[fleetops]** Added vehicle normalization in `DriverController::createRecord()` and `updateRecord()`

### Registry Bridge
- **[registry-bridge]** Fixed `install_count` column error by switching to `withCount('installs')` eager load
- **[registry-bridge]** Removed incorrect `author` relationship; replaced with correct `company` relationship
- **[registry-bridge]** Removed all sensitive data (internal UUIDs, Stripe IDs, private relationships) from public endpoint response
- **[registry-bridge]** Public extensions endpoint now returns a plain array without a wrapping key

### Internals
- **[internals]** Extended account deletion grace period from 7 days to 14 days
- **[internals]** `PurgeSuspendedOrganizations` now only deletes organizations with `canceled` subscriptions (not `past_due`)
- **[internals]** `WarnSuspendedOrganizations` now auto-clears scheduled deletion date when an account is reactivated
- **[internals]** Added `deletion_warning` case to `TestEmails` artisan command
- **[internals]** Updated deletion warning email templates to use branded components

---

## 🔧 Improvements

- **[fleetbase-cli]** Price display now correctly converts cents to dollars in search results
- **[fleetbase-cli]** Search results show both install formats: `flb install fleetbase/<slug>` and `flb install <extension_id>`
- **[fleetbase-cli]** Updated README with full `flb search` command documentation and examples
- **[registry-bridge]** Extension listing response is now a clean, flat array for easier consumption by CLI and third-party tools

---

## ⚠️ Breaking Changes

- None 🙂

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

## 📦 Component Versions

- **core-api**: v1.6.36
- **fleetops**: v0.6.37
- **registry-bridge**: v0.1.7
- **internals**: v0.0.28
- **fleetbase-cli**: v0.0.5

---

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/ember-ui/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
