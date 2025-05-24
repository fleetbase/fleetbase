# 🚀 Fleetbase v0.7.3 — 2025-05-24

> “Hotfix: route optimization without driver, fleetbase seeder command”

---

## 🐛 Fixes
- Improved the Fleetbase seeder command
- Patched route optimization to work without driver as starting position

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
docker exec -ti fleetbase-application-1 bash
sh deploy.sh
```

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)