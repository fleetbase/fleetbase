# Fleetbase Scripts

This directory contains project-level utilities for local development and setup. Run all commands from the repository root unless a command says otherwise.

## `package-linker.mjs`

`flb-package-linker` manages local Fleetbase package links for extension development. It updates the Console npm manifest, API Composer repositories, and Console pnpm workspace settings so linked extension packages and shared Ember packages resolve from `packages/*`.

Use this when working on an extension such as FleetOps and you need local changes from `packages/fleetops`, `packages/ember-ui`, `packages/ember-core`, or `packages/fleetops-data` to show up in the host app.

The linker only treats a package as a Fleetbase extension when either:

- its `package.json` has `fleetbase-extension` in `keywords`
- it has an `extension.json` manifest

The only non-extension packages supported for shared dependency linking are `@fleetbase/ember-core`, `@fleetbase/ember-ui`, `@fleetbase/fleetops-data`, and the backend-only `fleetbase/core-api`.

### Install as a Global CLI

From the repository root:

```sh
npm link
```

Or from this directory:

```sh
cd scripts
npm link
```

After that, use:

```sh
flb-package-linker --help
flb-package-linker status
```

Without global linking, run the script directly:

```sh
node scripts/package-linker.mjs status
```

### Common Commands

List packages discovered under `packages/*`:

```sh
flb-package-linker list
```

Show currently linked packages and shared dependency resolution:

```sh
flb-package-linker status
```

Check for missing local symlinks or duplicate Fleetbase package versions in `console/pnpm-lock.yaml`:

```sh
flb-package-linker doctor
```

Preview FleetOps linking without changing files:

```sh
flb-package-linker enable fleetops --shared ember-core ember-ui fleetops-data --dry-run
```

Enable FleetOps local development links:

```sh
flb-package-linker enable fleetops --shared ember-core ember-ui fleetops-data
flb-package-linker install
```

Enable multiple extensions at once:

```sh
flb-package-linker enable fleetops pallet --shared ember-core ember-ui fleetops-data
flb-package-linker install
```

Run the install/update step for specific extensions:

```sh
flb-package-linker install fleetops pallet
```

Preview the install/update commands without running them:

```sh
flb-package-linker install --dry-run
```

Reset all local development links managed by the linker:

```sh
flb-package-linker reset
flb-package-linker install
```

Preview a full reset without changing files:

```sh
flb-package-linker reset --dry-run
```

Enable only a shared frontend package:

```sh
flb-package-linker enable-shared ember-ui
flb-package-linker install
```

Enable the backend-only Core API package:

```sh
flb-package-linker enable-shared core-api
flb-package-linker install core-api
```

Disable local links and restore saved registry ranges:

```sh
flb-package-linker disable fleetops pallet
flb-package-linker disable-shared ember-core ember-ui fleetops-data core-api
flb-package-linker install fleetops pallet core-api
```

Run installs automatically after enabling:

```sh
flb-package-linker enable fleetops --shared ember-core ember-ui fleetops-data --install
```

### What It Changes

Depending on the command, `flb-package-linker` may update:

- `console/package.json`
- `console/pnpm-workspace.yaml`
- `console/.npmrc`
- `api/composer.json`
- `.fleetbase-dev-links.json`

The `.fleetbase-dev-links.json` file stores original dependency ranges so links can be reversed. It is ignored by git.

For pnpm, the linker moves non-auth `public-hoist-pattern[]` settings from `console/.npmrc` into `console/pnpm-workspace.yaml`, keeps registry auth in `.npmrc`, and sets workspace linking options for local shared packages.

## `docker-install.sh`

`docker-install.sh` is the interactive Fleetbase Docker setup wizard. It checks required local tools, asks for core environment settings, generates local configuration, and guides Docker Compose setup.

Run the interactive wizard:

```sh
bash scripts/docker-install.sh
```

Run with defaults for non-interactive environments:

```sh
bash scripts/docker-install.sh --non-interactive
```

The script expects Docker, Docker Compose v2, git, and OpenSSL to be available. It warns when common Fleetbase ports are already in use but does not treat that as a hard failure.

## Validation

Check the package linker script:

```sh
node --check scripts/package-linker.mjs
node --test scripts/package-linker.test.mjs
```

Check shell syntax for the Docker installer:

```sh
bash -n scripts/docker-install.sh
```
