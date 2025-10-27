# 🚀 Fleetbase v0.7.13 — 2025-10-28

> “Connectivity Module + Positions Playback + Positions & Device Events Drawer”

---

## ✨ Highlights
- Introduces the new Connectivity module in Fleet-Ops for managing telematics, devices, sensors with native support for Flespi, Geotab, and Samsara built in.
- Introduces Position replay for Vehicles
- Added new live map drawer tabs "Positions", and "Events" to view all trackable resources position data, as well as replay positions
- Improved the report query builder + fix drag sort on group by/aggregate fn and order by columns
- Patched entities by destination order view
- Improved movement tracker service to account for spead, improved bearing/heading for accurate playback and live tracking of assets
- Improved tracking endpoint for both vehicles and drivers

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