> v0.7.60 ~ "Inspections, Radar, and resource identity across the console"

---
## Highlights
Fleetbase `0.7.60` brings a full inspection platform to Fleet-Ops, replaces the Resources Hub with the Radar triage list, and adopts the shared Ember UI resource identity system so every related record renders as a consistent pill, identity cell, hover summary or select option. Core API gives custom fields a public id and alerts a real snooze and owner, and Console auth flows and build performance are hardened.

---
## Component Versions
- `console`: `0.7.60`
- `core-api`: `1.6.62`
- `fleetops`: `0.6.66`
- `fleetops-data`: `0.2.1`
- `ember-ui`: `0.4.1`

---
## Fleet-Ops
- Added inspection forms built from typed field groups (pass/fail checks with severity, text, numbers, selections, dates, photos and signatures) with a console form builder.
- Added one inspection sheet for filling in, reviewing and public links, usable on phones and tablets, with a defects tray for failed checks.
- Added the driver-facing `v1` inspections API for listing published forms, filing inspections and reading submissions and vehicle history.
- Added inspection links assignable to any user, protected by a six-digit PIN and sent by email or SMS; failed inspections can raise an issue and open a work order.
- Issues and work orders now link back to the inspection that raised them.
- Replaced the Resources Hub with Radar: a triage list of gaps across resources, maintenance, inspections, staffing, compliance, fuel and parts, with a morning brief, a 24-hour/7-day agenda, handover cards, saved views, bulk actions and keyboard shortcuts.
- Adopted the Ember UI resource identity system across tables, details, pickers and filters, with descriptors for every Fleet-Ops Data model.
- Fixed place, zone and service area details and the place and point map modals failing to render on the map tile layer.
- Fixed device, sensor and telematic filter options rendering as `[object Object]` and not filtering.
- Fixed driver current-shift detection, inconsistent part low-stock rules, and inspection schedules producing preventive maintenance work orders.

---
## Fleet-Ops Data
- Inspection form and submission display dates are formatted as `yyyy-MM-dd HH:mm`, and the unused `frequency` attribute is removed from inspection forms.
- Fixed fuel integration credentials not persisting after a successful connection test, and registered the sync-run model and serializer for sync history.
- Fixed work order, maintenance and maintenance schedule polymorphic serialization asserting on save, and cleared relationships now reach the server.

---
## Core API
- Custom fields now have a prefixed public id, backfilled by migration and minted on every creation path.
- Alerts gain real snooze, assignment and planned-time columns with `unsnooze()`, `assignTo()`, `snoozed()` and `active()` support; acknowledging an alert now sets its status.
- Observer refusals thrown as validation exceptions now reach the caller on update and bulk delete instead of a generic error.

---
## Ember UI
- Added the resource descriptor registry, shared across the host and engines, with `resource-type`, `resource-component` and `resource-relation` helpers and a `resource-registry` service.
- Added `Resource::Pill`, `Resource::Summary`, `Resource::HoverCard`, `Table::Cell::Identity` and `Resource::SelectOption`, plus the `filter/model-multiple` filter.
- Added pills, summaries, select options and identity cells for users, companies, groups, roles, files and categories.
- Fixed `Attach::Popover`, `Attach::Tooltip`, `Pill`, `MultiSelect` and `table/cell/resource-identity` option forwarding and interaction issues.
- Improved CSS build performance with linked addons by scanning only resolved Fleetbase addon sources and removing redundant PostCSS passes.

---
## Console
- Fixed verification resend firing a request and leaving the modal loading when the phone or email is empty.
- Guarded two-factor client token decoding and session restore against missing or corrupt tokens.
- Guarded two-factor verification against errors without a message.
- Served the favicon at the root `/favicon.ico` URL.
- Reduced linked build Tailwind scanning and restricted Intl locale bundles to reachable base languages, roughly halving development build time and emitted chunk size.
- Refactored the README with an updated platform overview, screenshots and dual-licensing section.

---
## Console and API Packages
- Bumped the root Docker image version to `0.7.60`.
- Bumped Console to `0.7.60`.
- Updated API dependencies for `fleetbase/core-api` `^1.6.62` and `fleetbase/fleetops-api` `^0.6.66`.
- Updated Console dependencies for `@fleetbase/ember-ui` `^0.4.1`, `@fleetbase/fleetops-data` `^0.2.1`, and `@fleetbase/fleetops-engine` `^0.6.66`.
- Updated package submodules to their released tags.

---
## Bug Fixes
- Fixed Fleet-Ops map detail rendering, telematic filter labels, driver shift detection and inspection schedule work order types.
- Fixed Fleet-Ops Data fuel integration credential persistence and polymorphic serialization for work orders and maintenance.
- Fixed Core API observer validation messages being discarded on update and bulk delete.
- Fixed Console verification resend and two-factor token and error handling.

---
## API Changes
- Fleet-Ops adds `v1` inspection endpoints and internal Radar endpoints.
- Custom fields expose a `public_id` (`custom_field_…`).
- The `alerts` table gains `snoozed_until`, `snoozed_by_uuid`, `assigned_to_uuid` and `planned_at`.

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
