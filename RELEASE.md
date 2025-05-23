# 🚀 Fleetbase v0.7.2 — 2025-05-22

> “Patched route optimization, telemetry and storefront networks.”

---

## ✨ Highlights
- Minor tweak for Telemetry support.
- Improved builds for `DISABLE_RUNTIME_CONFIG=true`
- Patched and fixed OSRM route optimization
- Patched and fixed Storefront network store management & category management

---

## ⚠️ Breaking Changes
- None 🙂

---

## 🆕 Features
- **Telemetry** — tweak patch for improvement.
- **Route Optimization** — improved route optimization on create order.

---

## 🐛 Fixes
- `DISABLE_RUNTIME_CONFIG` works at build time in addition to boot process.
- OSRM route optimization fixed.
- Edit, delete categories for network stores
- Remove stores from network, re-assign or remove store from category

## 🔧 Upgrade Steps
```bash
# Pull latest version
git pull origin main --no-rebase

# Update docker
docker compose down && docker compose up -d
```

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)