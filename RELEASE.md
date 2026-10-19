> v0.7.71 ~ "API containers start again on FrankenPHP 1.13"

<!-- RELEASE_NOTES_PLACEHOLDER: bump core-api to 1.6.72 and fleetops to 0.6.74 (composer, pnpm, gitlinks) once both are tagged, then remove this line. -->

---
## Highlights

- **Fix: API containers exited 127 on startup with Octane 2.22.** Octane 2.22.0 requires FrankenPHP 1.13.0 and checks the binary every time `octane:frankenphp` starts. On the old 1.12.4 base image it moved `/usr/local/bin/frankenphp` aside, downloaded a generic build to a different path, deleted the original and then ran the path it had emptied (`exec: /usr/local/bin/frankenphp: not found`). The image now builds on `dunglas/frankenphp:1.13.1-php8.2-bookworm` and locks Octane `2.22.0`.
- **The API image build fails if Octane and FrankenPHP disagree.** `docker/scripts/assert-frankenphp-version.php` runs after `composer install` and compares Octane's required FrankenPHP version with the binary in the image. A mismatch now fails the build and names both versions, instead of crash-looping containers after deploy. Octane is held to a minor range (`~2.22.0`), so a new Octane minor version arrives only with a deliberate bump, together with the base image.
- **Fleet-Ops: geocoding uses the Google Maps key from settings** (fleetops #408, #409; fixes #723).
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
- **Searchable columns registered at runtime** (#317): `Searchable::addSearchableColumns([...])` (static, per model class) merges extra columns into a model's search, so an extension can make its own data findable through a core or Fleet-Ops model's search without editing the model. `relation.column` dot notation works as before, including relations added with `resolveRelationUsing()`.

## FleetOps `0.6.74`
- **Fix: the geocoder endpoints and every other geocoding path use the Google Maps API key from settings** (#408, #409; fixes fleetbase/fleetbase#723).

---
## Upgrade Steps
- Pull the images as usual. No migrations in this release.
- If you build your own API image from `docker/Dockerfile`, rebuild it: the base image moves to FrankenPHP 1.13.1. If you have raised `laravel/octane` yourself, keep the base image at or above the FrankenPHP version that Octane requires, or the build stops with a message naming both.

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
