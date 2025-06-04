# 🚀 Fleetbase v0.7.6 — 2025-06-04

> “Minor patches and route optimization overhaul progress”

---

## ✨ Highlights
- Preparing to implement full multi-order/payload route optimization and managed routes.
- Patched scheduler to not run in CI environments or without database connection established.
- 2 New route optimization extensions published! VROOM & Valhalla

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