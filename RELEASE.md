> v0.7.68 ~ "Extensible tables and details views, order types with their own lifecycle, and resource transformers"

---
## Highlights
Fleetbase `0.7.68` ships Core API `1.6.68`, Fleet-Ops `0.6.71`, Storefront `0.4.24`, Ledger `0.0.12`, IAM `0.1.13`, Developers `0.2.17`, Ember Core `0.3.25` and Ember UI `0.4.5`.

- **Extensions can add to any table and details view.** Columns, row actions, bulk actions and toolbar buttons on tables; header buttons, "…" menu items and tabs on details views. This works across Fleet-Ops, Storefront, Ledger, IAM and Developers, through resource view registries named `<extension>:<resource>:<surface>:<slot>`, such as `fleet-ops:driver:table:columns`. Guide: [Resource Views](https://fleetbase.io/docs/extension-development/resource-views).
- **Order types with their own lifecycle and presentation.** An order config can define its own lifecycle: its starting activity, its completed, canceled and terminal activities, whether its orders are dispatched, and whether they may only move along the flow. Extensions can give an order type its own order form, details view and actions with an order presentation profile. Guides: [Order Lifecycles](https://fleetbase.io/docs/extension-development/order-lifecycles) and [Order Presentation](https://fleetbase.io/docs/extension-development/order-presentation).
- **Resource transformers for every API resource.** Extensions can add to or reshape any API resource, in HTTP responses, webhooks and broadcasts, without the resource opting in.
- **`composer install` no longer needs a database.** `artisan package:discover` used to fail during `composer install` when MySQL wasn't reachable.

---
## Component Versions
- `console`: `0.7.68`
- `core-api`: `1.6.68`
- `fleetops`: `0.6.71`
- `storefront`: `0.4.24`
- `ledger`: `0.0.12`
- `iam-engine`: `0.1.13`
- `dev-engine`: `0.2.17`
- `ember-core`: `0.3.25`
- `ember-ui`: `0.4.5`
- `registry-bridge`: `0.1.10`
- `customer-portal`: `0.0.15`

---
## New Features
### Resource View Registries
- **Tables:** registered columns (with their own cells and filters), row actions, bulk actions and toolbar buttons appear alongside the built-in ones, placed `before` or `after` built-in items by id (ember-core #95, ember-ui #186).
- **Details views:** registered header buttons and "…" menu items appear in details panels, side panels, IAM edit dialogs and Developers details pages. Details tabs can be registered as `<extension>:<resource>:details:tabs`.
- **Every built-in engine declares its registries:** Fleet-Ops (fleetops #347), Storefront (storefront #110), Ledger (ledger #28), IAM (iam-engine #39) and Developers (dev-engine #49). Built-in columns and actions have stable ids. The [Registry Catalogue](https://fleetbase.io/docs/extension-development/resource-views/catalogue) lists every registry and id.
- **Filterable registered columns:** a registered column's filter param is added to the table's query params, and extensions apply it on the API with a Filter expansion.

### Configured Order Lifecycles (Fleet-Ops)
- **`meta.lifecycle` on an order config** (fleetops #346): `initial`, `completed`, `canceled`, `terminal`, `dispatch` and `strict_transitions`. The internal API starts new orders at the initial activity, refuses to dispatch when `dispatch` is false, accepts only the flow's transitions when `strict_transitions` is on, and cancels to the configured activity. Configs without a lifecycle behave exactly as before.
- **Lifecycle tab in Order Configuration** (fleetops #350): view and edit a config's lifecycle from the console.
- **The board follows a configured lifecycle:** its columns are the flow's activities, and cards move only to an order's next activities.
- **Status badges** for lifecycle statuses such as Requested, Handed Over, Extended and Returned.

### Order Presentation Profiles (Fleet-Ops)
- **An extension can give its order type its own presentation** (fleetops #346): order form sections (Fleet-Ops' own and the extension's), extra and hidden fields, details view sections, and hidden actions in the orders table and details menu. **Edit details** opens the profiled form. Other order types are unchanged.

### Resource Transformers (Core API)
- **Transformers apply to every resource** (core-api #285), including nested resources, collections, paginated responses, webhooks and broadcasts. They can target a resource class, model class, interface or `'*'`, be scoped to HTTP, webhook or broadcast output and to internal or public requests, and batch-load data once per collection. Extensions register them with `registerTransformersFrom()` in their service provider.

---
## Improvements
- **Ember Core and Ember UI are fully tested**, with 100% statement, branch, function and line coverage enforced in CI (ember-core #90).
- **Header shortcuts keep their permission** (ember-core #94), so the header hides shortcuts a user can't open.
- **The Order Configuration manager lists every config** (fleetops #350), including configs created while the console is open.
- **An order's activity timeline follows status changes made on the server** (fleetops #350), without reloading.
- **Tabular reacts to column changes after its first render**, and the column picker's choices survive them (ember-ui #186).
- **DatePicker accepts typed dates** and follows later value changes.

---
## Fixes
- **Activity Flow crashed on a flow with a cycle** (fleetops #351), such as an activity that returns to an earlier one.
- **Order details now load the assigned vehicle with the order.**
- **Registered details tabs broke after opening a driver, vehicle or trailer side panel**, and side panels left out tabs they could render.
- **The sensor details view showed the tabs registered for places.**
- **A required file custom field rejected a file uploaded in the same session** (ember-core #92).
- **The order form failed when its custom fields couldn't load.**
- **DatePicker reported a calendar pick twice** when the field lost focus.
- **Tabular's bulk actions ignored `permission`.**
- **Fixes found while bringing Ember Core to full coverage:**
  - `crud`: bulk-action messages printed the count twice, the import dialog refused files, and a `modelName` option didn't override the model's own name.
  - `fetch`: a bare `Content-Type` such as `text/csv` was misread, the `content-disposition` filename beat the caller's, and `cachedGet` never expired a month-old cache.
  - The organization and user account menus showed each other's items.
  - Reopening a chat closed the other open chats.
  - Menu items registered by title replaced each other.
  - The universe registry facade (`getRegistry`, `registerInRegistry`, `lookupFromRegistry`, `getMenuItemsFromRegistry`, `getMenuPanelsFromRegistry`) passed the wrong arguments and returned nothing.
- **`composer install` failed without a reachable database** (#695). The transaction tripwire resolved a database connection while providers booted; it now listens through the event dispatcher. `fleetbase/laravel-mysql-spatial` `^1.0.3` no longer connects when a connection is built.

---
## Breaking Changes
- **Core API resource transformers** (core-api #285): duck-typed transformers (a `$target` property and a static `output($model, $data)`), `ResourceTransformerRegistry::transform()`, `resolveByTarget()`, `fixClassName()` and the static `$transformers` array are removed. Rewrite transformers against the new registry; see the core-api README's "Resource transformers" section.
- **`FleetbaseResourceCollection` resolves its items** rather than calling `toArray()` on them.
- **Ember Core:** `MenuItem`'s chaining click setter is now `withOnClick()`, and `loadSubjectCustomFields` rejects when loading fails, rather than resolving with nothing.

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
