# 🚀 Fleetbase v0.7.11 — 2025-10-15

> “Major update is here”

---

## ✨ Highlights
- UI/UX Refactor and improvements.
- Core API added `without` feature for `FleetbaseResource` classes, which filters properties from the JSON response of a resource.
- Added complete Reporting registry to Core API, and supported Schema
- Improved Custom Fields core feature
- FleetOps refactor completed
- Added Analytics -> Reports to FleetOps
- Added Order Kanban Board to Fleet-Ops
- UI/UX Refactor and Improvements
- Storefront patch for sending notifications without FCM/APN configured
- Storefront food truck orders automatically assign driver patch
- Added new complete translations: Arabic, Bulgarian, Spanish, French, Mongolian, Portuguese (Brazil), Russian, Vietnamese, and Chinese
- Custom Fields for all resources now here.

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