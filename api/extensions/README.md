# Installed extensions

This folder is a Composer project of its own. Its `composer.json` (the **extensions manifest**) and `composer.lock` list the extensions installed on this instance; core's packages stay in `../composer.json`. Each project has its own lock, and the extensions have their own `vendor/`.

- An upstream core upgrade changes only core's `composer.json` and `composer.lock`.
- Installing, updating or uninstalling an extension changes only the files here. The registry-bridge installer and `registry:install`/`registry:uninstall`/`registry:update` write here.

## How the two projects fit together

| | Core (`api/`) | Extensions (`api/extensions/`) |
|---|---|---|
| Lists | Laravel, `fleetbase/core-api`, `fleetbase/registry-bridge`, … | FleetOps, Storefront, Ledger, … and anything installed from the registry |
| Vendor | `api/vendor` | `api/extensions/vendor` |
| Autoloader | registered first | registered after core's (`App\Support\Extensions\Extensions`, called from `bootstrap/app.php`) |
| Package discovery | both `installed.json` files are read (`App\Support\Extensions\ExtensionsPackageManifest`) | |

### fleetbase/core-platform

The extensions project requires `fleetbase/core-platform`, a metapackage generated into `core-platform/composer.json` (git-ignored). For every package core installed, it `provide`s that package at its installed version and `conflict`s with any other copy. As a result:

- Composer resolves extensions against core's own packages and installs only what core lacks. There is never a second Laravel or core-api.
- An extension that needs a core package at a version core doesn't have fails to resolve, and Composer's message names it.

`scripts/extensions-core-platform.php` writes the file. It runs on every core `composer install`/`update`/`dump-autoload` (core's `post-autoload-dump`) and in the Docker build.

It uses `provide` + `conflict` instead of `replace` because Composer 2.9+ blocks any package that replaces something with a security advisory. With `replace`, every extension install would fail while core has an advisory. Core's own `composer audit` reports those advisories.

## Common tasks

Install or remove an extension by hand (the installer does the same):

```bash
cd api/extensions
composer require fleetbase/pallet-api:^0.1   # or: composer remove fleetbase/pallet-api
```

After a core upgrade or a core `composer update`, re-resolve the extensions against the new core. Core's `post-update-cmd` runs this for you:

```bash
php artisan extensions:sync           # --check resolves without writing anything
```

To add the Registry Service's Composer repository (the installer adds it, as `fleetbase-registry-service`, on the first install from the service):

```bash
cd api/extensions
composer config repositories.fleetbase-registry-service '{"type": "composer", "url": "https://registry.fleetbase.io/composer", "canonical": false}'
```

Paid packages need the instance token: `COMPOSER_AUTH='{"bearer": {"registry.fleetbase.io": "flbi_…"}}'`. The installer sets it for its own runs and never writes it to disk.

## Upgrading an instance installed before this folder existed

Those instances have their extensions in core's `composer.json`. After pulling or unpacking the new release, and **before** running `composer install` in `api/`, run this in a maintenance window:

```bash
php artisan extensions:migrate-manifest --dry-run   # shows what moves
php artisan extensions:migrate-manifest
```

It moves every package that requires `fleetbase/core-api` (except core-api and registry-bridge) out of core:

- from core's `composer.json`, or
- left in `api/vendor` by an upgrade that replaced `composer.json`/`composer.lock` with the release's.

Each one goes into this manifest at the version installed now (`--keep-constraints` keeps core's version range instead). The command then removes them from core and installs them here.

It copies all four Composer files to `storage/app/extensions-migration/<time>/` first and puts them back if a step fails. Extra options: `--package=` moves another package, and `--keep=` leaves one in core.

Afterwards run your usual deploy steps (`php artisan migrate`, `config:cache`, `octane:reload`).

## Docker

The image installs both projects:

1. core's `composer install`;
2. `extensions-core-platform.php`;
3. `composer install --working-dir=extensions`.

The extensions get their own layer, so a code change doesn't reinstall them. To keep extensions installed at runtime across image upgrades, put `api/extensions` on a volume. After an image upgrade, run `php artisan extensions:sync` so they resolve against the new core.

## An instance with no extensions

Without `vendor/` here, or without this folder at all, nothing extra is loaded and package discovery reads core's packages only.
