# 🚀 Fleetbase v0.7.14 — 2025-10-30

> Improved positions replay + meta field editors for drivers and vehicles”

---

## ✨ Highlights
- Added ability to attach telematic devices to vehicles .
- Improved positions replay component to use client side + added step controls - Dropped `MovementTrackerService` from position playback components, use new `PositionPlaybackService` which implements full position playback completely on client side.
- Added pill components for driver, vehicle, device, and order.
- Fix custom fields manager component persistence https://github.com/fleetbase/ember-ui/pull/89
- Improved dashboard isolation mechanism so that dashboard component can be rendered in multiple engines.

---

## ⚠️ Breaking Changes
- None

---

## 🔧 Upgrade Steps
```bash
# Pull latest version
git pull origin main --no-rebase

# Update docker
docker compose pull
docker compose down && docker compose up -d

# Run deploy script
docker compose exec application bash -c "./deploy.sh"
```

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)