> "The Orchestrator, The Scheduler & The Mechanic"
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
- **storefront**: v0.4.14
- **ledger**: v0.0.1
- **ember-core**: v0.3.18
- **ember-ui**: v0.3.25
- **fleetbase-cli**: v0.0.6

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)

---

> "The Ledger & The Navigator"
---
## ✨ Highlights
This landmark release introduces two major, transformative features to the Fleetbase ecosystem: the first official version of the **Ledger** accounting extension and the brand new **Smart Navigator** header menu. Additionally, this release includes a powerful new **Template Builder** system and a completely redesigned **Installation Wizard**.

### 💰 Ledger: Accounting, Invoicing & Payments
After months of development, the **Ledger** extension (`v0.0.1`) makes its official debut. This is a full-featured accounting and payments module deeply integrated into Fleetbase, providing a comprehensive suite of tools to manage your organization's finances.

Key features include:
- **Invoicing:** Create, send, and manage professional invoices with customizable templates.
- **Payment Gateways:** Seamlessly integrate with Stripe to accept online payments. The system includes robust webhook handling to automatically update invoice statuses.
- **Revenue & Expense Tracking:** Automatically track revenue from FleetOps orders and Storefront purchases. Manually record expenses to get a complete financial picture.
- **Accounts Receivable:** Keep track of outstanding invoices with an AR aging report.
- **Digital Wallets:** Provide drivers and customers with digital wallets to manage balances and transactions.
- **Financial Reporting:** Generate essential financial reports to monitor your business's health.
- **RBAC Permissions:** A complete set of permissions for controlling access to all Ledger resources.

### 🧭 Smart Navigator: A New Way to Navigate
The main console header has been completely redesigned with the new **Smart Navigator** menu. This intelligent and responsive navigation system streamlines access to all your extensions and most-used features.

Key features include:
- **Intelligent & Responsive:** The menu automatically collapses items into a "More" dropdown as your screen width changes, ensuring a clean and uncluttered interface.
- **Searchable Dropdown:** A powerful, multi-column dropdown allows you to instantly search and access any menu item.
- **Shortcuts:** Extensions can now register "Shortcuts" — prominent, card-style links in the main dropdown that provide one-click access to critical actions like creating a new order or invoice.
- **Pinning & Customization:** Pin your most frequently used extensions and shortcuts to the main header for immediate access.

---
## ✨ New Features

### 🎨 Template Builder System
- **[core-api, ember-ui]** A new visual template builder has been introduced for creating and managing document templates (e.g., for invoices, reports, packing slips).
- **[ember-ui]** The builder features a drag-and-drop canvas, a properties panel for customizing elements, and support for dynamic data via queries.
- **[core-api]** Backend support includes new `Template` and `TemplateQuery` models and a preview endpoint for unsaved templates.

### 🪄 Interactive Installation Wizard
- **[fleetbase, fleetbase-cli]** The `docker-install.sh` script and the `flb install-fleetbase` command are now full-fledged interactive wizards.
- **[fleetbase, fleetbase-cli]** The wizard guides users through configuring core settings, database connections (bundled MySQL or external), mail services (SMTP, Mailgun, SES, etc.), file storage (local, S3, GCS), and other third-party services.

### 🔧 Ember Core & UI Enhancements
- **[ember-core]** The `universe` service now correctly forwards sub-services to the host application, resolving cross-engine service isolation issues.
- **[ember-core]** Implemented more robust session lifecycle events for login/logout handling.
- **[ember-ui]** Added a comprehensive set of status badges for invoices and transactions.

---
## 🐛 Bug Fixes

### FleetOps
- **[fleetops]** Suppressed a false-positive `ember/no-shadow-route-definition` lint error for the top-level `virtual` route using an `eslint-disable` comment. [1]

### Ledger
- **[ledger]** Resolved numerous bugs during the stabilization process, including fixes for invoice number generation, line item calculations, webhook processing, currency handling, and cross-engine service dependencies.

### Ember UI
- **[ember-ui]** Fixed numerous styling, rendering, and interactivity bugs in the new Smart Navigator and Template Builder components.

---
## ⚠️ Breaking Changes
- **[fleetbase]** The primary console virtual route has been moved from `/:slug` to `/~/:slug` to avoid conflicts with extension routes.

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
- **fleetbase**: v0.7.31
- **core-api**: v1.6.38
- **fleetops**: v0.6.38
- **storefront**: v0.4.14
- **ledger**: v0.0.1
- **ember-core**: v0.3.18
- **ember-ui**: v0.3.25
- **fleetbase-cli**: v0.0.6

---
## References
[1] `fleetbase/fleetops` - PR #210: `feature/header-menu-shortcuts`

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
