> v0.7.36 ~ "Geofence events and logs added"
---
## ✨ Highlights
Added Geofencing.

---
## 🐛 Bug Fixes
- Fixed the order import template download location
- Added the new Geofence feature and events
- Added ability to apply service quotes to created orders via update API

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
- **fleetbase**: v0.7.36
- **fleetops**: v0.6.44
- **fleetops-data**: v0.1.29
- **core-api**: v1.6.43

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)