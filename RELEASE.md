> v0.7.41 ~ "Live operations intelligence, dashboard reliability, and orchestrator allocation control"
---
## ✨ Highlights
This release focuses on FleetOps `0.6.49` and Ember UI `0.3.30`. It adds a new FleetOps dashboard widget suite backed by metric and analytics endpoints, sharpens live operations visibility with richer map context, operational alerts, and native telematics providers, expands orchestrator capacity-only allocation with vehicle packing controls, and hardens dashboard widget management so system dashboards, GridStack layouts, and default widgets behave reliably.

---
## 📦 Component Versions
- `fleetops`: `0.6.49`
- `ember-ui`: `0.3.30`
- `core-api`: `1.6.47`

---
## 🚚 FleetOps
### FleetOps dashboard widgets
- Added a new FleetOps dashboard widget suite with individual KPI tiles, analytics panels, and a live fleet map widget.
- Added KPI tile widgets for Earnings, Average Order Value, Distance Travelled, Active Orders, Drivers Online, and Open Issues, all backed by per-slug metric endpoints.
- Added analytics widgets for Operations Pulse, Revenue Trend, Order Volume by Status, On-Time Delivery, Top Drivers, Fuel Cost & Efficiency, Issues Insights, Maintenance Overview, and Geofence Violations.
- Added the Live Fleet Map widget for real-time driver positions and active route visibility directly on dashboards.
- Kept the legacy Fleet-Ops Metrics widget registered for one release as `Fleet-Ops Metrics (Legacy)` while the new individual KPI widgets supersede it.
- Added reusable `Widget::KpiTile` presentation and widget export shims so FleetOps widgets can be registered, discovered, and rendered through the shared dashboard picker.

### Live map, alerts, and telematics
- Enriched live-map vehicle and driver context across Leaflet and Google map renderers with readable popovers for status, assigned driver, active order reference, coordinates, speed, heading, and contact details.
- Added shared live-map card content utilities so Google and Leaflet renderers use a consistent display model.
- Added company tracking-alert settings for late departures, route deviations, and prolonged stoppages.
- Added the scheduled `fleetops:process-operational-alerts` command plus notification classes for late departure, route deviation, and prolonged stoppage alerts.
- Persisted driver license expiry and exposed it in FleetOps driver forms, driver detail views, and API resources.
- Added native AFAQY and Safee Tracking telematics providers to FleetOps provider discovery and configuration.
- Added explicit testing seeders for connectivity, fleet, maintenance, network, and order fixtures under `server/seeders/Testing` so realistic FleetOps demo data stays opt-in.

### Order tracking intelligence
- Replaced the old monolithic `OrderTracker` internals with a provider-neutral tracking intelligence layer.
- Added the new tracking provider domain with context builders, provider registry/manager, provider capabilities, tracking options, normalized result DTOs, and tracking stop DTOs.
- Added built-in `google_routes`, `osrm`, and `calculated` tracking providers so FleetOps can support route-aware providers without hard-coding OSRM as the only path.
- Added company-level tracking settings and internal endpoints for reading and saving tracking provider configuration.
- Updated order details, route lists, overlays, lookup views, progress cards, and tracking UI components to consume the canonical nested `tracker_data` shape.
- Added a reusable tracking stop progress component and duration formatting helper for clearer order progress display.
- Added live order query and active live order metric improvements, including a dedicated driver ping internal API path.

### Orchestrator consumable API and capacity allocation
- Added consumable API endpoints for orchestrator run and commit flows:
  - `POST /v1/orchestrator/run`
  - `POST /v1/orchestrator/commit`
- Kept VROOM configuration settings-driven while exposing public API responses that use public IDs instead of internal UUIDs or database IDs.
- Refactored VROOM payload generation around Fleetbase route semantics so pickup/dropoff, waypoint-only, and mixed route orders stay atomic during optimization.
- Added VROOM capacity-only allocation for users who want vehicle allocation by capacity, skills, task limits, and workload constraints without requiring vehicle locations.
- Added VROOM vehicle packing controls for capacity-only allocation so dispatchers can minimize vehicles by default, use balanced assignment, or disable the packing bias.
- Added fixed vehicle costs to capacity-only VROOM payloads when minimizing vehicles so VROOM prefers filling feasible vehicles before opening another vehicle.
- Added a native FleetOps `capacity` allocation engine for deterministic capacity-only assignment without routing.
- Moved the VROOM orchestration seeder under `server/seeders/Testing` with an explicit run command so deploy-time seeding does not auto-discover test data.
- Added orchestrator UI controls for allocation strategy and lightweight vehicle/driver position indicators that use the existing model coordinate validity helpers.
- Passed the full order resource into `fleet-ops:component:order:form` registry components as both `@order` and `@resource`, restoring extension access to the current order model in custom form sections.

