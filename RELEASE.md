# 🚀 Fleetbase v0.7.28 — 2026-02-05

> "Critical patch: eager load driver and vehicle in consumable orders query API"

---

## ✨ Highlights
- Critical patch which fixes eager loading relationship when querying orders via the consumable API, this is done to handle the new `whenLoaded` resource conditional methods. [fleetbase/fleetops#203](https://github.com/fleetbase/fleetops/pull/203)

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
