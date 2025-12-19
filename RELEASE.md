# 🚀 Fleetbase v0.7.23 — 2025-12-19

> "🤯 Insane optimization and performance upgrades + horizontal scaling support 🚀"

---

## ✨ Highlights

- Major performance and optimization improvements which support horizontal scaling
- Ability to resize images on upload using resize parameters
- Several patches in FleetOps - fixed service rates and missing translations, improvements and patch to scheduler
- Added a new `LanguageService` available in ember-core
- Minor `@fleetbase/ember-ui` improvements

### New Features
- **Improved API performance** with two-layer caching system (Redis + ETag validation) for user and organization data
- **Reduced bandwidth usage** with automatic HTTP 304 Not Modified responses via new ValidateETag middleware
- **Faster page loads** with intelligent cache invalidation that updates immediately when data changes
- **New UserCacheService class** for centralized cache management across the application
- **Image resizing support** for dynamic image dimensions via URL parameters
- Added `ApiModelCache` class - Provides intelligent Redis-based caching for API query results with automatic invalidation
- Added `HasApiModelCache` trait - Enables models to cache query results with a single method call

### Performance Improvements
- Optimized form data syncing to eliminate N+1 query problems, reducing database queries from N to 2 for relationship syncing
- Implemented cache stampede prevention to handle high concurrent load efficiently
- Added cache versioning system for automatic invalidation when data changes

### Developer Experience
- Added `X-Cache-Status` header to API responses for easy cache debugging (HIT/MISS visibility)
- Automatic multi-tenant cache key generation for company-scoped data isolation
- Graceful fallback to direct queries when cache is unavailable

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
