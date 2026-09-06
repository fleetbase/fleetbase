> v0.7.57 ~ "Fleet-Ops public API expansion and Storefront QPay checkout fixes"

---
## Highlights
Fleetbase `0.7.57` updates the release stack for Fleet-Ops `0.6.63` and Storefront `0.4.21`. This release expands public Fleet-Ops API contracts for fleets, vehicles, and drivers, restores QPay checkout reliability in Storefront, and aligns the root release branch with the newer `release/v*` publishing flow.

---
## Component Versions
- `console`: `0.7.57`
- `fleetops`: `0.6.63`
- `storefront`: `0.4.21`

---
## Fleet-Ops
- Expanded public Fleet, Vehicle, and Driver API contracts with clearer relationship handling and resource expansion support.
- Added public relationship helpers for resolving relation UUIDs, public identifiers, request validation, and resource fields.
- Added membership uniqueness protection for fleet relationship pivots.
- Fixed null and empty relationship inputs so absent relationships are treated safely instead of raising errors.
- Fixed retrieve-time expansion mapping where the request object is not injected.
- Fixed live fleet map settings behavior so tracked settings requests are not mutated unexpectedly.
- Updated Fleet-Ops release workflows so server, Ember, and Postman checks run correctly on `release/v*` branches.
- Restored driver vendor names in the drivers list by using the `vendor_name` value already returned by the API.
- Fixed internal fleet index, edit, and details route expansion by using Fleet model relationship names for fleet relations.

---
## Storefront
- Restored QPay checkout by fixing callback URL handling and preventing QPay access tokens from being cached past their real expiry.
- Refactored testing seeders into reusable complete store and network fixtures.
- Fixed network category relation and owner type behavior for Storefront network models.
- Updated Storefront release metadata and notes for `0.4.21`.

---
## Console and API Packages
- Bumped the root Docker image version to `0.7.57`.
- Bumped Console to `0.7.57`.
- Updated Console package dependencies for `@fleetbase/fleetops-engine` `^0.6.63` and `@fleetbase/storefront-engine` `^0.4.21`.
- Updated API package dependencies for `fleetbase/fleetops-api` `^0.6.63` and `fleetbase/storefront-api` `^0.4.21`.
- Updated the Fleet-Ops and Storefront submodules to their latest release tags.

---
## Bug Fixes
- Fixed Fleet-Ops public API relationship expansion and null relationship handling.
- Fixed Fleet-Ops fleet membership duplication safeguards.
- Fixed Fleet-Ops live fleet map settings mutation behavior.
- Fixed Fleet-Ops driver vendor names and internal fleet relation expansion requests.
- Fixed Storefront QPay callback URL and token expiry behavior.
- Fixed Storefront testing fixture structure for complete store and network scenarios.

---
## API Changes
- Fleet-Ops public Fleet, Vehicle, and Driver APIs now expose expanded contract support for relationship fields and public identifiers.
- Fleet-Ops adds fleet membership uniqueness constraints through a release migration.
- Fleet-Ops internal fleet views now request relation expansions using Fleet model relationship names.
- Storefront QPay checkout now refreshes access tokens according to their real expiry and uses corrected callback URL wiring.
- The root release branch now tracks Fleet-Ops `0.6.63` and Storefront `0.4.21` in both Console and API package dependencies.

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
