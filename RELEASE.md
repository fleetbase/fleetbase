# 🚀 Fleetbase v0.7.8 — 2025-08-12

> “Improved system maintenance”

---

## ✨ Highlights
- Improved and optimizes maintenance scripts
- Patched OSX binary build

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