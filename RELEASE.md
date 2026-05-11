> v0.7.39 ~ "Order creation hardening, polymorphic customer fixes, and dependency cleanup"
---
## ✨ Highlights
This release is a focused hardening release for order creation, FleetOps Data polymorphic serialization, request timezone handling, dependency resolution, and CI runtime consistency. It fixes a new order-create failure where generic customer polymorphic types could be persisted as a non-existent FleetOps Customer model, restores concrete customer subtype serialization in FleetOps Data, improves request timezone precedence in Core API user enrichment, forces public Fleetbase package resolution through Packagist, and standardizes FleetOps/FleetOps Data CI jobs on Node 22.

---
## 📦 Component Versions
- `fleetops`: `0.6.47`
- `fleetops-data`: `0.1.32`
- `ember-ui`: `0.3.29`
- `core-api`: `1.6.46`

---
## 🚚 FleetOps
### Order customer type normalization
- Added a dedicated order-form customer selection action so the selected customer, `customer_uuid`, and `customer_type` are updated together.
- Ensured order creation submits concrete customer types such as `fleet-ops:contact` or `fleet-ops:vendor` instead of the abstract `fleet-ops:customer` type.
- Added server-side normalization in the internal v1 order create flow so submitted customer UUIDs are resolved against contacts and vendors before persistence.
- Prevented invalid order customer morph classes from being saved when stale or generic internal order payloads are submitted.

### Order creation and routing polish
- Fixed route customer assignment behavior so waypoint/customer changes keep the correct polymorphic type alongside the selected customer UUID.
- Continued cleanup around the order route and payload form after the provider-agnostic map and waypoint payload updates.
- Removed the old CI Node strategy matrix and aligned FleetOps CI with the current Node 22 runtime.

---
## 🧱 FleetOps Data
### Polymorphic customer serialization
- Restored concrete subtype fallback in the order serializer so abstract customer models serialize using their related record type when available.
- Restored the same concrete subtype fallback in the waypoint serializer.
- Prevented selected customer records from serializing as `fleet-ops:customer` when the concrete record is actually a contact or vendor.
- Preserved the existing abstract subtype cleanup for values like `customer-contact`, `customer-vendor`, and `facilitator-vendor`.
- Hardened waypoint polymorphic serialization so null customer relationships serialize safely without dereferencing the missing relationship first.

### Runtime and model follow-up
- Bumped FleetOps Data to `0.1.32`.
- Centralized FleetOps Data CI around Node 22.
- Included the recurring order schedule attribute follow-up from the previous model/serializer hardening work.

---
## 🧩 Core API
### Request timezone precedence
- Updated user enrichment timezone handling so the request timezone is preferred when available.
- Bumped Core API to `1.6.46`.

---
## 📦 Platform Packaging
- Forced public Fleetbase packages to resolve from Packagist so installs and updates use the expected public package source.
- Keeps the default `vroom` and `valhalla` extension versions at `0.0.4`.

---
## 🎨 Ember UI
- Carries forward the `0.3.29` UI improvements from the previous release.
- Includes the latest mobile navbar/sidebar service synchronization and layout refinements already shipped in the current Ember UI package line.

---
## 🐛 Bug Fixes
- Fixed order creation failures caused by `customer_type: fleet-ops:customer` resolving to the non-existent `Fleetbase\FleetOps\Models\Customer` class.
- Fixed order webhook payload generation crashes caused by invalid customer morph classes after order insert.
- Fixed FleetOps Data order and waypoint serializers so selected customer records preserve concrete contact/vendor polymorphic types.
- Fixed waypoint serializer null-relationship handling for customer polymorphic types.
- Fixed request timezone precedence during Core API user enrichment.
- Fixed public Fleetbase package resolution so Composer installs prefer Packagist for public package dependencies.
- Fixed FleetOps and FleetOps Data CI runtime drift by aligning jobs with Node 22.

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
