> v0.7.59 ~ "Trailer operations, safer authorization, and shared UI foundations"

---
## Highlights
Fleetbase `0.7.59` introduces first-class Trailer operations in Fleet-Ops, refreshes Fleet-Ops Data for trailer and inspection workflows, improves shared Ember UI tab behavior, and tightens Core API user authorization loading.

---
## Component Versions
- `console`: `0.7.59`
- `core-api`: `1.6.61`
- `fleetops`: `0.6.65`
- `fleetops-data`: `0.2.0`
- `ember-ui`: `0.4.0`

---
## Fleet-Ops
- Added first-class Trailer management and operational detail surfaces.
- Added Trailer attachment workflows across vehicles, devices, equipment, maintenance, orders, and live maps.
- Added internal and public Trailer API coverage with coordinated Postman contract coverage.
- Improved driver, vehicle, trailer, vendor, contact, and customer cards, grid views, filters, and placeholders.
- Hardened device installation behavior so installed devices cannot be moved without detaching first.
- Fixed Trailer navigation, payload integration, spatial tracking, and API contract guards.

---
## Fleet-Ops Data
- Added Trailer, asset connection, attachable trailer, and maintenance subject trailer models and serializers.
- Added inspection form, inspection submission, and inspection item result models and serializers.
- Added waypoint and relation-loading utilities for shared Fleet-Ops consumers.
- Fixed serializer behavior for drivers, entities, service rates, payloads, orders, and vehicles.
- Added coverage infrastructure and a reachable-addon coverage gate.

---
## Core API
- Improved batched user authorization loading so accessors respect eager-loaded company membership data.
- Fixed company-scoped authorization behavior for users with cached or missing company memberships.
- Enabled Core API CI and Postman checks for `release/v*` branches.

---
## Ember UI
- Fixed TabNavigation overflow behavior for route-backed tabs that do not define explicit IDs.
- Route tabs now fall back from `id` to `route` to `key`, keeping More-menu tabs, active state, and keyboard navigation consistent.
- Completed Ember UI release-branch CI, release creation, npm publishing permissions, and action upgrades for `release/v*` branches.

---
## Console and API Packages
- Bumped the root Docker image version to `0.7.59`.
- Bumped Console to `0.7.59`.
- Updated API dependencies for `fleetbase/core-api` `^1.6.61` and `fleetbase/fleetops-api` `^0.6.65`.
- Updated Console dependencies for `@fleetbase/ember-ui` `^0.4.0`, `@fleetbase/fleetops-data` `^0.2.0`, and `@fleetbase/fleetops-engine` `^0.6.65`.
- Updated package submodules to their released tags.

---
## Bug Fixes
- Fixed nested and related Trailer operations across Fleet-Ops navigation, payload display, spatial tracking, and device and equipment attachments.
- Fixed Core API authorization accessors using stale or incorrectly scoped company membership data.
- Fixed Ember UI overflow tab identity for route-only tabs.

---
## API Changes
- Fleet-Ops adds first-class Trailer API and resource support with related public and internal contract coverage.
- Fleet-Ops Data adds Trailer and inspection model contracts for shared Console consumers.
- Core API user authorization resources and controllers now batch and scope company membership access more safely.

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
