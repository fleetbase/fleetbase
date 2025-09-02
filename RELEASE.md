# 🚀 Fleetbase v0.7.10 — 2025-09-02

> “Preparing for a major update”

---

## ✨ Highlights
- Added new core Report and Alert models to enable report generation and alerts
- Added new FleetOps models to enhance maintenance and telematics: Maintenance, WorkOrder, Asset, Equipment, Part, Sensor, Telematic 
- Added new `HasCustomFields` trait to enable custom fields on resources
- Added ability to filter storefront metrics with date range input
- Patched customers widget in storefront
- Patched payment gateway management in storefront
- Added ability to set default order config to stores and networks
- Critical patches for stripe integration in Storefront
- Other quality patches in storefront

---

## ⚠️ Breaking Changes
- ⚠️ `VehicleDevice` and `VehicleDeviceEvent` has been deprecated and changed to `Device` and `DeviceEvent`

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