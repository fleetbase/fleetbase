# 🚀 Fleetbase v0.7.19 — 2025-11-17

> "A major leap forward in scheduling, reporting, and user interface capabilities."

---

## ✨ Highlights
- **Core Scheduling Module**: A comprehensive, polymorphic, and reusable scheduling system has been integrated into the core API, providing the foundation for a wide range of scheduling applications.
- **Driver Scheduling with HOS Compliance**: FleetOps now includes built-in compliance for FMCSA Hours of Service regulations.
- **Computed Columns in Query Builder**: The query builder now supports computed columns, allowing for more complex and powerful data queries with secure expression validation.
- **Advanced Table Functionality**: The Ember UI table component now supports multi-column sorting, horizontal scrolling, and sticky columns.
- **New Filter Components**: New filter components for multi-input and range selection have been added to the Ember UI.
- **Dispatched Flag Control**: The order creation process in FleetOps now allows for explicit control over the dispatch behavior.
- **Vehicle Attributes Enhancement**: The vehicle model and API resources in FleetOps have been enhanced with additional attributes.

---

## ⚠️ Breaking Changes
- None

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

## Need help? 
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
