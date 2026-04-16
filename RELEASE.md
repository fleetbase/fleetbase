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

---

> v0.7.32 ~ "The Orchestrator, The Scheduler & The Mechanic"
---
## ✨ Highlights
This release brings three major new capabilities to the FleetOps extension: the **Orchestrator** — a full multi-phase intelligent dispatch and route optimisation workbench; **Driver Scheduling** — deep integration with the Fleetbase core scheduling framework to manage driver availability, shifts, and recurring schedules; and the **Maintenance Module** — a comprehensive fleet maintenance management system covering work orders, maintenance schedules, equipment, and parts.

### 🧠 Orchestrator: Intelligent Dispatch & Route Optimisation
The **Orchestrator** is a new top-level workbench inside FleetOps that gives dispatchers a single, powerful interface for assigning orders to vehicles and drivers, optimising routes, and committing plans to live orders — all without leaving the console.

Key features include:
- **Multi-Phase Execution:** Compose a sequence of phases — `assign_vehicles`, `assign_drivers`, `optimize_routes`, or the legacy `allocate` mode — and run them in order. Each phase can optionally auto-commit before the next begins.
- **Engine-Agnostic Architecture:** An `OrchestrationEngineInterface` contract with a built-in `GreedyOrchestrationEngine` and a `VroomOrchestrationEngine` for VROOM-compatible solvers. Third-party engines can be registered via the `OrchestrationEngineRegistry`.
- **Plan Viewer:** A rich post-run panel showing per-vehicle route cards with stop sequences, arrival time estimates, a FullCalendar `resourceTimeline` Gantt view, and an interactive Leaflet map with per-vehicle colour-coded OSRM route polylines.
- **Order Pool & Import:** A filterable, searchable order pool with an advanced multi-entity CSV/XLSX import modal. Column mapping, entity resolution, and a live preview table are included.
- **Resource Panel:** A tabbed vehicle/driver selector with live availability indicators, skill badges, and constraint summaries.
- **Orchestrator Constraints:** Per-order time windows (`time_window_start`, `time_window_end`), priority, and required skills. Per-driver max driving time and max distance. Per-vehicle max tasks, available-from/until windows, and capability tags. All constraints are surfaced in the order, driver, and vehicle form and detail views.
- **Commit to Orders:** A `commitPlan` action that creates `Manifest` and `ManifestStop` records, links each order to its manifest via `manifest_uuid`, and assigns the resolved driver and vehicle — all within a single database transaction.
- **Configurable Order Cards:** Dispatchers can choose which fields appear on order cards in the workbench via a company-level settings panel.

### 📅 Driver Scheduling
FleetOps drivers are now fully integrated with the Fleetbase core scheduling framework, enabling structured availability management alongside the Orchestrator's constraint system.

Key features include:
- **Driver Schedule Tab:** A dedicated schedule tab on the driver details panel, powered by a FullCalendar week view, showing all scheduled shifts and exceptions at a glance.
- **Recurring Schedules:** Create recurring availability windows (daily, weekly, custom) with exception support for holidays, leave, and one-off overrides.
- **Shift-Aware Orchestration:** The Orchestrator's `assign_drivers` phase respects driver schedules when matching drivers to vehicles, ensuring assignments only fall within active availability windows.
- **Operations Scheduler:** A new `operations/scheduler` route provides a fleet-wide calendar view of all driver and vehicle schedules, with a `fleet-schedule` sub-view for cross-resource planning.
- **Vehicle Schedules:** Vehicles also expose a schedules tab in their details panel, enabling maintenance blackout windows and availability constraints to feed into the Orchestrator.

### 🔧 Maintenance Module
A complete fleet maintenance management system has been added to FleetOps, covering the full lifecycle from scheduled preventive maintenance through to work order completion and cost tracking.

Key features include:
- **Work Orders:** Create, assign, and track maintenance work orders with status workflows (`pending` → `in_progress` → `completed`), priority levels, assigned technicians, and completion notes. Automatic email dispatch notifications are sent on work order creation.
- **Maintenance Schedules:** Define recurring preventive maintenance schedules tied to vehicles or equipment, with interval-based (`mileage`, `hours`, `days`) and calendar-based triggers. A `ProcessMaintenanceTriggers` console command and a `SendMaintenanceReminders` mailer automate schedule enforcement.
- **Equipment & Parts:** Manage non-vehicle assets (equipment) and a parts inventory with cost tracking, supplier information, and photo support. Both resources support grid and table layout views.
- **Cost Panel:** An invoice-style line-item cost panel on work orders for tracking labour, parts, and miscellaneous expenses with per-currency support.
- **Import Support:** Bulk import for maintenances, maintenance schedules, work orders, and equipment via CSV/XLSX.
- **RBAC Permissions:** A full set of permissions for all maintenance resources, integrated with Fleetbase's dynamic IAM system.
- **Contextual Actions:** Vehicles expose a "Log Maintenance" contextual action and a dedicated maintenance history tab in their details panel.

