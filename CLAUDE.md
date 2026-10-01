# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The Fleetbase **host monorepo** (logistics/supply-chain OS). It is a thin shell: most product code lives in extensions that are installed as packages, not in this repo.

- `api/` — Laravel 10 host app (PHP >=8.0 <8.3, Octane). Only wires extensions together (`App\Providers`, `Http/Kernel`, a `/health` route in `RouteServiceProvider`, `User` model). Real API logic ships in Composer packages: `fleetbase/core-api`, `fleetops-api`, `storefront-api`, `ledger-api`, `registry-bridge`, `customer-portal-api`, `ai`, `valhalla-api`, `vroom-api`.
- `console/` — Ember.js (Octane + Ember Engines) admin UI, tracked directly in this repo. Extensions load as engines (`@fleetbase/fleetops-engine`, `storefront-engine`, `iam-engine`, …); shared libs are `@fleetbase/ember-core`, `ember-ui`, `fleetops-data`. Static routes are in `console/router.map.js`; the API host is `console/fleetbase.config.json` (`http://localhost:8000`).
- `packages/*` — **git submodules** (each its own repo: fleetops, storefront, core-api, ember-core, ember-ui, …). They are empty unless submodules are initialized (`git submodule update --init`). Changes to extension code belong in those repos, not here.
- `docker/`, `docker-compose.yml`, `docker-bake.hcl`, `infra/`, `workflows/` — images, local stack, deploy pipelines. `tests/k6` (perf) and `tests/erd` (ERD generation); `create-erd.sh` + `mermaid.py` regenerate `database.mmd`/`erd*.svg` from a live MySQL.

Runtime services (compose): MySQL 8, Redis, SocketCluster (realtime, port 38000), `queue` (`artisan queue:work`), `scheduler` (go-crond + `docker/crontab`), api (:8000), console (:4200).

## Commands

API (run in `api/`; needs MySQL + Redis — CI uses DB `fleetbase_test`):

```bash
composer install
composer test                       # PHPUnit (Unit + Feature suites)
vendor/bin/phpunit --filter AppServiceProviderTest          # single test class/method
vendor/bin/phpunit tests/Unit/UserModelTest.php             # single file
composer test:coverage:clover && composer coverage:check    # coverage gate: api/app must be 100% lines
```

Console (run in `console/`; pnpm 11, Node 22):

```bash
pnpm install
pnpm start                          # ember serve → http://localhost:4200
pnpm lint                           # js (eslint), hbs (template-lint), css (stylelint), intl; also lint:*:fix
pnpm test:ember                     # QUnit; single test: pnpm exec ember test --filter "<module or test name>"
pnpm test:ember:coverage && pnpm coverage:check
pnpm build
```

Install/boot a stack: `npm i -g @fleetbase/cli && flb install-fleetbase`, or `docker compose up`. First-time DB setup is `api/deploy.sh` (createdb, `migrate`, `sandbox:migrate`, `fleetbase:seed`, `fleetbase:create-permissions`, `registry:init`, route/config cache).

### Developing against local extension sources

`node scripts/package-linker.mjs <list|status|link|…>` (or `flb-package-linker` after `npm link`) rewrites `console/package.json`, `api/composer.json` repositories, and `console/pnpm-workspace.yaml` so `packages/*` resolve locally. Only packages with `fleetbase-extension` keyword or `extension.json` count as extensions; shared exceptions are `ember-core`, `ember-ui`, `fleetops-data`, `core-api`. Don't commit linker-generated manifest changes. See `scripts/README.md`; its tests: `node --test scripts/package-linker.test.mjs`.

## Things that aren't obvious

- **Versioning is lockstep.** `console/package.json` version, `RELEASE.md` header and the `release/vX.Y.Z` branch name must agree — `release-tag.yml` refuses to tag otherwise and tags automatically when the release branch merges to `main`. Tagging triggers GitHub Release, Docker publish, binaries and Discord announcement. `RELEASE.md` also records component versions (core-api, fleetops, …) that match the `api/composer.json` constraints.
- **Four required CI checks gate `main`:** `ci.yml` (docker bake), `install-smoke.yml` (fresh install boots), `api.yml` (PHPUnit + 100% coverage), `console.yml` (lint + QUnit + build). `api-contract.yml` is a reusable Postman contract workflow that module repos call. Workflows only run from the repo-root `.github/` — `console/.github` is not used.
- Extension Composer packages come from GitHub / `registry.fleetbase.io` (`secure-http` is off, `minimum-stability: dev`); builds may need a GitHub token (`composer-auth.json`).
- Each organization has a live DB and a `_sandbox` DB; migrations run on both (`migrate` + `sandbox:migrate`).
- The host `api/` has no `routes/` directory or controllers beyond the base one — to find an endpoint, look in the extension package (`vendor/fleetbase/*` or `packages/*`), not `api/app`.
- CONTRIBUTING: branch from `main`, GitHub Flow PRs; license is AGPL-3.0.
