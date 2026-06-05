> v0.7.43 ~ "Core customer portal, commerce dashboards, financial reporting, and workflow polish"
---
## ✨ Highlights
This release updates Fleetbase Console `0.7.43`, Core API `1.6.50`, Fleet-Ops `0.6.51`, Fleet-Ops Data `0.1.36`, Storefront `0.4.15`, Ledger `0.0.4`, Customer Portal `0.0.11`, Ember Core `0.3.21`, and Ember UI `0.3.33`. The Customer Portal is now a core Fleetbase module for every instance, with a rebuilt customer self-service workspace for orders, billing, support, documents, addresses, team members, payments, and account settings. The release also brings major dashboard refactors for Storefront and Ledger, a richer FleetOps issue and operations workflow, shared chat/documentation UI improvements, and platform fixes for lifecycle webhooks, comments, outbound HTTP tracing, and Octane runtime configuration.

---
## 📦 Component Versions
- `console`: `0.7.43`
- `core-api`: `1.6.50`
- `fleetops`: `0.6.51`
- `fleetops-data`: `0.1.36`
- `storefront`: `0.4.15`
- `ledger`: `0.0.4`
- `customer-portal`: `0.0.11`
- `ember-core`: `0.3.21`
- `ember-ui`: `0.3.33`

---
## 🌐 Customer Portal
### Now a core module
- Promoted Customer Portal into the default Fleetbase API and Console dependency set so every Fleetbase instance includes the portal backend and engine from this version onward.
- Added Customer Portal to Ember Core's core engine list so it loads with the platform instead of behaving like an optional add-on.
- Added Customer Portal API support to the root API provider discovery list, Composer dependencies, Console package dependencies, and default extension configuration.

### Rebuilt self-service workspace
- Added a full customer-facing portal shell with dedicated routes for Home, Orders, Billing, Support, Documents, Address Book, Notifications, Account, and Settings.
- Added order list, order workspace, order details, and new-order flows tailored for portal users, including route preview, payload, proof, custom fields, documents, notes, tracking, service-rate, and activity views.
- Added portal order actions for order creation, cancellation, rescheduling, file attachment, route/place management, validation, preliminary service quotes, and Stripe checkout session handling.
- Added billing and invoice access inside the portal, including invoice summaries, invoice detail views, payment configuration, and unpaid-invoice dashboard widgets.
- Added support-ticket management with issue listing, issue detail, new support ticket creation, comments, replies, edits, deletes, and customer notifications for support activity.
- Added account settings for self-service password changes, account profile access, notification preferences, team/personnel management, and customer-to-vendor conversion where applicable.
- Added portal dashboard widgets for active orders, completed orders, recent orders, open tickets, pending actions, and unpaid invoices.

---
## 🚚 FleetOps
### Issue, customer, and vendor workflows
- Reworked issue details into a richer workspace with panel header, timeline, comments, correspondence, documents, assignment, close, and status-change modals.
- Added issue metadata support for order linkage, tags, and reopen/close history so support and operational issues can be tracked with clearer lifecycle context.
- Added customer and contact detail refinements, safer customer credential-reset handling, and customer-to-vendor conversion tooling.
- Added vendor personnel management with portal-related fields and backend migration support for vendor personnel portal access.
- Added a getting-started status backend and dashboard guidance surface for onboarding FleetOps users without hardcoding placeholder dashboard components.

### Operations and map hardening
- Fixed service-area and zone hydration so zones nested under service areas retain the correct shape in service-rate workflows.
- Preserved the selected service-rate geography type through edit flows and aligned FleetOps with the FleetOps Data geography-type contract.
- Fixed order-completed webhook timing so completion events fire after the order status has actually been updated.
- Hardened Leaflet plugin readiness across engine transitions with shared plugin loaders, namespace guards, tooltip-layer patching, and focused regression coverage.
- Improved live fleet widgets, route list display, tracking markers, route activity updates, order proofs, order headers, and order detail/activity behavior.
- Added Google Maps service configuration to support locale-aware place search and lookup workflows.

### Analytics and accounting consistency
- Added backfills for order transaction subjects and transaction directions so reporting and accounting views can reason about older order data consistently.
- Improved revenue trend widget behavior and analytics sorting/aggregation coverage.
- Added a Zone observer and improved service-area, zone, purchase-rate, and order-resource behavior around pricing and geographic metadata.

---
## 🛒 Storefront
### Dashboard and analytics refactor
- Replaced the static Storefront home dashboard with a registered dashboard powered by new Storefront dashboard services and widgets.
- Added KPI widgets for revenue, orders, active orders, completed orders, average order value, customers, cart conversion, and cancellation rate.
- Added commerce widgets for revenue trends, orders by status, top products, customer insights, Storefront metrics, and reusable KPI tiles.
- Added internal analytics endpoints for overview, revenue trend, orders by status, top products, and customer insights.
- Added Storefront demo/testing seeders for catalogs, products, checkouts, orders, and reusable testing data.

### Product and order management
- Refactored product management into reusable product cards, category sidebar/forms, product collections, addon management, and a multi-section product form for basics, media, pricing, availability, variants, translations, metadata, flags, videos, and addons.
- Rebuilt Storefront order details into a modular commerce workspace with activity, comments, documents, customer, store, route, tracking, fulfillment, metadata, breakdown, and registered-tab sections.
- Added Storefront order workflow services and actions for accepting, preparing, marking ready, completing, cancelling, assigning drivers, and unassigning drivers.
- Fixed storefront order index resource signatures and order amount display in recent-orders/dashboard widgets.
- Fixed Storefront customer signup creation so customer records are created safely during public signup flows.

