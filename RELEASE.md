> v0.7.49 ~ "Introducing Fleetbase AI, the operations copilot for Fleetbase"

---
## Highlights
Fleetbase `0.7.49` introduces `fleetbase/ai`, the official AI module for Fleetbase. Fleetbase AI adds a global operations copilot to the Console, persistent AI sessions, auditable task history, provider configuration, and a capability framework that lets Fleetbase modules safely expose context and previewable actions. This release updates Fleetbase Console `0.7.49`, AI `0.0.1`, Fleet-Ops `0.6.57`, Customer Portal `0.0.12`, Ledger `0.0.7`, Ember UI `0.3.39`, and Ember Core `0.3.24`.

---
## Component Versions
- `console`: `0.7.49`
- `ai`: `0.0.1`
- `fleetops`: `0.6.57`
- `customer-portal`: `0.0.12`
- `ledger`: `0.0.7`
- `ember-ui`: `0.3.39`
- `ember-core`: `0.3.24`

---
## Fleetbase AI
- Added the new official Fleetbase AI module with a global prompt available from the Console header tray.
- Added persistent AI chat sessions with history, continuation, ending, soft delete, markdown responses, and attachment references.
- Added admin configuration for enabling Fleetbase AI, choosing providers and models, testing providers, and reviewing usage and audit logs.
- Added provider support for OpenAI, Claude, and a local preview provider for development and testing.
- Added durable AI task, task-step, session, and admin access records so AI activity can be audited.
- Added a capability framework for modules to register AI-readable context, preview-only actions, and confirmed apply actions.

---
## Fleet-Ops & AI Pilot
- Added Fleet-Ops AI operational capabilities for order context, operational queries, resource search, docs/help context, route optimization, and order insights.
- Added a preview-confirm-create order flow for natural-language order creation.
- Added compact AI order preview UI with pickup/dropoff details, route preview, schedule display, assignment fields, POD and dispatch toggles, notes, and explicit create/cancel controls.
- Improved AI route previews, Google map lifecycle handling, place point resolution, payload normalization, relative date resolution, and schedule formatting.
- Added Fleet hierarchy tree/details improvements and additional order details registry support.

---
## Shared Console and UI
- Added Ember Core support for loading the AI module and registering renderable components by registry type.
- Added Ember UI header tray registry support for extensions like Fleetbase AI.
- Added ISO string parsing for date-time inputs and object/array rendering for metadata viewer output.
- Added a `format-json` helper and improved dropdown/table behavior.
- Fixed resource card styling, Tailwind CSS `theme()` usage, and RGBA alpha normalization.

---
## Ledger and Customer Portal
- Completed Ledger invoice settings functionality with canonical `payment_terms_days` support and legacy `due_date_offset_days` compatibility.
- Applied payment terms defaults to manual and backend invoice creation.
- Wired `auto_send_on_creation` through the shared invoice send flow for manual and order-generated invoices.
- Improved Taler demo seeding.
- Updated Customer Portal to `0.0.12` with dependency updates and internal order-controller compatibility.

---
## Bug Fixes
- Fixed AI route preview map errors and route engine lookup issues.
- Fixed AI order preview editing, map lifecycle, schedule display, place resolution, and create-order payload normalization.
- Fixed Fleet hierarchy dropdown formatting.
- Fixed date-time input parsing for ISO strings.
- Fixed metadata viewer formatting for object and array values.
- Fixed Ledger invoice settings spacing and invoice default behavior.

---
## API Changes
- Added Fleetbase AI internal routes for config, provider testing, sessions, tasks, task preview/apply/cancel, tools, admin session/task views, reveal access, and usage analytics.
- Added AI data records for `ai_sessions`, `ai_tasks`, `ai_task_steps`, and AI admin access logs.
- Added AI capability registration APIs for context capabilities and preview/apply actions.
- Added `@fleetbase/ai-engine` to Console and `fleetbase/ai` to API dependencies.
- Added Fleet-Ops AI capability endpoints and backend support for AI-assisted operational workflows.
- Updated Ledger invoice settings aliases and auto-send behavior.

---
## Upgrade Steps
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
