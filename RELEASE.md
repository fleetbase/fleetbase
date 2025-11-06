# 🚀 Fleetbase v0.7.16 — 2025-11-06

> "New onboarding orchestrator, improved password security, UI improvements, bug fixes"

---

## ✨ Highlights
- Made the `LogApiRequests` middleware more robust
- Fixed controller validation handling
- Added microsoft365/graph mail driver
- Improved password requirements (including breached password check)
- Patched creating duplicate users by email in IAM
- Patch env mapper
- Vehicle/driver tracking API doesnt fire resource lifecycle events or log requests - only tracking events
- Patched `<ModelCoordinatesInput />` component
- Security patch on Storefront customers API
- Styling updates on Storefront

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