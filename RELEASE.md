> v0.7.47 ~ "Fleet-Ops device inventory, telematics parity, attachable data models, and dashboard slots"
---
## Highlights
Fleetbase `0.7.47` improves Fleet-Ops connectivity workflows, device inventory screens, compact identity displays, shared navigation, and dashboard extension points. This release updates Fleet-Ops `0.6.55`, Fleet-Ops Data `0.1.40`, Ember UI `0.3.37`, and Ember Core `0.3.23`.

---
## Component Versions
- `fleetops`: `0.6.55`
- `fleetops-data`: `0.1.40`
- `ember-ui`: `0.3.37`
- `ember-core`: `0.3.23`

---
## Fleet-Ops Connectivity and Device Inventory
- Added native telematics provider parity improvements across Fleet-Ops provider, device, sensor, event, and vehicle workflows.
- Improved connectivity device inventory screens with richer identity cells, attached-vehicle display, device action handling, and detail-panel tabs.
- Improved Fleet-Ops drawer search workflows for drivers, vehicles, device events, positions, and related operational resources.
- Refined compact identity indicators for vehicles, drivers, devices, equipment, parts, telematics devices, and providers.
- Fixed Fleet-Ops sidebar initial route sync and registry sidebar ordering behavior.

---
## Attachable Device Data
- Added Fleet-Ops Data models for attachable devices, attachable assets, and attachable vehicles.
- Expanded device and device-event models so device inventory screens can represent richer attachable context.
- Added device serializer support and regression coverage for attachable device payloads.

---
## Shared UI and Dashboard Slots
- Added Ember Core dashboard slot registration APIs for engines that need to contribute dashboard content.
- Enhanced Ember UI sidebar navigation, badges, tab navigation, dashboard panels, and dashboard service behavior.
- Added shared resource identity table cells with documented image sizing and focused test coverage.
- Improved dropdown table-cell behavior used by dense operational lists.

---
## Bug Fixes
- Fixed service-rate route handling in Fleet-Ops.
- Fixed Fleet-Ops sidebar initial route synchronization.
- Fixed drawer dropdown positioning and search behavior in map and operations surfaces.
- Fixed shared UI badge, tab navigation, sidebar navigator, dashboard widget panel, and resource identity regressions.
- Fixed linter issues in the updated shared UI components.

---
## API Changes
- Added Ember Core dashboard slot registration services.
- Added Fleet-Ops Data attachable device model and serializer support.
- Added Fleet-Ops action/service updates for device, vehicle, equipment, sensor, vendor, and service-rate workflows.
- Added shared Ember UI resource identity cell APIs and navigation/badge improvements.

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
