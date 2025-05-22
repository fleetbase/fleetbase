# 🚀 Fleetbase v0.7.2 — 2025-05-22

> “OK, Telemetry needed a small tweak.”

---

## ✨ Highlights
- Minor tweak for Telemetry support.
- Improved builds for `DISABLE_RUNTIME_CONFIG=true`

---

## ⚠️ Breaking Changes
- None 🙂

---

## 🆕 Features
- **Telemetry** — tweak patch for improvement.

---

## 🐛 Fixes
- `DISABLE_RUNTIME_CONFIG` works at build time in addition to boot process.


## 🔧 Upgrade Steps
```bash
# Pull latest version
git pull origin main --no-rebase

# Update docker
docker compose down && docker compose up -d
```

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)