> v0.7.46 ~ "Fleet-Ops telematics workspaces, work order categories, service quotes, and shared table polish"
---
## Highlights
Fleetbase `0.7.46` improves Fleet-Ops maintenance, telematics, device management, service quotes, and order creation workflows. This release updates Fleetbase Console `0.7.46`, Fleet-Ops `0.6.54`, Fleet-Ops Data `0.1.39`, and Ember UI `0.3.36`.

---
## Component Versions
- `console`: `0.7.46`
- `fleetops`: `0.6.54`
- `fleetops-data`: `0.1.39`
- `ember-ui`: `0.3.36`

---
## Fleet-Ops Maintenance and Work Orders
- Added first-class work order categories with backend migration support and Fleet-Ops Data model support.
- Updated work order forms, details, resources, seed data, and maintenance trigger processing to understand categories.
- Improved maintenance and work order list behavior with better filtering and resource loading paths.

---
## Telematics and Device Management
- Reworked telematics attachment and device detail workspaces with clearer tabs, better spacing, and richer device event, sensor, and vehicle views.
- Hardened telematics provider sync, attachment filters, sync commands, provider exception handling, and device/sensor/vehicle model behavior.
- Improved telematic device details panels and vehicle attachment workflows for operators working through connectivity screens.
- Optimized operations monitor resource loading so the Fleet-Ops sidebar remains responsive with richer live data.

---
## Orders and Service Quotes
- Added a service quote refresh coordinator and loading state so quote refresh actions are easier to follow.
- Added service quote override extension hooks for package-specific quote behavior.
- Extracted order orchestrator constraints into a dedicated form section.
- Replaced queued order-creation closures with jobs for API and internal order finalization.
- Preserved driver license expiry during driver updates and improved order payload handling.

---
## Shared UI
- Added a sidebar navigator active hook so engines can control active sidebar state more cleanly.
- Added compact table spacing utilities and refined shared resource table actions.
- Improved dropdown and basic table styling used by dense operational screens.
- Added focused coverage for sidebar navigator behavior and tabular resource layout updates.

---
## Bug Fixes
- Fixed Fleet-Ops registry sidebar ordering.
- Fixed telematics device attachment filtering and provider sync edge cases.
- Fixed driver license expiry being dropped during updates.
- Fixed service quote refresh feedback and order form structure issues.
- Fixed spacing and detail-panel issues in telematics device and attachment screens.

---
## API Changes
- Added `category` support to Fleet-Ops work orders and Fleet-Ops Data work order models.
- Added internal device event, sensor, vehicle, fleet, and live controller/filter updates for richer telematics workspaces.
- Added order finalization jobs for API and internal order creation flows.
- Added service quote override extension hooks and refresh coordination support.
- Added shared Ember UI sidebar active-state and compact table utilities.

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
