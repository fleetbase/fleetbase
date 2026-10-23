> v0.8.0 (in progress) ~ "Fleetbase Extensions Registry v2"

---
## Status
This release is assembled on `release/v0.8.0` and ships together with the Fleetbase Extensions Registry v2 (fleetbase/registry release/v2.0.0, fleetbase/registry-bridge release/v0.2.0, fleetbase/fleetbase-cli release/v2.0.0, fleetbase/registry-infra release/v0.1.0, fleetbase/ember-core release/v0.4.0). Nothing in it merges to `main` until the registry project is complete. Patch releases (`v0.7.x`) continue from `main` in the meantime; merge `main` into this branch to keep it current. These notes replace the v0.7.x notes when the release is cut.

---
## Highlights (planned)
- **Extensions install without rebuilding the console.** The console mounts prebuilt engine releases at boot from `~registry/v1/engines/runtime`. (#730, needs @fleetbase/ember-core 0.4.0; not yet targeted at this branch because it imports a module that ember-core 0.3.x does not have)
- **Registry Service client.** Explore, Installed and Purchased read the central Registry Service; instances register with a code; installs run as queued jobs with rollback. (registry-bridge 0.2.0)

---
## Component Versions (planned)
- `registry-bridge`: `0.2.0`
- `ember-core`: `0.4.0`

---

> v0.7.73 ~ "Security: PHP2Shell, and phone sign-ups keep their number"

---
## Highlights

- **Security: PHP2Shell (CVE-2026-109618, CVE-2026-109619).** Two critical bugs in PHP itself let an unauthenticated request run code on the server. They affect every PHP install serving web requests, FrankenPHP included. The API image is now built on FrankenPHP 1.13.2, which ships the fixed PHP 8.2.35. The image also bounds `post_max_size` (it was unlimited) and turns off `session.upload_progress`, both of which narrow the known attack paths, and the build fails if the PHP it ships is older than 8.2.35. FrankenPHP 1.13.2 also fixes a worker-mode leak, where the last error from one request could be read by the next request on the same thread. **Self-hosted installs should upgrade right away.** ([PHP advisory](https://www.php.net/archive/2026.php#2026-10-21-5))
- **`mysql:createdb` works on a fresh install again.** It failed with "Unknown database", because a connection opened at boot still had the not-yet-created schema selected. (core-api #318)
- **Storefront: phone sign-up saves the number.** Customers who signed up with a phone number and texted code got an account without that number, so they were asked to verify it again, couldn't sign back in by phone, and the same number could sign up twice. The verified number is now saved on the account and marked verified. (storefront #161)

---
## Component Versions
- `console`: `0.7.73`
- `core-api`: `1.6.73`
- `fleetops`: `0.6.74`
- `storefront`: `0.4.29`
- `registry-bridge`: `0.1.11`
- `ledger`: `0.0.13`
- `customer-portal`: `0.0.16`
- `dev-engine`: `0.2.18`
- `ember-ui`: `0.4.6`
- `ember-core`: `0.3.26`
- `fleetops-data`: `0.2.3`
- `iam-engine`: `0.1.13`

---
## Core API `1.6.73`
- **Fix: `mysql:createdb` on a fresh install** (#318): `Setting::doesntHaveConnection()` runs at boot and caches a `mysql` connection with the configured schema selected. The command cleared the schema in config, but the cached connection kept it, so `CREATE DATABASE` failed. The command now purges the connection before each `CREATE DATABASE` and after restoring the schema, and `Setting::hasConnection()` purges a connection whose check failed.

---
## Storefront `0.4.29`
- **Fix: phone sign-up keeps the verified number** (#161): the app sends the number as the `identity` the code was filed under, and account creation only read `phone`. The verified identity is now the phone on the user and the customer contact, with `phone_verified_at` set, and an existing user's matching number is marked verified too. A `phone` sent alongside still takes precedence. Email sign-up is unchanged.

---
## Upgrade Steps
- Pull the new images and restart every API, queue, scheduler and events container. A PHP fix only applies once the old workers are gone.
- Request bodies are now capped at 610M (`post_max_size`). Uploads stay capped at 600M as before.
- If you used the standalone binary, download the rebuilt v0.7.73 binary. Earlier binaries embed a vulnerable PHP.
- If you worked around the `createdb` bug with an override of `CreateDatabase` in `api/app/Console/Commands`, remove it and its binding in `AppServiceProvider`.
- Customers who signed up by phone before this release have no phone saved. The app asks them to add it once (Storefront App v0.1.1 also asks at checkout).
- No migrations in this release.

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