---
## ✨ New Features

### 🧠 Orchestrator (FleetOps)
- **[fleetops]** New `OrchestrationController` with multi-phase `run` and `commitPlan` endpoints.
- **[fleetops]** `OrchestrationPayloadBuilder` constructs solver payloads from order constraints, driver availability windows, and vehicle capabilities.
- **[fleetops]** `Manifest` and `ManifestStop` models with migrations; `manifest_uuid` foreign key added to the `orders` table.
- **[fleetops]** `OrchestratorWorkbenchComponent` — primary dispatcher UI with resizable left/centre/right panels, phase builder, and map integration.
- **[fleetops]** `Orchestrator::PlanViewer` sub-component with FullCalendar resourceTimeline Gantt, per-vehicle route cards, and OSRM polyline rendering.
- **[fleetops]** `Orchestrator::ResourcePanel` — tabbed vehicle/driver selector with live availability and constraint summaries.
- **[fleetops]** `Orchestrator::OrderPool` — filterable order list with advanced filter row and multi-entity CSV/XLSX import.
- **[fleetops]** `Orchestrator::PhaseBuilder` — drag-and-drop phase composition panel.
- **[fleetops]** Orchestrator constraint fields added to order, driver, and vehicle forms and detail views; all constraint panels default open.
- **[fleetops]** `Order` model: `time_window_start`/`time_window_end` attribute mutators normalise date portion from `scheduled_at` (falling back to `created_at`).

### 📅 Driver & Vehicle Scheduling (FleetOps)
- **[fleetops]** Driver model connected to the Fleetbase core scheduling system via `MorphMany` scheduling relationships.
- **[fleetops]** `driver/schedule` component and route — FullCalendar week view of driver shifts and exceptions.
- **[fleetops]** `operations/scheduler` route with fleet-wide calendar and `fleet-schedule` sub-view.
- **[fleetops]** Vehicle schedules tab exposed in vehicle details panel.

### 🔧 Maintenance Module (FleetOps)
- **[fleetops]** `Maintenance`, `WorkOrder`, `MaintenanceSchedule`, `Equipment` models with full CRUD controllers, API resources, and migrations.
- **[fleetops]** `ProcessMaintenanceTriggers` and `SendMaintenanceReminders` console commands for automated schedule enforcement.
- **[fleetops]** `WorkOrderObserver` triggers email dispatch on work order creation via `WorkOrderDispatched` mailable.
- **[fleetops]** `MaintenanceScheduleReminder` mailable for upcoming maintenance alerts.
- **[fleetops]** Bulk import support for all four maintenance resource types.
- **[fleetops]** Vehicle contextual actions and details tabs for maintenance history.
- **[fleetops]** Invoice-style cost line-item panel on work orders.

---
## 🐛 Bug Fixes

### FleetOps
- **[fleetops]** Fixed driver grouping, multi-stop display, and polyline rendering in the plan viewer.
- **[fleetops]** Fixed vehicle and driver eager-loading in `optimize_routes` and `assign_drivers` phases to remove invalid `location` relation references.
- **[fleetops]** Fixed order import: pickup/dropoff places now persisted to DB and order pool refreshes after import.
- **[fleetops]** Fixed SheetJS XLSX parsing for `.xlsx`/`.xls` file imports.
- **[fleetops]** Fixed `DB::rollBack()` guard — only fires when a transaction is active, preventing misleading "no active transaction" errors.
- **[fleetops]** Fixed `manifest_uuid` missing from `Order::$fillable`, which silently prevented the field being written on commit.

---
## ⚠️ Breaking Changes
- **[fleetops]** The `orders` table has a new `manifest_uuid` column (nullable). Run `php artisan migrate` after upgrading.
- **[fleetops]** New `manifests` and `manifest_stops` tables are required for the Orchestrator commit flow. Run `php artisan migrate` after upgrading.

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
- **fleetbase**: v0.7.32
- **core-api**: v1.6.39
- **fleetops**: v0.6.39
- **ember-ui**: v0.3.26

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
