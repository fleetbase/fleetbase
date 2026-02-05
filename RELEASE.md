# 🚀 Fleetbase v0.7.27 — 2026-02-05

> "Improvements and patches"

---

## ✨ Highlights
- Core now supports disabling cache in runtime for `HasApiModelCache` x `HasApiModelBehavior`
- Added new `FileResolverService` to support file resolution from file resources, URL's, base64, and file uploads [190c03d](https://github.com/fleetbase/core-api/pull/187/commits/190c03d484648319f3d890439f74e45820f352fc)
- `VerificationCode` model in core always throws SMS exceptions
- FleetOps: Patched proof of delivery component in order details
- FleetOps: Improved and patched service rate `getServicableForPlaces` which improved service quote performance
- FleetOps: Fix location GeoJSON Point casting for `location` properties - using the new `Utils::castPoint` utility [208151f](https://github.com/fleetbase/fleetops/pull/202/commits/208151f37ece54bb23cfeeebdbb6fde1142908f7)
- Storefront: Critical patch for QPay checkout workflow [storefront#66](https://github.com/fleetbase/storefront/pull/66)
- Storefront: Added new phone number verification endpoints for customers (`request-phone-verification` and `verify-phone-number`)
- Storefront: Fixed cart based service quotes

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
