# AGENTS.md — fleetbase/console

## Repo purpose
The Ember.js single-page application that hosts the Fleetbase Console. Loads extension engines (FleetOps, Storefront, Pallet, Ledger, IAM, dev-engine, registry-bridge) at runtime via `ember-engines`.

## What this repo owns
- `app/` — host application code
- `config/environment.js` — env var mapping
- `fleetbase.config.json` — runtime config injected by Caddy in production, read by `disableRuntimeConfig=false`
- `package.json` — links to `ember-core`, `ember-ui`, and extension addons

## What this repo must not modify
- Source of `ember-core`, `ember-ui`, or any `addon/` directory inside an extension repo. Edit those in their own repos.
- The router topology unless the task explicitly says "refactor router".

## Framework conventions
- Ember 4.8+, Glimmer components, octane-style classes
- pnpm (not npm/yarn)
- Lazy engines via `ember-engines`
- Tailwind CSS
- PostCSS pipeline (note: dark-mode `:is()` selectors generate warnings, not errors — ignore them)

## Test / build commands
- `pnpm install --ignore-scripts` (first pass) → `pnpm install` (second pass)
- `pnpm exec ember serve --watcher watchman` (the dev server we run)
- `pnpm test`
- `pnpm exec ember build --environment=development`

## Known sharp edges
- **Native file watcher (`sane@4.1.0`) hits EMFILE** on this codebase. Use `--watcher watchman`. Watchman must be installed (`brew install watchman`).
- **Cold builds take ~3 minutes** with watchman, ~30+ minutes with `--watcher polling`.
- **SocketCluster port is 38000** in dev (host-mapped from container 8000), not 8888.
- The Docker `console` service is broken (`ssh-keyscan github.com` in its Dockerfile). Always run via `pnpm start` on the host.
- `ember-intl/translations.js` exceeds 500KB and triggers a babel deopt warning — harmless.

## Read first
- `~/fleetbase-project/docs/project-description.md`
- `~/fleetbase-project/docs/build-phases.md`
- `~/fleetbase-project/docs/ai-rules-ember.md`
- `~/fleetbase-project/docs/ai-rules-workspace.md`
- `~/fleetbase-project/docs/env-vars.md` (Console section)
