> v0.7.40 ~ "Tracking intelligence, orchestrator capacity allocation, and customer repairs"
---
## ✨ Highlights
This release focuses on FleetOps `0.6.48`. It introduces provider-neutral order tracking intelligence, expands the FleetOps orchestrator with consumable API endpoints and capacity-only allocation, and repairs the customer contact/user type invariant so FleetOps customers stay consistent across existing and newly saved records.

---
## 📦 Component Versions
- `fleetops`: `0.6.48`
- `core-api`: `1.6.47`

---
## 🚚 FleetOps
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
- Added a native FleetOps `capacity` allocation engine for deterministic capacity-only assignment without routing.
- Added a VROOM orchestration seeder with located and locationless vehicles, capacity data, order dimensions, weights, pallets, parcels, and seeded metadata for repeatable testing.
- Added orchestrator UI controls for allocation strategy and lightweight vehicle/driver position indicators that use the existing model coordinate validity helpers.

### Customer contact/user invariant
- Enforced the FleetOps customer invariant so contacts saved as `customer` keep the linked user type aligned as `customer`.
- Prevented existing FleetOps customer contacts from being changed away from `customer` through the internal contact save flow.
- Added an idempotent repair migration for historical customer contacts using strong Fleet-Ops Customer role hints as repair evidence.

---
## 🧪 Tests and Coverage
- Added backend coverage for orchestrator consumable run/commit responses and public-ID serialization.
- Added VROOM payload tests for route-task semantics, capacity-only request generation, assignment mapping, and unassigned order handling.
- Added native capacity allocation tests for weight, volume, pallets, parcels, skills, task limits, and workload balancing behavior.
- Added tracking intelligence tests, live order query tests, driver ping endpoint tests, and frontend tracking component coverage.

---
## 🐛 Bug Fixes
- Fixed order tracking architecture limitations that made OSRM the only first-class tracking provider.
- Fixed active live order metric behavior and moved driver ping behavior to the internal API surface.
- Fixed route summary stop count and tracking progress rail display issues.
- Fixed purchase-rate component lint issues from the tracking release train.
- Fixed customer contacts that could be saved as FleetOps customers while their linked users remained generic users or contacts.
- Fixed orchestrator VROOM behavior for Fleetbase payloads with pickup/dropoff only, waypoint-only routes, mixed route payloads, missing coordinates, and capacity-only allocation without vehicle positions.

---
## 🔌 API Changes
- Added `POST /v1/orchestrator/run` for consumable orchestration execution.
- Added `POST /v1/orchestrator/commit` for committing public-ID orchestrator assignments.
- Added internal tracking settings endpoints for tracking provider configuration.
- Added internal driver ping API handling for live order tracking workflows.

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
