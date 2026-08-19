> v0.7.55 ~ "Verification email delivery restored and a fully covered Console"

---
## Highlights
Fleetbase `0.7.55` is a quality and reliability release. It ships Core API `1.6.59`, which repairs the verification and credentials mail templates — both failed to compile, so every flow that delivers a code returned an error instead of sending. It also takes the Console test suite from 70% to 100% coverage on all four metrics, turns the coverage gate on so it cannot regress, and fixes ten Console defects found while writing those tests.

---
## Component Versions
- `console`: `0.7.55`
- `core-api`: `1.6.59`

All other modules are unchanged from `0.7.54`.

---
## Core API
- Fixed the verification and user-credentials mail views, which did not compile. Blade only treats `@` as a directive when the preceding character is not a word character — the rule that keeps `foo@bar.com` from compiling — so a greeting written as `Morning@if($user->name)` was left as literal text while its `@endif` compiled normally. The unmatched `endif` broke the enclosing conditional and the view threw on render.
- Restored delivery for every endpoint that sends a code: customer signup, SMS login with email fallback, password reset, account closure, and driver login all returned a `400` carrying the Blade error.
- The defect was introduced in `1.6.56` by the fix for a null user name, and shipped again in `1.6.57` and `1.6.58`. Anyone on those three versions is affected and should upgrade.

---
## Console
- Took the Console test suite from 70% to 100% coverage on lines, statements, functions, and branches, growing it from 577 to 1150 tests.
- Made the coverage gate blocking. `console.yml` runs `coverage:check -- --fail-under=100` without `continue-on-error`, so a regression in any of the four metrics fails the build.
- Fixed infinite recursion in the onboarding orchestrator: skipping a guarded step resolved the same rejected step and handed it back, spinning until the tab died.
- Fixed the installation service treating runloop timer id `0` as "nothing pending", which double-subscribed to the install channel and left a retry firing after listening stopped.
- Fixed a failed dashboard metric request leaving the card spinning forever, and dashboard count formatters being called with a params array instead of positional arguments — `money` ignored the configured currency and `date` threw on render.
- Fixed `models/report` owner resolution and export queries, and the lowercase `config.api` key in `models/file` and `models/chat-attachment` that left host and namespace undefined.
- Fixed missing promise returns in `invite/for-user` and admin organization users, a missing `notifications` injection in the two-factor enforcement alert, and an always-true `instanceof Date` check that rendered the two-factor resend countdown as `NaN`.
- Removed `app/resolver.js`, which nothing imported and which would have thrown on every route except `main` had it ever been wired up.

---
## Release and CI
- Fixed the two long-standing Postman contract failures. `List Organizations` and `List Network Stores` each need a credential the collection-level bearer cannot supply, and each expressed that with a raw `Authorization` header. A raw header overrides collection auth on Postman CLI `1.46.0` but not on `1.47.x`, where the collection bearer wins — so both requests were authenticating with the wrong credential and had been failing for several releases. Both now express the override as a request-level auth block.
- Note for collection authors: on a request, `auth:` must be a mapping. The list form is the collection-level shape, and using it on a request removes the request from the collection and aborts the run.
- The `Install Postman CLI` step installs whatever version is current, so contract behavior can change without any change in this repository. Read the CLI version out of the run log before treating a local reproduction as evidence.
- Fixed the ERD refresh workflow, which invoked `koalaman/shellcheck-alpine` with only a script path. That image sets no entrypoint, so Docker executed the script itself and Alpine has no `bash` for its shebang. It only triggers on `dev-v*` branches, so it had never run before this release.

---
## Bug Fixes
- Fixed verification and credentials emails failing to render, which surfaced as `400` responses across signup, login, password reset, account closure, and driver authentication.
- Fixed ten Console defects covering onboarding guards, install retries, dashboard metric and count panels, report models, file and chat-attachment API config, invite acceptance, two-factor enforcement, and the two-factor resend countdown.
- Fixed the Fleet-Ops `List Organizations` contract request authenticating with the organization API key instead of the platform API token.
- Fixed the Storefront `List Network Stores` contract request authenticating with the store key instead of the network key.

---
## API Changes
- No endpoint contracts changed. The Core API fix restores endpoints that were returning `400` because the mail view threw during rendering; request and response shapes are unchanged.

---
## Upgrade Steps
```bash
# Pull latest version
git pull origin main --no-rebase
# Update docker
docker compose pull
docker compose down && docker compose up -d
# Run deploy script
docker compose exec application bash -c "./deploy.sh"
```

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