### Customer contact/user invariant
- Enforced the FleetOps customer invariant so contacts saved as `customer` keep the linked user type aligned as `customer`.
- Prevented existing FleetOps customer contacts from being changed away from `customer` through the internal contact save flow.
- Added an idempotent repair migration for historical customer contacts using strong Fleet-Ops Customer role hints as repair evidence.

---
## 🧪 Tests and Coverage
- Added backend coverage for orchestrator consumable run/commit responses and public-ID serialization.
- Added VROOM payload tests for route-task semantics, capacity-only request generation, vehicle packing fixed-cost behavior, assignment mapping, and unassigned order handling.
- Added native capacity allocation tests for weight, volume, pallets, parcels, skills, task limits, and workload balancing behavior.
- Added tracking intelligence tests, live order query tests, driver ping endpoint tests, and frontend tracking component coverage.
- Added FleetOps integration coverage for enriched fleet listing/live-map display behavior.
- Added backend coverage for FleetOps analytics routes and metric registry resolution.
- Added frontend coverage for the reusable KPI tile widget loading, value, delta, and error states.
- Added Ember UI dashboard service and widget-panel tests covering default widget identity, widget grouping, search, recommended filtering, and repeated widget badges.

---
## 🧩 Ember UI
### Dashboard widget picker and GridStack reliability
- Reworked the dashboard widget picker into a compact overlay with sticky controls, All/Recommended/On Dashboard tabs, category grouping, search across name, description, and category, and reusable fixed-height `Dashboard::WidgetCard` cards.
- Fixed dashboard widget identity-map collisions by storing registry slugs in `options.widget_key` instead of using them as Ember Data record IDs.
- Locked edit/add/delete affordances on virtual system dashboards and replaced them with a create-to-customize hint to avoid backend 404s.
- Remounted GridStack when switching dashboards so stale inline height and min-height styles do not leave empty bands between dashboards.
- Compacted GridStack after widget removal so surrounding widgets fill the deleted widget's space.
- Updated Ember UI CI to Node `22.x`, refreshed pnpm handling, and bumped `@fleetbase/ember-ui` to `0.3.30`.

---
## 🐛 Bug Fixes
- Fixed order tracking architecture limitations that made OSRM the only first-class tracking provider.
- Fixed active live order metric behavior and moved driver ping behavior to the internal API surface.
- Fixed route summary stop count and tracking progress rail display issues.
- Fixed purchase-rate component lint issues from the tracking release train.
- Fixed live-map vehicle and driver hover content that blurred online connectivity, operational status, active order, and movement details together.
- Fixed tracking alert repeat behavior by storing per-order notification markers under `order.meta.operational_alerts`.
- Fixed extension form registry components receiving an undefined or stale order argument in the order form.
- Fixed customer contacts that could be saved as FleetOps customers while their linked users remained generic users or contacts.
- Fixed orchestrator VROOM behavior for Fleetbase payloads with pickup/dropoff only, waypoint-only routes, mixed route payloads, missing coordinates, and capacity-only allocation without vehicle positions.
- Fixed VROOM capacity-only allocation spreading work across too many vehicles by adding an explicit vehicle packing bias.
- Fixed dashboard widget picker usability, default widget duplication crashes, system dashboard edit actions, dashboard-switch layout residue, and widget removal gaps.

---
## 🔌 API Changes
- Added `POST /v1/orchestrator/run` for consumable orchestration execution.
- Added `POST /v1/orchestrator/commit` for committing public-ID orchestrator assignments.
- Added internal tracking settings endpoints for tracking provider configuration.
- Added internal driver ping API handling for live order tracking workflows.
- Added `GET /fleet-ops/metrics/{slug}` for individual dashboard KPI tile metrics with period, comparison, and sparkline support.
- Added internal FleetOps analytics endpoints for operations pulse, revenue trend, orders by status, on-time delivery, top drivers, fuel efficiency, issues insights, maintenance overview, geofence violations, and live fleet widgets.
- Added internal settings support for operational tracking-alert configuration.
- Added `drivers.license_expiry` persistence and resource serialization.
- Extended live driver and vehicle index resources with richer map metadata, including current order reference and movement labels.

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
