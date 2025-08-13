# 🚀 Fleetbase v0.7.9 — 2025-08-13

> “Template variable resolver + patch vehicle update on order via API”

---

## ✨ Highlights
- Patched vehicle assignment update on orders via API
- Added ability to use variables in order config activity objects for the `status` and `details` properties
- Tigher data retention time by maintenance scripts

### Variable Usage
Now in your activity status and details fields you can do things like "Driver completed {waypoint.type}" or "{capitalize waypoint.type} has been completed". These use of variables will then be resolved, say "waypoint.type" = "pickup", then in the inserted activity status those examples would resolve to "Driver completed pickup", and "Pickup has been completed".

---

## ⚠️ Breaking Changes
- None 🙂

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