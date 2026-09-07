> v0.7.58 ~ "Fleet-Ops nested resource expansion hardening"

---
## Highlights
Fleetbase `0.7.58` updates Fleet-Ops to `0.6.64` with nested resource expansion hardening. This release keeps Order, Driver, Vehicle, and Fleet API responses safer when parent requests include expanded relations that do not belong to nested Fleet-Ops resources.

---
## Component Versions
- `console`: `0.7.58`
- `fleetops`: `0.6.64`

---
## Fleet-Ops
- Hardened public Vehicle and Fleet resource expansion so nested resources ignore parent-only relation requests.
- Fixed Order and Driver responses that include nested vehicles or fleets while the parent request expands fields such as `payload` or `driverAssigned.vehicle`.
- Preserved direct Fleet, Vehicle, and Driver endpoint expansion behavior while filtering invalid nested relation roots.
- Added regression coverage for nested Vehicle and Fleet resource serialization.

---
## Console and API Packages
- Bumped the root Docker image version to `0.7.58`.
- Bumped Console to `0.7.58`.
- Updated Console package dependency for `@fleetbase/fleetops-engine` `^0.6.64`.
- Updated API package dependency for `fleetbase/fleetops-api` `^0.6.64`.
- Updated the Fleet-Ops submodule to `v0.6.64`.

---
## Bug Fixes
- Fixed nested Fleet-Ops resources reading parent `with` parameters and trying to load unrelated relationships.
- Fixed serialization failures caused by parent relation names being applied to nested Vehicle and Fleet resources.

---
## API Changes
- Fleet-Ops public resources now validate requested relation roots against the wrapped model before loading nested expansions.
- Nested Fleet and Vehicle resources no longer attempt to load parent-only relations from Order or Driver API requests.

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
