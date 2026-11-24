> v0.9.0 ~ "Fleetbase Extensions Registry v2: install extensions without rebuilding the console"

---
## Highlights

- **A new Extensions experience.** Extensions now come from the Fleetbase Registry Service (registry v2):
  - Discover with featured listings and a category rail;
  - category pages with a card or list view;
  - an extension page that installs in place;
  - a library for Installed, Purchased and Updates.

  Installs, updates and removals run as queued jobs that the console follows live. Paid extensions check out with Stripe. (registry-bridge 0.3.1)
- **Extensions install without rebuilding the console.** The console mounts prebuilt engine releases at boot from `~registry/v1/engines/runtime`. The API serves them from `storage/app/registry-runtime-engines`. ([#730](https://github.com/fleetbase/fleetbase/pull/730), ember-core 0.4.0)
- **Installed extensions live in their own Composer project.**
  - `api/extensions/composer.json` lists the extensions installed on top of core, whether from the registry or by hand.
  - Core's `api/composer.json` and `composer.lock` list core and the core modules (FleetOps, Storefront, Ledger, Customer Portal, AI, Valhalla, VROOM).
  - So upgrading core no longer conflicts with installs, and installs never touch core's files. ([#754](https://github.com/fleetbase/fleetbase/pull/754))
- **Docker installs extensions from the registry.**
  - The installer's worker runs in `application` next to Octane and reloads it after each install.
  - `api/extensions` is a named volume shared with `queue` and `scheduler`, and it's re-synced on start.
  - The console image writes `host-modules.json` for the compatibility check.

  See `docker/README.md`.
- **Instances register with the registry.** A self-hosted instance uses a one-time code from the registry website, in the admin settings under Registry Service. The Fleetbase Cloud registers itself on boot.

Includes everything in v0.8.1–v0.8.3.

---
## Component Versions
- `registry-bridge`: `0.3.1`
- `ember-core`: `0.4.0`
- `core-api`: `2.0.5`
- `fleetops`: `0.7.3`
- Works with the Registry Service `v2.0.0` and `@fleetbase/cli` `2.0.0`

---
## Upgrading

1. **Instances installed before v0.9.0** keep their extensions in core's `composer.json`. After pulling or unpacking the release, and **before** `composer install` in `api/`, run this in a maintenance window:
   ```bash
   php artisan extensions:migrate-manifest --dry-run   # shows what moves
   php artisan extensions:migrate-manifest
   ```
   See `api/extensions/README.md`. Fresh installs start with an empty manifest.
2. Run `php artisan migrate` (the registry-bridge tables for Registry Service installs and auto-update).
3. Run a worker on the `installer` queue, and keep the scheduler running (auto-update and re-registration). The Docker setup does both: `REGISTRY_INSTALLER_WORKER=true` and `REGISTRY_INSTALLER_RELOAD_OCTANE=true` on `application`.
4. Keep `api/extensions` and `api/storage/app/registry-runtime-engines` on persistent storage, so installs survive image upgrades. After an image upgrade, run `php artisan extensions:sync`.
5. If `console/.npmrc` or your build points the `@fleetbase` npm scope at `https://registry.fleetbase.io`, remove that line. The Registry Service serves only extension packages; the core `@fleetbase/*` packages come from npmjs.
6. **Self-hosted:** open the admin settings → Registry Service and register the instance with a code from your registry organization.

   **Fleetbase Cloud:** set
   - `REGISTRY_SERVICE_URL`;
   - `REGISTRY_CLOUD_AUTO_REGISTER=true`;
   - `REGISTRY_CLOUD_PLATFORM_SECRET` (the same value as the Registry Service);
   - `REGISTRY_PREINSTALLED_EXTENSIONS=true` where every extension is built into the images.

   See the registry's `docs/cutover.md`.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
---
