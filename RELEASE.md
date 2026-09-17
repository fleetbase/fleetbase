> v0.7.62 ~ "Telematics reliability"

---
## Highlights
Fleetbase `0.7.62` ships Fleet-Ops `0.6.67`, a telematics reliability release. Safee / DSCO syncs now use a few batched requests instead of several requests per vehicle, polling recovers from transient provider failures within a minute, and large instances can move telematics work onto dedicated queue workers. The FrankenPHP worker entrypoint is now kept in version control.

---
## Component Versions
- `console`: `0.7.62`
- `core-api`: `1.6.62`
- `fleetops`: `0.6.67`
- `fleetops-data`: `0.2.1`
- `ember-ui`: `0.4.2`

---
## Fleet-Ops
- Safee / DSCO polling fetches current position, speed, heading and odometer in batches of up to 1,000 vehicles with a cached vehicle list. A 93-vehicle fleet uses one request per minute instead of about 281.
- Safee access tokens are cached encrypted and refreshed before expiry, requests stay within Safee's 50-per-second account limit, and rate-limit responses are honoured.
- Poll attempts finish within the queue's 90-second reservation, so bounded providers no longer fail with "SyncTelematicDevicesJob has been attempted too many times". Older queued sync jobs hand off to bounded polling.
- Scheduled poll retries wait at most 60 seconds after a transient provider or TLS failure, and connections in an error state keep being polled.
- Vehicles that have never reported a position no longer mark sweeps partial, quarantine deliveries, or show the connection as degraded.
- AFAQY recovers from unreadable cached tokens and shares one request deadline across sign-in and unit retrieval.
- New opt-in `TELEMATICS_BROADCAST_QUEUE`, alongside `TELEMATICS_POLL_QUEUE` and `TELEMATICS_INGESTION_QUEUE`, moves telematics polling, position processing and live-map broadcasts to dedicated workers. Nothing changes when they are unset. See `docs/TELEMATICS_QUEUES.md` in Fleet-Ops.
- Adds a `device_events` UUID lookup index. Run migrations when deploying.

---
## Console and API Packages
- Bumped the root Docker image version to `0.7.62`.
- Bumped Console to `0.7.62`.
- Updated the API dependency for `fleetbase/fleetops-api` and the Console dependency for `@fleetbase/fleetops-engine` to `^0.6.67`.
- Updated the `fleetops` submodule to its `v0.6.67` release tag.
- Updated the API and Console lockfiles for Fleet-Ops `0.6.67`.
- Added the application-owned `api/public/frankenphp-worker.php`. It removes PHP's script time limit during worker startup, because booting is not an HTTP request and can exceed the default limit; Octane still applies the configured per-request limit. `api/.gitignore` no longer ignores the file, so Octane uses it instead of generating its stub.

---
## Bug Fixes
- Fixed telematics syncs failing with "SyncTelematicDevicesJob has been attempted too many times" for Safee and other bounded polling providers.
- Fixed telematics polling pausing for several minutes after a transient provider timeout.
- Fixed FrankenPHP worker startup being cut off by PHP's default script time limit.

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
