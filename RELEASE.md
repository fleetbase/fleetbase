# 🚀 Fleetbase v0.7.18 — 2025-11-10

> "Hotfix IAM user validation, make online/offline toggle silent"

---

## ✨ Highlights
- Hotfix validateRequest implementation to not rewrite request params
- Hotfix user validation password optional for creation
- Made online/offline endpoint for drivers silent
- Hotfix QPay payment gateway on Storefront + ebarimt reciept fix

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