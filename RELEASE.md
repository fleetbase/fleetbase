> v0.7.51 ~ "AI prompt availability and DateTimeInput stability"

---
## Highlights
Fleetbase `0.7.51` is a focused stability release for Fleetbase AI runtime access and shared date-time input editing. This release updates Fleetbase Console `0.7.51`, AI `0.0.2`, and Ember UI `0.3.41`.

---
## Component Versions
- `console`: `0.7.51`
- `ai`: `0.0.2`
- `ember-ui`: `0.3.41`

---
## Fleetbase AI
- Added a non-admin runtime status endpoint so authenticated users can see and use the AI prompt when Fleetbase AI is enabled.
- Kept provider configuration and admin metadata behind the existing admin-only config endpoint.
- Added server-side guards so disabled AI blocks task creation, preview, and apply requests.
- Updated the AI header tray button and AI service to use the runtime availability flow.

---
## Shared UI
- Fixed `DateTimeInput` controlled editing so schedule fields do not reset while users type or select values.
- Preserved ISO datetime string hydration for initial values.
- Stopped emitting null callbacks for incomplete native date/time input states.
- Added focused regression coverage for the DateTimeInput editing flow.

---
## Bug Fixes
- Fixed Fleetbase AI prompt availability for non-admin authenticated users when AI is enabled.
- Fixed disabled AI allowing task creation, preview, or apply requests.
- Fixed DateTimeInput resync behavior that could clear order schedule inputs during editing.

---
## API Changes
- Added a Fleetbase AI runtime status endpoint for authenticated users.
- Added disabled-AI guards to AI task creation, preview, and apply endpoints.

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
