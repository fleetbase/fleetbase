> v0.7.34 ~ "Simply set orchestration constraint default valalues"
---
## ✨ Highlights
This is a very simple release which sets default values for orchestrator contraints on order creation.

---
## 🐛 Bug Fixes

### FleetOps — Orchestrator Capacity Columns
- **[fleetops]** fix: prevent orchestrator_priority null constraint violation on order creation [PR](https://github.com/fleetbase/fleetops/pull/228)


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
## 📦 Component Versions
- **fleetbase**: v0.7.34
- **fleetops**: v0.6.41
- **ledger**: v0.0.2

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)