---
## 💳 Ledger
### Financial dashboard refactor
- Rebuilt the Ledger dashboard around registered widgets and a dedicated dashboard service.
- Added date-range controls, reusable Ledger KPI tiles, revenue trend, activity feed, wallet balances, report shortcuts, invoice status, cash-flow summary, AR aging summary, and KPI widgets for revenue, expenses, net income, open invoices, outstanding AR, overdue AR, wallet balance, and active wallets.
- Added dashboard reporting endpoints for summary, revenue trend, cash flow, invoice status, AR aging, wallet balances, and activity.
- Improved dashboard component compatibility with the shared Console dashboard system and added unit/integration coverage for the new dashboard service and controls.

### Invoices and accounting
- Added invoice email sending with a dedicated `InvoiceSent` notification and Blade mail view.
- Added invoice send, preview, render-PDF, mark-as-sent, transactions, and record-payment improvements to the internal invoice workflow.
- Added order accounting observer support and replaced the Storefront-specific order observer path with a more general accounting observer.
- Improved invoice resources, public invoice access, successful-payment handling, purchase-rate accounting, revenue-recognition backfill behavior, and customer invoice display.

---
## 🧱 Core API, Console, and Shared UI
### Core API
- Fixed resource lifecycle webhooks so the persisted API event payload and outbound webhook payload are computed from the same event data.
- Improved comment creation to accept `subject_uuid` and `parent_comment_uuid`, resolve subjects by UUID or public ID, filter comments by subject type, and reject invalid comment subjects clearly.
- Added available chat participants to the internal chat-channel API and made chat-channel resources safe when a channel has no last message.
- Shortened Fleetbase blog feed cache TTL to keep Console dashboard content fresher.

### Console and platform
- Added Customer Portal API and engine dependencies to the default Fleetbase install.
- Added opt-in outbound Laravel HTTP client tracing with `HTTP_CLIENT_TRACE_ENABLED=false` as the default.
- Made Octane max execution time configurable with `OCTANE_MAX_EXECUTION_TIME`.
- Added shared Console dashboard registry slots before and after the home dashboard so core modules can contribute home content cleanly.
- Updated the Console home dashboard to use the shared sticky dashboard header hooks and improved default dashboard widget sizing after extension boot.
- Added the shared Docs Panel to Console so documentation can open inside a side panel when embeddable, with external fallback for non-embeddable pages.

### Ember Core and Ember UI
- Added Customer Portal to Ember Core's core engine loader.
- Improved current-user option scoping so user preferences, including theme, are keyed to the authenticated user instead of stale anonymous state.
- Improved theme initialization and synchronization after the current user loads.
- Improved fetch normalization for pluralized underscore payload keys and allowed authenticator requests to pass request options.
- Added chat channel creation with selected participants and expanded the shared chat tray into searchable inbox and compose panels.
- Added reusable docs-panel, user-pill, place-address, sticky dashboard header, comment-thread visibility, toggle, button-loading, and duration-formatting improvements.

---
## 🧪 Tests and Coverage
- Added FleetOps tests for getting-started status, order activity flow regressions, Leaflet plugin loading, tooltip patching, service-rate geography state, revenue trend widgets, and live-map/marker behavior.
- Added Storefront tests for dashboard widgets, product cards, category sidebar, order details, Storefront order workflow services, analytics utilities, and extension registration.
- Added Ledger tests for the dashboard service, date-range control, dashboard widgets, and extension registration.
- Added Ember UI tests for docs panel, chat tray, dashboard sticky behavior, place-address helper, toggle behavior, and duration formatting.
- Added FleetOps Data tests for service-rate fee geography fields and contact metadata support.

---
## 🐛 Bug Fixes
- Fixed Customer Portal account password changes, portal account resolution, portal config loading, two-factor session handling, portal order creation validation, and customer session behavior.
- Fixed FleetOps order completed webhooks firing before the final order status was saved.
- Fixed FleetOps service-area zone hydration and service-rate geography-type persistence.
- Fixed Leaflet plugin readiness and tooltip-layer failures after engine transitions.
- Fixed FleetOps customer/contact detail updates that could accidentally include identity fields Ember Data should not mutate.
- Fixed Storefront customer signup creation and dashboard widgets that showed zero order amounts.
- Fixed Storefront order resource signatures, product/category management regressions, and order detail panel drift.
- Fixed Ledger invoice email rendering, dashboard data loading, order-invoice accounting links, public invoice handling, and invoice transaction display.
- Fixed Core API lifecycle webhook payload drift, comment subject resolution, parent comment handling, chat-channel last-message null handling, and chat participant discovery.
- Fixed shared theme preference loading so the selected theme follows the authenticated user.

---
## 🔌 API Changes
- Customer Portal is now installed by default through `fleetbase/customer-portal-api` and `@fleetbase/customer-portal-engine`.
- Added Customer Portal internal routes for portal auth, two-factor validation, settings config, account, password change, personnel, order configs, service quotes, payments, places, orders, support tickets, comments, documents, address book, notification preferences, pending actions, customer conversion, and invoices.
- Added Storefront internal analytics routes for overview, revenue trend, orders by status, top products, and customer insights.
- Added Ledger dashboard report routes for summary, revenue trend, cash flow, invoice status, AR aging, wallet balances, and activity.
- Added Ledger invoice workflow routes for send, preview, render PDF, mark as sent, record payment, and invoice transactions.
- Added Core API `GET /int/v1/chat-channels/available-participants`.
- Extended Core API comment creation to support `subject_uuid` and `parent_comment_uuid` request fields.
- Added `HTTP_CLIENT_TRACE_ENABLED`, `OCTANE_MAX_EXECUTION_TIME`, `GOOGLE_MAPS_LOCALE`, and `GOOGLE_MAPS_API_KEY` configuration support.

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
