> v0.7.50 ~ "Tab navigation state persistence"

---
## Highlights
Fleetbase `0.7.50` is a small stability release for shared tab navigation behavior. This release updates Fleetbase Console `0.7.50` and Ember UI `0.3.40`.

---
## Component Versions
- `console`: `0.7.50`
- `ember-ui`: `0.3.40`

---
## Shared UI
- Improved `TabNavigation` so refreshed tab lists preserve the current active tab when it still exists.
- Added a safer fallback so tab navigation only returns to the first tab when the active tab has actually been removed.
- Added regression coverage for refreshed tab arrays and removed active tabs.

---
## Bug Fixes
- Fixed tab navigation resetting the active state unnecessarily when tab arrays were refreshed.

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
