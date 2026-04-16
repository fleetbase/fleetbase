> v0.7.33 ~ "Orchestrator Capacity Corrections & Currency Fix"
---
## ✨ Highlights
This is a focused correctness release addressing critical naming inconsistencies and redundant columns introduced with the Orchestrator in v0.7.32, alongside a bug fix in the core API for currency code resolution that affected 10 territories.

---
## 🐛 Bug Fixes

### Core API
- **[core-api]** Fixed `getCurrencyFromCountryCode()` returning an array instead of a `?string` for 10 territories (BQ, CC, CX, GP, GF, MQ, YT, RE, SJ, TK) where the PragmaRX Countries package returns currencies as an associative map (`{"USD": {...}}`) rather than a sequential list (`["USD"]`). Introduced `Utils::resolveCurrencyCode()` which normalises both shapes — sequential list via `Arr::first()`, associative map via `array_key_first()`. Also guards `strtolower()` comparisons in `getCountryCodeByCurrency()` with `is_string()` to prevent `mb_strtolower(null)` deprecation warnings. ([core-api#201](https://github.com/fleetbase/core-api/pull/201))

### FleetOps — Orchestrator Capacity Columns
- **[fleetops]** Removed redundant `capacity_weight_kg` column from the `vehicles` table — this was a duplicate of the pre-existing `payload_capacity` column. `OrchestrationPayloadBuilder` now reads `payload_capacity` directly. ([fleetops#225](https://github.com/fleetbase/fleetops/pull/225))
- **[fleetops]** Renamed non-standard vehicle capacity columns to follow the Fleetbase `payload_capacity_*` naming convention: `capacity_volume_m3` → `payload_capacity_volume`, `capacity_pallets` → `payload_capacity_pallets`, `capacity_parcels` → `payload_capacity_parcels`. ([fleetops#225](https://github.com/fleetbase/fleetops/pull/225))
- **[fleetops]** Removed all four redundant capacity cache columns from the `payloads` table (`capacity_weight_kg`, `capacity_volume_m3`, `capacity_pallets`, `capacity_parcels`). These values are now computed dynamically from payload entities by `OrchestrationPayloadBuilder` with full unit normalisation (kg, g, lb, oz, t; m, cm, mm, in, ft), eliminating the risk of stale denormalised data. ([fleetops#225](https://github.com/fleetbase/fleetops/pull/225))
- **[fleetops]** `VehicleController` (`Api/v1`) `create` and `update` whitelists now accept all orchestrator capacity and constraint fields: `payload_capacity`, `payload_capacity_volume`, `payload_capacity_pallets`, `payload_capacity_parcels`, `skills`, `max_tasks`, `time_window_start`, `time_window_end`, `return_to_depot`. ([fleetops#225](https://github.com/fleetbase/fleetops/pull/225))
- **[fleetops]** `OrderController` (`Api/v1`) `create` and `update` whitelists now accept orchestrator constraint fields: `time_window_start`, `time_window_end`, `required_skills`, `orchestrator_priority`. ([fleetops#225](https://github.com/fleetbase/fleetops/pull/225))
- **[fleetops]** Vehicle form and details UI updated: `payload_capacity_volume`, `payload_capacity_pallets`, and `payload_capacity_parcels` are now editable in the **Capacity & Dimensions** sub-section of Technical Specifications and displayed in the same section in the details view (not in the Orchestrator Constraints panel, as these are general vehicle specification fields). ([fleetops#225](https://github.com/fleetbase/fleetops/pull/225))

### FleetOps Data — Ember Data Models
- **[fleetops-data]** `Vehicle` model: added `payload_capacity_volume`, `payload_capacity_pallets`, `payload_capacity_parcels` attributes (following `payload_capacity_*` convention) and orchestrator constraint attributes `skills`, `max_tasks`, `time_window_start`, `time_window_end`, `return_to_depot`. ([fleetops-data#47](https://github.com/fleetbase/fleetops-data/pull/47))
- **[fleetops-data]** `Order` model: added orchestrator constraint attributes `time_window_start`, `time_window_end`, `required_skills`, `orchestrator_priority`. ([fleetops-data#47](https://github.com/fleetbase/fleetops-data/pull/47))

---
## ⚠️ Breaking Changes / Migration Notes
- **[fleetops]** Two new corrective migrations must be run on instances that have already applied the v0.7.32 migrations:
  - `2026_04_14_000001` — drops the four redundant capacity columns from the `payloads` table.
  - `2026_04_14_000002` — renames the three vehicle capacity columns to the `payload_capacity_*` convention and drops the redundant `capacity_weight_kg` column.
  - Run `php artisan migrate` after upgrading.
- **[core-api]** No schema changes. The currency fix is a pure PHP logic change with no migration required.

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
- **fleetbase**: v0.7.33
- **core-api**: v1.6.40
- **fleetops**: v0.6.40
- **fleetops-data**: v0.1.28
- **ember-ui**: v0.3.26

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)