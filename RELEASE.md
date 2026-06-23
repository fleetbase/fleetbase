> v0.7.48 ~ "Fleet-Ops REST coverage, revenue lifecycle safeguards, settlement status, and navigation polish"
---
## Highlights
Fleetbase `0.7.48` expands Fleet-Ops public REST and export coverage, improves active revenue metrics, adds transaction settlement status support, introduces Ledger revenue lifecycle safeguards, and polishes sidebar navigation and currency utilities. This release updates Fleetbase Console `0.7.48`, Fleet-Ops `0.6.56`, Core API `1.6.53`, Ledger `0.0.6`, and Ember UI `0.3.38`.

---
## Component Versions
- `console`: `0.7.48`
- `fleetops`: `0.6.56`
- `core-api`: `1.6.53`
- `ledger`: `0.0.6`
- `ember-ui`: `0.3.38`

---
## Fleet-Ops REST, Exports, and Metrics
- Added public Fleet-Ops REST endpoints for devices, equipment, fuel transactions, parts, sensors, and work orders, with UUID-safe resource resolution.
- Expanded Fleet-Ops export coverage across contacts, devices, drivers, equipment, fleets, fuel reports, issues, maintenance, orders, parts, places, sensors, service areas, service rates, telematics, vehicles, vendors, and work orders.
- Added a shared active revenue query so earnings, revenue trend, and average order value calculations ignore deleted or inactive orders and invoices.
- Standardized active revenue transaction status handling for reporting and accounting consistency.
- Fixed sensor status and type filters so option labels render correctly.

---
## Telematics and Device Workflows
- Hardened Safee and AFAQY telematics sync, including sensor identity sync, device status bootstrap, and safer provider error handling.
- Added connectivity device event details and improved device event navigation.
- Fixed vehicle attachment navigation and improved device, sensor, and vehicle filters used by connectivity screens.
- Added Google Maps view layer settings for Fleet-Ops map configuration.
- Added settings to enable Google Traffic Layer + Transit Layer.

---
## Ledger and Settlement
- Added transaction settlement status support in Core API and Ledger, including migrations and model/resource helpers.
- Added Ledger revenue lifecycle safeguards for cancelled/deleted orders, deleted or inactive invoices, transaction voiding, restore handling, and reversal journal creation.
- Added a dry-run-first Ledger repair command for revenue lifecycle inconsistencies.
- Added GNU Taler gateway support, invoice QR checkout, public invoice payment flow improvements, and local Taler testing utilities.
- Added invoice and transaction filters for settlement and review workflows.

---
## Shared UI and Console Polish
- Fixed sidebar navigator initial active-parent sync so module root pages do not open deeply nested menus too early.
- Added permission-safe sidebar navigator filtering for visible permissions and visible child requirements.
- Added recently-offline badge styling.
- Improved currency lookup and formatting utilities.
- Added internal bulk delete REST registration support in Core API.
- Improved handling for reused organization invite codes.
- Added GET support for custom HTTP SMS gateways.

---
## Bug Fixes
- Fixed active revenue metrics counting inactive or deleted revenue sources.
- Fixed Fleet-Ops sensor filter option rendering.
- Fixed Safee and AFAQY telematics sync edge cases.
- Fixed Fleet-Ops vehicle attachment navigation.
- Fixed sidebar navigator initial sync and related lint issues.
- Fixed reused organization invite code handling.

---
## API Changes
- Added Core API `settlement_status` support for transactions.
- Added internal bulk delete REST routing support.
- Added Fleet-Ops public REST endpoints and request/resource contracts for device, equipment, fuel transaction, part, sensor, and work order resources.
- Added Fleet-Ops export classes for additional operational resources.
- Added Ledger revenue lifecycle service, repair command, settlement filters, and Taler gateway integration.
- Added Ember UI sidebar navigator visibility controls and currency utility improvements.

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
