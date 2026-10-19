> v0.7.71 ~ "API containers start again on FrankenPHP 1.13"

---
## Highlights

- **Fix: API containers exited 127 on startup with Octane 2.22.** Octane 2.22.0 requires FrankenPHP 1.13.0 and checks the binary every time `octane:frankenphp` starts. On the old 1.12.4 base image it moved `/usr/local/bin/frankenphp` aside, downloaded a generic build to a different path, deleted the original and then ran the path it had emptied (`exec: /usr/local/bin/frankenphp: not found`). The image now builds on `dunglas/frankenphp:1.13.1-php8.2-bookworm` and locks Octane `2.22.0`.
- **The API image build fails if Octane and FrankenPHP disagree.** `docker/scripts/assert-frankenphp-version.php` runs after `composer install` and compares Octane's required FrankenPHP version with the binary in the image. A mismatch now fails the build and names both versions, instead of crash-looping containers after deploy. Octane is held to a minor range (`~2.22.0`), so a new Octane minor version arrives only with a deliberate bump, together with the base image.
- **Fleet-Ops: address lookup works when the Google Maps key is set in the console.** The geocoder endpoints returned `[]` whenever the key was set in settings instead of the environment, which broke the coordinates and autocomplete inputs. Every geocoding path now uses the settings-backed key. (fleetops #408, #409; fixes #723)
- **Core API: extensions can add searchable columns at runtime** (core-api #317).

---
## Component Versions
- `console`: `0.7.71`
- `core-api`: `1.6.72`
- `fleetops`: `0.6.74`
- `storefront`: `0.4.27`
- `registry-bridge`: `0.1.11`
- `ledger`: `0.0.13`
- `customer-portal`: `0.0.16`
- `dev-engine`: `0.2.18`
- `ember-ui`: `0.4.6`
- `ember-core`: `0.3.26`
- `fleetops-data`: `0.2.3`
- `iam-engine`: `0.1.13`

---
## Core API `1.6.72`
- **Searchable columns registered at runtime** (#317): `Searchable::addSearchableColumns([...])` (static, per model class) merges extra columns into a model's search, so an extension can make its own data findable through a core or Fleet-Ops model's search without editing the model. `relation.column` dot notation works as before, including relations added with `resolveRelationUsing()`. Nothing changes until an extension registers columns.

## FleetOps `0.6.74`
- **Fix: the console geocoder endpoints return results** (#408, fleetbase/fleetbase#723): `int/v1/geocoder/query` and `int/v1/geocoder/reverse` returned `[]` when the Google Maps API key was set in the console instead of the environment. Both now use the same geocoder as `places/lookup`.
- **Fix: every other geocoding path uses the settings-backed key** (#409): place creation from an address or coordinates, place search, address-only place creation on the public API, and driver tracking locality. Failed lookups are logged instead of hidden.
- **Fix: `config/geocoder.php` passes the region rather than the locale to Google Maps** and uses the default cache store (#409).

---
## Upgrade Steps
- Pull the images as usual. No migrations in this release.
- If you build your own API image from `docker/Dockerfile`, rebuild it: the base image moves to FrankenPHP 1.13.1. If you have raised `laravel/octane` yourself, keep the base image at or above the FrankenPHP version that Octane requires, or the build stops with a message naming both.

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
