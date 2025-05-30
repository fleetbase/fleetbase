# 🚀 Fleetbase v0.7.5 — 2025-05-30

> “Route optimization and routing control advancements”

---

## ✨ Highlights
- Added route optimization and routing control services for registering additional routing engines and route optimization services.
- Added settings for Routing (Next release will be able to set unit "Miles" or "Kilometers")
- Improved and optimized environment and settings mapper.
- Added entity activity events
- Patched multiple waypoint order creation via API

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