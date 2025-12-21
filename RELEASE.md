# 🚀 Fleetbase v0.7.24 — 2025-12-21

> "Critical core-api patches for cache key generation"

---

## ✨ Highlights

### Bug Fixes
- **Fixed cache key collision bug** - Different filter parameters (e.g., `type=customer` vs `type=contact`) now generate unique cache keys instead of returning wrong cached results
- **Fixed BadMethodCallException** - Models without soft deletes (like Permission) no longer crash when calling `getDeletedAtColumn()`

### Improvements
- **Added caching to Permission model** - Permission queries now benefit from Redis caching for improved performance

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
