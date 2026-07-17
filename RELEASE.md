> v0.7.52 ~ "Platform hardening, backend coverage, Taler lifecycle, and secure account updates"

---
## Highlights
Fleetbase `0.7.52` focuses on platform quality, security hardening, backend coverage, and payment/account workflow reliability. This release updates Fleetbase Console `0.7.52`, AI `0.0.3`, Storefront `0.4.17`, Fleet-Ops `0.6.58`, Ledger `0.0.8`, Core API `1.6.54`, and IAM Engine `0.1.11`.

---
## Component Versions
- `console`: `0.7.52`
- `ai`: `0.0.3`
- `storefront`: `0.4.17`
- `fleetops`: `0.6.58`
- `ledger`: `0.0.8`
- `core-api`: `1.6.54`
- `iam-engine`: `0.1.11`

---
## Platform Quality and Coverage
- Added backend coverage baseline tooling, Pest runners, coverage summaries, and CI coverage reporting across AI, Storefront, Fleet-Ops, Core API, and Ledger.
- Restored and stabilized backend package test harnesses, including custom vendor-path support, package bootstrapping, and CI runner fixes.
- Added focused coverage for reporting contracts, resource shapes, validation behavior, support helpers, route helpers, currency behavior, tracking, telematics, and exports.
- Updated Console localization content for this release.

---
## Core API Hardening
- Added security advisory fixes for tenant-scoped internal endpoints, generic user access, template query execution, and platform-token-protected organization access.
- Added organization name search and improved organization API protection.
- Fixed public ID generation collisions and dynamic request resolution.
- Improved SMPP configuration diagnostics and environment mapping.
- Widened transaction settled currency support for settlement-related workflows.

---
## Ledger and Taler
- Completed the GNU Taler payment gateway lifecycle with tenant-safe webhook routing, hosted sandbox defaults, diagnostics, webhook provisioning, settlement verification, and richer refund metadata.
- Added gateway lifecycle fields for reconciliation, refund status, wallet refund state, settlement metadata, and raw Taler details.
- Added invoice refund workflows, refund confirmation, reversal handling, and refund result UI.
- Revamped Ledger payment gateway management with gateway catalog cards, diagnostics, setup, webhooks, details, and provider status surfaces.
- Added Taler sandbox and settlement console commands plus focused driver, webhook, lifecycle, diagnostics, and refund coverage.

---
## Fleet-Ops and Storefront
- Restored Fleet-Ops backend coverage and package test tooling for the `0.6.58` release.
- Removed the organizations listing API endpoint from the Fleet-Ops release branch.
- Stabilized Fleet-Ops backend tests around analytics, tracking, live queries, telematics, service rates, service areas, and assignment contracts.
- Added Storefront backend coverage tooling, corrected backend PHPUnit paths, and refreshed checkout/order resource tests.

---
## IAM
- Added a secure user email-change flow with a dedicated modal, controller wiring, confirmation copy, and translated UI strings.
- Updated IAM dependency overrides and workspace metadata for the release.

---
## Bug Fixes
- Fixed tenant-scoped access gaps in internal Core API endpoints.
- Fixed Core API public ID collision handling.
- Fixed Core API template query and report export formatting paths.
- Fixed Ledger refund reversal handling and gateway route assertions.
- Fixed Storefront checkout/order resource test contracts.
- Fixed IAM change-email flow copy and form behavior.

---
## API Changes
- Added Core API platform-token protection for trusted organization access.
- Hardened Core API internal endpoint scoping and template query execution.
- Removed the Fleet-Ops organizations listing API endpoint from the release branch.
- Added Ledger Taler gateway diagnostics, webhook provisioning, settlement verification, refund workflow, and gateway transaction lifecycle fields.
- Added IAM secure email-change flow support.

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
