# 🚀 Fleetbase v0.7.25 — 2025-12-29

> "New SMS service to support multiple SMS providers + framework improvements"

---

## ✨ Highlights
- Removed `window.Fleetbase` for improved frontend security
- Improved query optimizations
- Added new SMS service to support multiple SMS providers

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

---

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/ember-ui/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
