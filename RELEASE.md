> v0.7.44 ~ "Admin dashboards, internal metrics, Fleet-Ops connectivity, and shared UI polish"
---
## Highlights
Fleetbase `0.7.44` brings a more complete admin experience, new internal metrics for Console dashboards, a major Fleet-Ops connectivity update, native fuel provider integration support, and shared UI improvements across engines. This release updates Fleetbase Console `0.7.44`, Core API `1.6.51`, Fleet-Ops `0.6.52`, Fleet-Ops Data `0.1.37`, Ledger `0.0.5`, IAM Engine `0.1.10`, Developers Engine `0.2.14`, Ember Core `0.3.22`, and Ember UI `0.3.34`.

---
## Component Versions
- `console`: `0.7.44`
- `core-api`: `1.6.51`
- `fleetops`: `0.6.52`
- `fleetops-data`: `0.1.37`
- `ledger`: `0.0.5`
- `iam-engine`: `0.1.10`
- `dev-engine`: `0.2.14`
- `ember-core`: `0.3.22`
- `ember-ui`: `0.3.34`

---
## Console and Admin
- Replaced the static Console admin overview with the shared Dashboard experience, including sticky dashboard headers and reusable admin widgets.
- Added richer organization management views with organization details, settings, users, extensions, activity, owner/company table cells, and overview widgets.
- Improved the install, invite, onboarding, auth, catch, and virtual screens so the surrounding Console shell feels more consistent.

---
## Fleet-Ops Connectivity and Fuel
- Reworked Fleet-Ops connectivity around a clearer Telematics hub with provider setup, settings, device/event/sensor/log views, attachments, and connection diagnostics.
- Added native fuel provider integrations, including provider connection setup, matching priorities, sync/import flows, provider transactions, and Fleet-Ops widgets.
- Added PetroApp as the built-in fuel provider path while keeping the integration framework extension-ready.
- Added Fleet-Ops Data models and serializers for fuel provider connections and fuel provider transactions, and exposed provider metadata on fuel reports.
- Improved driver, fleet, vehicle, device, and map drawer workflows around connectivity and assignment actions.

---
## Dashboards and Metrics
- Added internal Core API metrics support for admin, IAM, and developer dashboards.
- Rebuilt the IAM dashboard with KPI, identity health, access coverage, access risk, policy, group, activity, and quick-action widgets.
- Rebuilt the Developers dashboard with API traffic, latency, error rate, webhook delivery, endpoint health, event stream, credentials, activity, and quick resource widgets.
- Improved dashboard registration, widget sizing, and layout structure across engines.
- Updated IAM and Developers packages for Node 22 and pnpm 11 compatibility in CI and workspace builds.

---
## Core API and Shared UI
- Added internal admin, IAM, and developer search support for Console dashboard and management surfaces.
- Improved organization resources, company filtering, activity filtering, and API model behavior used by internal Console tools.
- Updated Ledger with a lighter app shell and internal search controller support.
- Added shared Ember UI sidebar navigation, table empty states, Fleetbase attribution, and legal notice UI.
- Improved shared docs panel, activity log, floating UI, sidebar resize behavior, date-time input handling, filters picker behavior, and resource table empty-state forwarding.
- Improved Ember Core service exports, serializer normalization, chat service behavior, request option forwarding, and custom field loading defaults.

---
## Bug Fixes
- Fixed telematics detail routing, connection logs, diagnostics, and setup flows that could make provider/device management harder to follow.
- Improved fuel provider matching, import, sync, and transaction workflows.
- Fixed shared sidebar, table, docs panel, activity log, floating, and date-time UI behavior covered by new Ember UI tests.
- Fixed IAM and Developers dashboard structure issues and linter/style ordering cleanup.
- Fixed Ember Core payload normalization for plural underscore keys and made custom field loading request all records by default.
- Fixed Ledger internal search controller behavior.

---
## API Changes
- Added internal metrics endpoints under `int/v1/metrics/admin`, `int/v1/metrics/iam`, and `int/v1/metrics/dev`.
- Added internal search endpoints for admin, IAM, and developer Console surfaces.
- Added Fleet-Ops fuel provider API support for provider connections, transactions, sync/import workflows, events, and matching.
- Added Fleet-Ops Data `fuel-provider-connection` and `fuel-provider-transaction` models and serializers.
- Extended internal organization, company, activity, and resource behavior used by Console admin views.

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
