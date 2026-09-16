> v0.7.61 ~ "Hotfix: hidden tooltips and popovers in production builds"

---
## Highlights
Fleetbase `0.7.61` is a hotfix release. Since `0.7.60`, every tooltip and popover in production Console builds rendered visible without a hover. Ember UI `0.4.2` fixes the build configuration that caused it.

---
## Component Versions
- `console`: `0.7.61`
- `core-api`: `1.6.62`
- `fleetops`: `0.6.66`
- `fleetops-data`: `0.2.1`
- `ember-ui`: `0.4.2`

---
## Ember UI
- Fixed `Attach::Tooltip` and `Attach::Popover` showing at full opacity without a hover in production builds.
- Ember UI `0.4.1` started passing the host's browser targets to PostCSS Preset Env. With the Console's modern targets, nested CSS was no longer flattened, and the production CSS minifier could not parse the nested attacher rules that keep attachments hidden. Nesting is now always flattened, whatever the targets.
- Added a build test that compiles and minifies the attacher styles for the Console's targets and checks that the hide rules survive.

---
## Console and API Packages
- Bumped the root Docker image version to `0.7.61`.
- Bumped Console to `0.7.61`.
- Updated the Console dependency for `@fleetbase/ember-ui` to `^0.4.2`.
- Updated the `ember-ui` submodule to its `v0.4.2` release tag.

---
## Bug Fixes
- Fixed tooltips and popovers appearing without a hover in production Console builds.

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
