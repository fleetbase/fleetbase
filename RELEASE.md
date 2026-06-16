> v0.7.45 ~ "Multi-provider SMS, Fleet-Ops operations navigation, reports, and telematics hardening"
---
## Highlights
Fleetbase `0.7.45` adds configurable multi-provider SMS support, a refreshed Fleet-Ops navigation experience, new shared reporting widgets, facilitator-driver data support, and several telematics and device-management hardening fixes. This release updates Fleetbase Console `0.7.45`, Core API `1.6.52`, Fleet-Ops `0.6.53`, Fleet-Ops Data `0.1.38`, and Ember UI `0.3.35`.

---
## Component Versions
- `console`: `0.7.45`
- `core-api`: `1.6.52`
- `fleetops`: `0.6.53`
- `fleetops-data`: `0.1.38`
- `ember-ui`: `0.3.35`

---
## Core API and SMS
- Added multi-provider SMS support for Vonage, AWS SNS, MessageBird, SMPP, custom HTTP providers, and the existing CallPro path.
- Added protocol and provider configuration support so SMS delivery can be driven from settings and environment mapping.
- Improved SMS service fallback behavior and added coverage for the new provider selection paths.
- Updated the Fleetbase blog RSS source used by Console content surfaces.

---
## Fleet-Ops Operations and Telematics
- Refactored the Fleet-Ops sidebar navigation and added an operations monitor for a clearer operations-focused workspace.
- Added hub and search support for richer Fleet-Ops management, maintenance, analytics, and settings landing surfaces.
- Hardened device attachment morph types and added repair support for invalid polymorphic relation namespaces.
- Improved telematics device sync, attach error handling, Afaqy provider behavior, and device/vehicle filtering.
- Fixed draft order entity editing and restored facilitator-driver schedule assignee support.

---
## Reports and Shared UI
- Added shared report find/select components, a report widget, and report widget registration.
- Added dashboard outlets so engines can contribute content around shared dashboard layouts.
- Refined the shared sidebar navigator and simplified Fleetbase attribution styling and behavior.
- Added tests for report selection, report widgets, sidebar navigation, dashboard registration, and attribution behavior.

---
## Data Models
- Added the Fleet-Ops Data `facilitator-driver` model and application re-export.
- Added driver subtype support on facilitators so maintenance and assignment workflows can identify facilitator drivers correctly.
- Added regression coverage for facilitator-driver data and maintenance schedule normalization.

---
## Bug Fixes
- Fixed reports empty-state documentation links.
- Fixed Fleet-Ops draft order entity edit modal behavior.
- Fixed device attach errors and telematics sync feedback paths.
- Fixed facilitator-driver assignee restoration in maintenance schedules.
- Fixed shared sidebar navigator edge behavior covered by new Ember UI tests.

---
## API Changes
- Added configurable SMS provider support in Core API settings and environment mapping.
- Added internal Fleet-Ops hub and search routes for management, maintenance, analytics, and settings surfaces.
- Added Fleet-Ops device and vehicle hardening around attachable types, filters, and telematics sync.
- Added Fleet-Ops Data `facilitator-driver` model support for facilitator driver assignment workflows.
- Added shared Ember UI report selection and report widget components.

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
