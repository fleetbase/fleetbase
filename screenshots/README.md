# Console screenshots

Captures the Fleet-Ops console screenshots that [fleetbase.io](https://github.com/fleetbase/fleetbase.io) publishes under `public/images/screenshots/fleet-ops/`, and — in CI — opens a pull request on that repo when any of them actually changed.

> **Local output is not byte-comparable to CI.** macOS rasterizes glyphs through CoreText and Linux through FreeType, so a native `npm run capture` on a Mac produces visually correct screenshots that compare as *changed* against every published file. Use the container recipe below before trusting a local `compare`. This is the first thing to know about this package, because otherwise the first person to run `compare` locally files a bug against a gate that is working correctly.

## What it does

1. Logs in against the internal API and seeds the session token straight into `localStorage`, skipping the login form and its onboarding redirects.
2. Resolves detail-page URLs at runtime — the seeders assign a fresh uuid to every record on every run, so `public_id` cannot live in the manifest.
3. Drives Chromium through `manifests/fleet-ops.mjs` in both themes, waiting for the app to actually be still before each capture.
4. Compares each result against the published file both perceptually and structurally, and stages only the ones that changed for real.

## Running it locally

Boot the stack from this branch:

```bash
cp api/.env.example api/.env
sudo rm -rf docker/database/mysql && mkdir -p docker/database/mysql
docker build --file docker/Dockerfile --target app-release \
  --build-arg GITHUB_AUTH_KEY="$GITHUB_AUTH_TOKEN" \
  --tag fleetbase/fleetbase-api:latest .
bash scripts/docker-install.sh --non-interactive
```

Seed the demo organization and the Fleet-Ops fixtures:

```bash
docker compose exec -T -e CI_DEMO_PASSWORD='DemoPassw0rd!' application \
  php artisan tinker --execute="eval(base64_decode('$(base64 -i scripts/ci/seed-demo-org.php | tr -d '\n')'));"
```

```bash
docker compose exec -T application php artisan db:seed --force --class="Fleetbase\FleetOps\Seeders\Demo\DemoSeeder"
```

Capture:

```bash
cd screenshots && npm ci && npx playwright install --with-deps chromium
```

```bash
BASE_URL=http://localhost:4200 API_HOST=http://localhost:8000 DEMO_IDENTITY=demo@fleetbase.io DEMO_PASSWORD='DemoPassw0rd!' npm run capture -- --out ./out
```

Useful flags while iterating on a single screen:

```bash
npm run capture -- --only drivers-list --out ./out
```

`--offline-tiles` refuses to fetch a map tile that is not already cached, which is how you prove a run has no live network dependency left.

### A run that is comparable to CI

Same Chromium build, same font stack, same everything:

```bash
docker run --rm -v "$PWD/screenshots:/work" -w /work \
  --add-host=host.docker.internal:host-gateway \
  -e BASE_URL=http://host.docker.internal:4200 \
  -e API_HOST=http://host.docker.internal:8000 \
  -e DEMO_IDENTITY=demo@fleetbase.io -e DEMO_PASSWORD='DemoPassw0rd!' \
  -e PLAYWRIGHT_IMAGE_TAG=v1.62.1-noble \
  mcr.microsoft.com/playwright:v1.62.1-noble \
  sh -c 'npm ci && npm run capture -- --out ./out'
```

`PLAYWRIGHT_IMAGE_TAG` is checked against the pinned npm version at startup — a skew means two different Chromium builds, and captures from different rasterizers are not comparable.

Then compare against a real checkout:

```bash
git clone git@github.com:fleetbase/fleetbase.io.git ../fleetbase.io
```

```bash
npm run compare -- --new ./out --current ../fleetbase.io/public/images/screenshots/fleet-ops --dry-run
```

`--dry-run` reports without copying, and writes pixel diffs to `out/diff/`.

## The two gates

A byte comparison is useless here: two runs of the same UI produce different bytes, which is the entire problem this package exists to contain. So a file is published only when **both** of these agree that something happened.

**Perceptual.** `pixelmatch` at `threshold: 0.1` with `includeAA: false`, and a file counts as changed only if more than 0.2% of its pixels did. On a 2880×1800 image that floor is about a third of a table row — far above residual antialiasing, far below any real UI change.

**Structural.** A SHA-256 of the DOM with volatile attributes stripped (uuids, public_ids, timestamps, Ember-generated ids). Pixels changed but structure identical is treated as rendering noise and skipped, with a `::notice::` so it is visible rather than silent.

The second gate exists for one specific failure: a runner image bumps its font package, every glyph shifts a fraction of a pixel, and without a second opinion the job opens a 36-file pull request containing no UI change at all. Watch for a run reporting every file changed — that is the signature.

This is the same move [`erd.yml`](../.github/workflows/erd.yml) makes after `49371ff`: gate on the deterministic input, not on what the non-deterministic renderer produced from it. A screenshot has no checked-in input, so `src/domhash.mjs` manufactures one.

With no cached baseline (a first run on a new branch) the gate degrades to pixel-only. That is deliberate — it must never be stricter than the pixel gate alone, or a real change would be dropped silently.

## Adding an entry

Entries live in `manifests/fleet-ops.mjs`. The filename must match what fleetbase.io already publishes, or the pull request adds a file nobody references instead of updating one people see.

Every list view must declare `expectRows`. Without it, a table that renders empty because the seeder did not populate that resource screenshots as a perfectly successful run, and the empty state ships to the website.

**The selectors in the manifest are provisional.** Fleet-Ops reaches the console as the published `@fleetbase/fleetops-engine` npm package, not as source in this repo, so they were written structurally rather than confirmed against a running app. Verify each one with `--only <id>` and replace it with a `data-test-id` where the engine provides one.

## Dark and light

Dark owns the unsuffixed filename. That is not a style preference: every file currently published is dark (measured — mean luminance 29.7/255), and the marketing pages reference them as literal strings like `/images/screenshots/fleet-ops/fleet-ops-drivers-list.webp`. Suffixing dark would rename all ~150 of them and break every page that renders one.

Light variants land as `-light.webp`. They are purely additive; nothing on the site consumes them yet. The suffix *is* the contract — a themed image component on fleetbase.io can derive the other path by rule, with no manifest and no per-image wiring.

## Dependencies are pinned exactly

No `^`, no `~`. `sharp` bundles libwebp, so a patch bump re-encodes every file byte-differently; `playwright` bundles the Chromium that does the rasterizing. Bumping either is a deliberate act that produces one large, expected churn pull request — not something to let a lockfile refresh do by accident.

## In CI

[`.github/workflows/screenshots.yml`](../.github/workflows/screenshots.yml) runs on pushes to `dev-v*` that touch the console, the API version, the Docker stack or this package. `[skip screenshots]` in a commit message is the escape hatch; `workflow_dispatch` with `dry-run` exercises the whole path without opening a pull request.

Nothing auto-merges, but there is no review gate between "the job decided something changed" and "a pull request appears on the public marketing site" — the pull request itself is the review.

## Requires the Fleet-Ops Demo seeder

`db:seed --class="Fleetbase\FleetOps\Seeders\Demo\DemoSeeder"` ships in `fleetbase/fleetops`, and CI installs Fleet-Ops from Composer (`api/composer.json` pins `fleetbase/fleetops-api`), **not** from the `packages/fleetops` submodule. Bumping the submodule pointer changes nothing that runs. The ordering is:

1. Merge the Demo seeders into `fleetbase/fleetops` and cut a release.
2. Bump `api/composer.json` and `api/composer.lock` here.
3. The workflow's seed step resolves.

Until then, run the workflow via `workflow_dispatch` with `fleetops-ref` set to the fleetops branch — it overlays that source over the published package inside the running container.
