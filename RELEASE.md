> v0.7.38 ~ "Provider-agnostic maps, UI polish, and data-model hardening"
---
## ✨ Highlights
This release focuses on the new provider-agnostic mapping work in FleetOps, foundational UI improvements in Ember UI, data-layer hardening in FleetOps Data, and expanded default platform capabilities through bundled routing extensions. Together these changes make the map stack more flexible, improve large resource workflows across desktop browsers, tighten the model/serializer behavior used by maintenance, orders, and upcoming recurring scheduling flows, and ship VROOM and Valhalla pre-installed with Fleetbase by default.

---
## 📦 Component Versions
- `fleetops`: `0.6.46`
- `fleetops-data`: `0.1.31`
- `ember-ui`: `0.3.29`
- `core-api`: `1.6.45`
- `vroom`: `0.0.4`
- `valhalla`: `0.0.4`

---
## 🧩 Default Extensions
- Fleetbase now ships the `vroom` and `valhalla` extensions as default pre-installed extensions.
- `vroom` provides built-in optimization engine support out of the box, including new admin-level defaults and organization-level override settings.
- `valhalla` provides built-in routing and map-services support out of the box, with matching admin and organization settings surfaces for default configuration and per-organization overrides.

---
## 🚚 FleetOps
### Provider-agnostic map architecture
- Added a system-level default map provider flow so platform admins can define the default provider once and organizations can still override it in their own settings.
- Expanded the FleetOps admin map settings UI to manage provider selection alongside provider-specific settings.
- Continued the provider-agnostic live map work so FleetOps can switch more cleanly between Google Maps and Leaflet without route/view logic being tightly coupled to one provider.

### Live map and geofence UX improvements
- Improved Google Maps polygon labeling and hover behavior for service areas and zones so focus-mode labels and tooltips render more reliably.
- Hardened the live-map provider handoff when moving between Orchestrator and the dashboard/live map to avoid stale provider state and map-instance reuse issues.
- Improved route visualization and related map flows around route editing, route optimization, and mixed-stop rendering.

### Orders and payload summary improvements
- Fixed lightweight order index payloads so pickup and dropoff can be derived from first/last waypoint markers without loading the full waypoint collection.
- Corrected route-type summary behavior so waypoint-only orders do not misreport themselves as pickup-and-dropoff routes after lightweight payload hydration.
- Added reusable place-address HTML utilities and helpers, plus a dedicated place-address cell component for more consistent address rendering in the UI.

### Import and place-resolution hardening
- Hardened structured place resolution during order import so explicit city, country, and coordinates remain authoritative instead of being overwritten by loose geocoder matches.
- Improved shared-place deduplication during repeat imports so Fleetbase reuses previously created shared places instead of duplicating them unnecessarily.
- Fixed place-resolution edge cases that could resolve underspecified addresses to the wrong country even when the import row already provided the correct structured location context.

---
## 🧱 FleetOps Data
### Model coverage and serializer correctness
- Added the `recurring-order-schedule` model to FleetOps Data so the frontend data layer has the proper model surface ready for recurring scheduling workflows.
- Extended the maintenance schedule model with explicit `subject_uuid`, `subject_type`, `default_assignee_uuid`, and `default_assignee_type` attributes for cleaner polymorphic state handling.
- Fixed polymorphic embedded serialization across maintenance schedules, maintenances, work orders, orders, waypoints, and entities so serializers stop reaching for parent `*_type` attributes on child models that do not define them.
- Resolved the maintenance schedule creation/update assertion path where related records like vehicles could trigger missing-attribute errors during embedded polymorphic serialization.

---
## 🎨 Ember UI
### Resource actions and dropdown support
- Added first-class dropdown action-button support across tabular layouts, panel header actions, overlays, content panels, and modal footers.
- Improved dropdown rendering so action items can safely omit icons and use either `text` or `label`, making split-button and menu-driven workflows more reusable across apps.
- Preserved button type styling on dropdown triggers so primary and magic action menus render consistently with the rest of the Fleetbase action system.

### Table and layout polish
- Improved the native table scroll-container behavior to better support horizontal resource-table scrolling across browsers and layouts.
- Refined floating pagination behavior for card-grid layouts so large resource sets behave more consistently with tabular layouts.
- Polished shared layout/action surfaces used by FleetOps and other modules, reducing friction for richer resource actions without custom one-off UI code.

### Sidebar and shell UX
- Included the recent sidebar state and transition refinements that made hide/show behavior smoother and more intentional in the app shell.
- Continued the underlying shell/layout cleanup that supports route-specific sidebar control and more predictable overlay/header action rendering.

---
## 🐛 Bug Fixes
- Fixed Google Maps service-area and zone label rendering regressions introduced during the provider abstraction work.
- Fixed live-map transition issues that could leave a stale map provider active after leaving Orchestrator.
- Fixed incorrect order pickup/dropoff blanks on first table load for waypoint-driven payloads.
- Fixed wrong-country place resolution during order import when the spreadsheet already provided structured address context.
- Fixed duplicate shared-place creation on repeated imports of the same structured locations.
- Fixed maintenance schedule polymorphic serialization errors caused by serializers reading `subject_type`-style attributes from related child models.
- Fixed resource action surfaces in Ember UI that previously could not natively support dropdown-based primary actions cleanly.

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
