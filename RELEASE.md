> v0.7.56 ~ "Credential revocation, Fleet-Ops driver workflows, and Storefront checkout hardening"

---
## Highlights
Fleetbase `0.7.56` focuses on security, API reliability, and release-branch fixes across Core API, Dev Engine, Fleet-Ops, Storefront, and the root Fleetbase app. It fixes API credential revocation, persistent database transaction behavior, lifecycle webhook signing, driver and order configuration workflows, signature custom-field handling, Octane transaction diagnostics, and several Storefront checkout/payment edge cases.

---
## Component Versions
- `fleetbase`: `0.7.56`
- `core-api`: `1.6.60`
- `dev-engine`: `0.2.15`
- `fleetops`: `0.6.61`
- `storefront`: `0.4.20`

---
## Core API
- Fixed API credential revocation so deleted credentials and immediately expired keys stop authenticating.
- Keys created by removed users now fail closed instead of continuing to authorize requests.
- Disabled persistent PDO connections by default to prevent shared MySQL transaction state from leaking between requests.
- Fixed lifecycle webhooks signed by queue workers so each event uses the correct company, credential, environment, and secret.
- Fixed URL building with query parameters and added report execution statistics columns.

---
## Dev Engine
- Fixed API key expiration editing so relative expiration values persist instead of being nulled by the date transform.
- Added regression coverage for the API key expiration dropdown flow.
- Added release-tag automation support for Dev Engine release branches.

---
## Fleet-Ops
- Added driver-facing route manifests so drivers can read, run, and re-sequence route stops.
- Added a driver card view with a persisted card/table layout preference.
- Published the order configuration flow graph so API consumers can sequence order setup steps.
- Added configurable Leaflet tile providers with keyless OpenStreetMap defaults, and served Leaflet's
  marker icons from the Leaflet package instead of a remote CDN.
- Sped up order stop sequencing by ordering on geometry instead of issuing a routing call per stop pair.
- Fixed a driver's password being settable through a general driver update.
- Fixed vehicle updates dropping odometer values.
- Fixed issue and fuel-report list filters so driver-scoped aliases apply correctly.
- Fixed driver password updates, driver creation password persistence, unsaved geocoded place editing, sensor creation defaults, register-device routes, fuel report creation, geofence driver history, QR debug output, and maintenance vehicle schedule workflows.
- Reduced duplicate release-branch CI runs.

---
## Storefront
- Fixed QPay callback URL handling and QPay auth token caching across service instances.
- Serialized checkout capture to avoid double-capture and race-condition failures.
- Allowed cash pickup checkout flows without requiring a delivery quote.
- Fixed customer profile update authorization.
- Verified Stripe payments before capture.
- Added coverage for checkout capture and Stripe verification edge cases.

---
## Release and CI
- Continued release-branch contract workflow improvements so module PRs test the branch API code.
- Kept release notes and package version bumps aligned for Core API, Dev Engine, Fleet-Ops, and Storefront.
- Added root API transaction tripwire diagnostics for detecting server/client transaction-state divergence when explicitly enabled.
- Restored the upstream Octane listener set and pinned the dev compose command so Octane `--watch` is passed consistently.
- Updated Console custom-field value typing so signature-pad fields are treated like file uploads.
- Made the static binary build reproducible on GitHub-hosted runners: capped `static-php-cli`
  concurrency to fit the runner's memory, switched to plain Docker build progress, and uploaded the
  build log as an artifact when the job fails.
- Bumped `FLEETBASE_VERSION` in the API image to `0.7.56`.
- Brought the host API app to 100% line coverage and made its coverage gate blocking, matching the
  Console gate. The transaction tripwire, outbound HTTP request logging, and the `auth`/`guest`
  middleware now have tests.

---
## Bug Fixes
- Fixed API credentials remaining usable after deletion or creator removal.
- Fixed database transaction errors caused by persistent PDO connection aliasing.
- Fixed lifecycle webhook secret/session bleed in queue workers.
- Fixed root API/Octane behavior that could let a committed write surface as `422 There is no active transaction`.
- Fixed dev compose behavior where Octane file watching could be silently dropped.
- Fixed signature-pad custom fields falling through to text value handling instead of file value handling.
- Fixed the `guest` middleware referencing an undefined `RouteServiceProvider::HOME`, which would have
  raised a fatal error had any route used the alias.
- Fixed Dev Engine API key expiration values not saving.
- Fixed Fleet-Ops odometer, driver filter, password, route manifest, map tile, place editing, device, fuel report, geofence, QR, and maintenance issues.
- Fixed Storefront QPay, Stripe, checkout capture, cash pickup, and customer ownership edge cases.

---
## API Changes
- Core API credential deletion and immediate expiration now revoke access reliably.
- Core API requests from credentials whose creator has been removed now return unauthorized.
- Core API disables persistent PDO by default; set `DB_PERSISTENT=true` only if your deployment needs the previous behavior.
- Core API lifecycle webhooks now resolve signing context per event instead of reusing stale worker state.
- Core API URL generation now preserves query parameters explicitly.
- Core API report execution statistics columns are available for reporting workflows.
- Root API config restores the upstream Octane listener set and adds opt-in transaction tripwire logging through `DB_TXN_TRIPWIRE_ENABLED`.
- Signature-pad custom fields now report a `file` value type, matching their stored `file:<uuid>` value format.
- Fleet-Ops exposes the order configuration flow graph for API consumers.
- Fleet-Ops adds driver route manifest read/run/re-sequencing support.
- Fleet-Ops driver-scoped issue and fuel-report filters now respect `driver_uuid` aliases.
- Fleet-Ops no longer accepts a driver password through a general driver update; use the dedicated
  password endpoint.
- Storefront checkout capture is serialized and Stripe payments are verified before capture.

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
