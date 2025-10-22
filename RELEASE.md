# 🚀 Fleetbase v0.7.12 — 2025-10-22

> “Patches”

---

## ✨ Highlights
- Improvements to Fleet-Ops orders Kanban view, filter by order type and search/filters working.
- Patches to food truck API.
- Patches to multiple waypoints API handling.

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