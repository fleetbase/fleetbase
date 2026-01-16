# 🚀 Fleetbase v0.7.26 — 2025-01-16

> "Improved Driver Validation + API improvements"

---

## ✨ Highlights
- Improved driver creation validation for internal API
- Vehicle and Driver API use explicit `::create` method now
- Improved onboarding orchestrator framework and services for history and resume capability
- Upgraded Stripe SDK to v17

---

## ⚠️ Breaking Changes
- None 🙂

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

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/ember-ui/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
