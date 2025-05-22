# 🚀 Fleetbase v0.7.1 — 2025-05-22

> “Finally, official docker images and binary builds for the upcoming Omnibus.”

---

## ✨ Highlights
- Introduction to Telemetry for improving Fleetbase and setup experiences.
- Added runtime config for Fleetbase Console (`./console/fleetbase.config.json`), no more rebuilding the frontend to update config.
- Official Fleetbase API and Console docker images published. `docker compose up` now uses the official images for faster setup - no more building.
- Performance optimization and improvements to the FleetOps Order API. Faster responses.
- Patched waypoint activity flow and proof of delivery QR scanning and photo capture API.
- Added ability to view waypoint activity status and labels if no entities attached to order.
- Fixed Timezone issues in Navigator app (v2.0.5)
- Improved Navigator app performance and UX (v2.0.5) - New "Waypoint Completed" dialog.
- Improved socket implementation on FleetOps.
- Added two new order activity events for listeners `order.waypoint_activity` and `order.waypoint_completed`
- Added Navigator App email verification code fallback if SMS is unable to send (v2.0.5).

---

## ⚠️ Breaking Changes
- None 🙂

---

## 🆕 Features
- **Navigator App v2.0.5** — Improved Navigator App Performance and UX for better experience.
- **Official Docker Images** — Official Docker images on [Docker Hub](https://hub.docker.com/u/fleetbase) 
- **Binary Builds** — Fleetbase API Binary for both Linux and MacOS - `sh ./fleetbase php-server`
- **Telemetry** — opt-in daily ping with anonymized usage stats for system improvements.

---

## 🐛 Fixes
- Activity flow fixed for waypoints.
- Better implementation of socket listeners in console.
- Activity events and notifications streamlined.

## ⚙️ Using the new Console Runtime Config
- Open `./console/fleetbase.config.json`
- Edit configurable properties in JSON: `API_HOST` - `SOCKETCLUSTER_HOST` - `SOCKETCLUSTER_PORT` - `OSRM_HOST`
- Save and reload Fleetbase Console in the browser.
- 💥 Boom! Config changes applied at runtime.

## 🔧 Upgrade Steps
```bash
# Pull latest version
git pull origin main --no-rebase

# Update docker
docker compose down && docker compose up -d

# Run updrade
docker exec -ti fleetbase-application-1 bash
sh deploy.sh
```

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)