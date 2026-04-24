> v0.7.37 ~ "Service rate repricing and billing fixes"
---
## ✨ Highlights
Improved the end-to-end service rate flow across FleetOps and Ledger, including repricing existing orders, more flexible service-rate formulas, and better invoice revision handling.

---
## 🐛 Bug Fixes
- Fixed repricing existing orders so applying a new service quote creates a new purchase rate and updates the order correctly
- Fixed transaction rotation so superseded order transactions are voided when a new purchase rate is applied
- Fixed Ledger invoice revision behavior so repriced orders generate a new invoice instead of reusing stale invoice state
- Fixed the order Invoice tab refresh crash caused by the lazy-loaded Ledger extension mounting too early
- Fixed stale order purchase-rate and invoice data after applying updated service quotes
- Fixed per-mile service-rate math and distance unit handling for `m`, `km`, `ft`, `yd`, and `mi`
- Fixed Parcel Rate persistence, editing, and duplicate row issues in the service-rate editor
- Fixed Per Drop-Off persistence, duplicate row issues, and incorrect default range calculations in the service-rate editor
- Fixed public service quote responses so `service_name` and `service_rate_name` are populated correctly
- Fixed parcel quote line-item descriptions to include the matched parcel size
- Added new algorithm variables for counts and normalized distance/time values used in custom service-rate formulas
- Fixed no-quote order transaction currency fallback precedence to use organization currency, then Ledger accounting base currency, then USD
- Fix false email uniqueness errors when updating users

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
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
