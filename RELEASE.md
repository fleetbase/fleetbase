> v0.8.1 ~ "Extensions can add sortable, grouped columns to any table"

---
## Highlights

- **Extensions can add fully working columns to another engine's table.** A column an extension registers on a table can now be sorted by data that lives outside that table's model, listed under its own heading in Customize Columns, and left hidden until a user turns it on. Together with the column values, filters and search an extension could already add, an extension no longer needs changes in the engine that owns the table.
- This is a dependency release: core-api 2.0.1, ember-core 0.3.27 and ember-ui 0.4.7. Nothing changes for an instance that has no extension using the new hooks.

---
## Component Versions
- `console`: `0.8.1`
- `core-api`: `2.0.1`
- `fleetops`: `0.7.0`
- `storefront`: `0.5.0`
- `ledger`: `0.1.0`
- `customer-portal`: `0.1.0`
- `registry-bridge`: `0.2.0`
- `ai`: `0.1.0`
- `valhalla`: `0.1.0`
- `vroom`: `0.1.0`
- `dev-engine`: `0.2.18`
- `ember-ui`: `0.4.7`
- `ember-core`: `0.3.27`
- `fleetops-data`: `0.2.4`
- `iam-engine`: `0.1.13`

---
## Core API `2.0.1`
- **Sort keys registered at runtime.** `Model::addSortHandler('key', fn ($builder, $direction, $request) => …)` lets an extension order a model's list endpoint by a key that is not one of its columns (`?sort=key`, `?sort=-key`), for example by a column of a companion table.

## Ember Core `0.3.27`
- **`TableColumn.withSort(sortParam)`, `inGroup(group)` and `hiddenByDefault()`** for columns registered into `<extension>:<resource>:table:columns`.

## Ember UI `0.4.7`
- **Column picker groups.** Customize Columns lists columns that carry a `group` under a heading of that name, after the table's own columns.

---
## Upgrade Steps
- Pull the new images and restart the API, queue, scheduler and events containers. There are no migrations and no configuration changes.

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
