> v0.7.55 ~ "Verification and credentials email delivery restored"

---
## Highlights
Fleetbase `0.7.55` is a small, focused patch release. It ships Core API `1.6.59`, which repairs the verification and credentials mail templates: both failed to compile, so every flow that delivers a code — customer signup, SMS login with email fallback, password reset, account closure, and driver login — returned an error instead of sending. No other module changed in this release.

---
## Component Versions
- `console`: `0.7.55`
- `core-api`: `1.6.59`
- `fleetops`: `0.6.60`
- `customer-portal`: `0.0.13`
- `storefront`: `0.4.19`
- `ledger`: `0.0.10`

---
## Core API
- Fixed the verification and user-credentials mail views, which did not compile. Blade only treats `@` as a directive when the preceding character is not a word character — the rule that keeps `foo@bar.com` from compiling — so a greeting written as `Morning@if($user->name)` was left as literal text while its `@endif` compiled normally. The unmatched `endif` broke the enclosing conditional and the view threw on render.
- Restored delivery for every endpoint that sends a code: customer signup, SMS login with email fallback, password reset, account closure, and driver login all returned a `400` carrying the Blade error.
- The defect was introduced in `1.6.56` by the fix for a null user name, and shipped again in `1.6.57` and `1.6.58`. Anyone on those three versions is affected and should upgrade.

---
## Release and CI
- Fixed the two long-standing Postman contract failures. `List Organizations` and `List Network Stores` each need a credential the collection-level bearer cannot supply, and each expressed that with a raw `Authorization` header. A raw header overrides collection auth on Postman CLI `1.46.0` but not on `1.47.x`, where the collection bearer wins — so both requests were authenticating with the wrong credential and had been failing for several releases. Both now express the override as a request-level auth block.
- Note for collection authors: on a request, `auth:` must be a mapping. The list form is the collection-level shape, and using it on a request removes the request from the collection and aborts the run.
- The `Install Postman CLI` step installs whatever version is current, so contract behavior can change without any change in this repository. Read the CLI version out of the run log before treating a local reproduction as evidence.

---
## Bug Fixes
- Fixed verification and credentials emails failing to render, which surfaced as `400` responses across signup, login, password reset, account closure, and driver authentication.
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
