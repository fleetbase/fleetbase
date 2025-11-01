# 🚀 Fleetbase v0.7.15 — 2025-11-01

> "Optimization tune-up, prevent queue blockage"

---

## ✨ Highlights
- Create surgical optimziations around metadata option data, as well as order methods to prevent trigger lifecycle jobs.
- Updated order `setDistanceAndTime` to prevent lifecycle job triggers, order estimation tracking limited to orders within past 2 days instead of month, now runs every 10 minutes instead of 5 minutes.

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