# AGENTS.md — fleetbase/api

## Repo purpose
The Laravel application root for the Fleetbase API. Bootstraps the framework, registers extension service providers, holds `.env`, migrations, and the public entrypoint. The actual business logic lives in `core-api` and the per-extension `*/server/` packages.

## What this repo owns
- `app/`, `config/`, `bootstrap/`, `routes/` — Laravel app skeleton
- `database/migrations/` — only migrations specific to the host app (most live in extension packages)
- `composer.json` — declares which extension packages are linked locally
- `.env` — runtime environment

## What this repo must not modify
- Anything inside `vendor/`. To change a package, edit its source repo and re-run `composer update <package>`.
- `core-api` source. Changes to core-api go in the `core-api/` repo.
- Any extension's `server/` source. Changes go in `fleetops/server`, etc.

## Framework conventions
- Laravel 10+, PHP 8.0+
- FrankenPHP runtime in Docker (`fleetbase/fleetbase-api:latest`)
- Queue: Redis | Cache: Redis | Session: Redis | Broadcast: SocketCluster

## Test / build commands
- Run inside the `application` container:
  - `php artisan migrate`
  - `php artisan migrate:status`
  - `php artisan route:list`
  - `php artisan queue:work --once`
  - `php artisan tinker`
- From the host: `docker compose exec application bash`

## Known sharp edges
- **`Str::domain('localhost')` crashes** if `MAIL_FROM_ADDRESS` is not set in `.env` and `CONSOLE_HOST=http://localhost:4200`. Bug is in `core-api/src/Expansions/Str.php:53`. Workaround: keep `MAIL_FROM_ADDRESS` set.
- **APP_KEY must be set** before the app boots. Generate via `php artisan key:generate --show` and paste into `.env`.
- The `console` Docker service is **not used** here — its Dockerfile fails on `ssh-keyscan github.com`. Console runs on host via `pnpm start`.

## Read first
- `~/fleetbase-project/docs/project-description.md`
- `~/fleetbase-project/docs/build-phases.md`
- `~/fleetbase-project/docs/ai-rules-laravel.md`
- `~/fleetbase-project/docs/ai-rules-workspace.md`
- `~/fleetbase-project/docs/env-vars.md`

## Boost gate
Before first edit: `composer require laravel/boost --dev && php artisan boost:install`, then commit.
