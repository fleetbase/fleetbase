> "The Ledger & The Navigator"
---
## ✨ Highlights
This landmark release introduces two major, transformative features to the Fleetbase ecosystem: the first official version of the **Ledger** accounting extension and the brand new **Smart Navigator** header menu. Additionally, this release includes a powerful new **Template Builder** system and a completely redesigned **Installation Wizard**.

### 💰 Ledger: Accounting, Invoicing & Payments
After months of development, the **Ledger** extension (`v0.0.1`) makes its official debut. This is a full-featured accounting and payments module deeply integrated into Fleetbase, providing a comprehensive suite of tools to manage your organization's finances.

Key features include:
- **Invoicing:** Create, send, and manage professional invoices with customizable templates.
- **Payment Gateways:** Seamlessly integrate with Stripe to accept online payments. The system includes robust webhook handling to automatically update invoice statuses.
- **Revenue & Expense Tracking:** Automatically track revenue from FleetOps orders and Storefront purchases. Manually record expenses to get a complete financial picture.
- **Accounts Receivable:** Keep track of outstanding invoices with an AR aging report.
- **Digital Wallets:** Provide drivers and customers with digital wallets to manage balances and transactions.
- **Financial Reporting:** Generate essential financial reports to monitor your business's health.
- **RBAC Permissions:** A complete set of permissions for controlling access to all Ledger resources.

### 🧭 Smart Navigator: A New Way to Navigate
The main console header has been completely redesigned with the new **Smart Navigator** menu. This intelligent and responsive navigation system streamlines access to all your extensions and most-used features.

Key features include:
- **Intelligent & Responsive:** The menu automatically collapses items into a "More" dropdown as your screen width changes, ensuring a clean and uncluttered interface.
- **Searchable Dropdown:** A powerful, multi-column dropdown allows you to instantly search and access any menu item.
- **Shortcuts:** Extensions can now register "Shortcuts" — prominent, card-style links in the main dropdown that provide one-click access to critical actions like creating a new order or invoice.
- **Pinning & Customization:** Pin your most frequently used extensions and shortcuts to the main header for immediate access.

---
## ✨ New Features

### 🎨 Template Builder System
- **[core-api, ember-ui]** A new visual template builder has been introduced for creating and managing document templates (e.g., for invoices, reports, packing slips).
- **[ember-ui]** The builder features a drag-and-drop canvas, a properties panel for customizing elements, and support for dynamic data via queries.
- **[core-api]** Backend support includes new `Template` and `TemplateQuery` models and a preview endpoint for unsaved templates.

### 🪄 Interactive Installation Wizard
- **[fleetbase, fleetbase-cli]** The `docker-install.sh` script and the `flb install-fleetbase` command are now full-fledged interactive wizards.
- **[fleetbase, fleetbase-cli]** The wizard guides users through configuring core settings, database connections (bundled MySQL or external), mail services (SMTP, Mailgun, SES, etc.), file storage (local, S3, GCS), and other third-party services.

### 🔧 Ember Core & UI Enhancements
- **[ember-core]** The `universe` service now correctly forwards sub-services to the host application, resolving cross-engine service isolation issues.
- **[ember-core]** Implemented more robust session lifecycle events for login/logout handling.
- **[ember-ui]** Added a comprehensive set of status badges for invoices and transactions.

---
## 🐛 Bug Fixes

### FleetOps
- **[fleetops]** Suppressed a false-positive `ember/no-shadow-route-definition` lint error for the top-level `virtual` route using an `eslint-disable` comment. [1]

### Ledger
- **[ledger]** Resolved numerous bugs during the stabilization process, including fixes for invoice number generation, line item calculations, webhook processing, currency handling, and cross-engine service dependencies.

### Ember UI
- **[ember-ui]** Fixed numerous styling, rendering, and interactivity bugs in the new Smart Navigator and Template Builder components.

---
## ⚠️ Breaking Changes
- **[fleetbase]** The primary console virtual route has been moved from `/:slug` to `/~/:slug` to avoid conflicts with extension routes.

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
## 📦 Component Versions
- **fleetbase**: v0.7.31
- **core-api**: v1.6.38
- **fleetops**: v0.6.38
- **storefront**: v0.4.14
- **ledger**: v0.0.1
- **ember-core**: v0.3.18
- **ember-ui**: v0.3.25
- **fleetbase-cli**: v0.0.6

---
## References
[1] `fleetbase/fleetops` - PR #210: `feature/header-menu-shortcuts`

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
