# 🚀 Fleetbase v0.7.4 — 2025-05-26

> “Added an official docker install script”

---

## ✨ Highlights
- Added logic condition property shortcuts for `pickup`, `dropoff`, and `currentWaypoint` (with aliases `waypoint` and `currentWaypointMarker`)

---

## 🐛 Fixes
- Patched: Saving Fleet-Ops notification settings 

---

## ⚠️ Breaking Changes
- None 🙂

---

## 🔧 Upgrade Steps
```bash
# Pull latest version
git pull origin main --no-rebase

# Update docker
docker compose down && docker compose up -d

# Run deploy script
docker compose exec application bash -c "./deploy.sh"
```

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)