> v0.7.63 ~ "Telematics sync status and SASCO fuel"

---
## Highlights
Fleetbase `0.7.63` ships Fleet-Ops `0.6.68`. Telematics connections now show their real sync state: completed background sweeps update the status and last sync time, and "Sync Devices" works while polling is running. SASCO joins PetroApp as a native fuel provider.

---
## Component Versions
- `console`: `0.7.63`
- `core-api`: `1.6.62`
- `fleetops`: `0.6.68`
- `fleetops-data`: `0.2.1`
- `ember-ui`: `0.4.2`

---
## Fleet-Ops
- Each completed scheduled telematics sweep updates the connection status and last sync time, so a connection that has recovered no longer shows "Needs attention" or an old last sync date.
- "Sync Devices" no longer fails with "already queued or running" while a scheduled sweep is queued or running. The request is recorded and the next sweep completes it.
- Manual sync requests left behind by a lost or interrupted job are completed by the next scheduled sweep instead of staying queued or failed.
- SASCO B2B is available as a native fuel provider, with sandbox and production environments, SAR amounts, driver details and receipt images. Transactions are matched to vehicles by plate.
- Fuel provider environment labels and sync run details no longer refer to PetroApp for other providers.
- The dedicated telematics worker guide now requires every worker to share the queue worker's image and `APP_KEY`, and adds verification and troubleshooting steps.

---
## Console and API Packages
- Bumped the root Docker image version to `0.7.63`.
- Bumped Console to `0.7.63`.
- Updated the API dependency for `fleetbase/fleetops-api` and the Console dependency for `@fleetbase/fleetops-engine` to `^0.6.68`.
- Updated the `fleetops` submodule to its `v0.6.68` release tag.
- Updated the API and Console lockfiles for Fleet-Ops `0.6.68`.

---
## Bug Fixes
- Fixed telematics connections showing "Needs attention" and a stale last sync after scheduled polling recovered.
- Fixed "Sync Devices" failing with "already queued or running" while telematics polling was active.

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
