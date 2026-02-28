# 🚀 Fleetbase v0.7.30 — 2026-02-28

> "Extension discovery, driver vehicle validation, and CLI search"

---

## ✨ Highlights

This release includes two bug fixes and one new feature: a corrected public extension discovery endpoint in the Registry Bridge, a driver vehicle validation patch in FleetOps, and a new `flb search` command in the Fleetbase CLI.

### 🔌 Registry Bridge — Public Extension Discovery

The public extensions listing endpoint (`~registry/v1/extensions`) has been corrected and hardened. A dedicated `PublicRegistryExtension` API resource now sanitizes the response, stripping all sensitive fields before they leave the server. The `install_count` aggregation has been fixed to use `withCount('installs')` and the incorrect `author` relationship has been replaced with the proper `company` relationship. The endpoint returns a clean, flat array.

### 🚛 FleetOps — Driver Vehicle Validation

A `TypeError` that occurred when creating a driver with a vehicle object sent from the frontend has been resolved. A new `ResolvableVehicle` validation rule accepts a `public_id` string (e.g., `vehicle_abc123`), a UUID string, or an object/array containing an `id`, `public_id`, or `uuid` key. Vehicle normalization has been added to both `createRecord()` and `updateRecord()` in `DriverController` so the correct vehicle UUID is always resolved before persistence.

### 🔍 Fleetbase CLI — Extension Search Command

A new `flb search [query]` command (alias: `flb list-extensions`) lets developers and administrators browse all available extensions directly from the terminal. Results are displayed in a formatted, colour-coded table showing the extension name, category, publisher, version, price, and supported install formats. Filtering options include `--category`, `--free`, `--json`, `--simple`, and `--host`.

---

## ✨ New Features

- **[fleetbase-cli]** Added `flb search [query]` command (alias: `flb list-extensions`) for browsing available extensions
- **[fleetbase-cli]** `--category` filter to narrow results by extension category
- **[fleetbase-cli]** `--free` flag to list only free extensions
- **[fleetbase-cli]** `--json` flag for machine-readable JSON output
- **[fleetbase-cli]** `--simple` flag for plain-text terminal output
- **[fleetbase-cli]** `--host` option to target self-hosted registry instances

---

## 🐛 Bug Fixes

### FleetOps
- **[fleetops]** Fixed `TypeError` when creating a driver with a vehicle object sent from the frontend
- **[fleetops]** Added `ResolvableVehicle` validation rule accepting `public_id`, UUID, or object with `id`/`public_id`/`uuid`
- **[fleetops]** Added vehicle normalization in `DriverController::createRecord()` and `updateRecord()`

### Registry Bridge
- **[registry-bridge]** Fixed `install_count` column error by switching to `withCount('installs')` eager load
- **[registry-bridge]** Removed incorrect `author` relationship; replaced with correct `company` relationship
- **[registry-bridge]** Removed sensitive data (internal UUIDs, Stripe IDs, private relationships) from public endpoint response
- **[registry-bridge]** Public extensions endpoint now returns a plain array without a wrapping key

---

## 🔧 Improvements

- **[fleetbase-cli]** Price display correctly converts cents to dollars in search results
- **[fleetbase-cli]** Search results show both install formats: `flb install fleetbase/<slug>` and `flb install <extension_id>`
- **[registry-bridge]** Extension listing response is a clean, flat array for easier consumption by CLI and third-party tools

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

- **fleetops**: v0.6.37
- **registry-bridge**: v0.1.7
- **fleetbase-cli**: v0.0.5

---

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/ember-ui/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
