> v0.8.1 ~ "Migrations run on MySQL 8.4, and extensions can add sortable, grouped columns to any table"

---
## Highlights

- **Extensions can add fully working columns to another engine's table.** A column an extension registers on a table can now be sorted by data that lives outside that table's model, listed under its own heading in Customize Columns, and left hidden until a user turns it on. Together with the column values, filters and search an extension could already add, an extension no longer needs changes in the engine that owns the table.
- **Installs and upgrades run on MySQL 8.4 and later.** MySQL 8.4 refuses to create or alter tables whose foreign keys point at a non-unique key, and many Fleetbase foreign keys point at `uuid` columns with an ordinary index. So on 8.4 a fresh install failed at its first such key (`6125 Missing unique key`), and the upgrade to v0.8.0 failed in Fleet-Ops' adhoc dispatch migration (`1553 Cannot drop index '<unknown key name>'`). Migrations now run with that check off for their own database sessions. MySQL 8.0, which the bundled Docker setup uses, was never affected.
- **An upgrade that stopped in that migration now finishes.** MySQL doesn't roll back schema changes, so a failed v0.8.0 upgrade left part of the migration applied. Running `php artisan migrate` again on v0.8.1 picks up from where it stopped.
- This is a dependency release: core-api 2.0.2, Fleet-Ops 0.7.1, ember-core 0.3.27 and ember-ui 0.4.7. Nothing changes for an instance that has no extension using the new column hooks.

---
## Component Versions
- `console`: `0.8.1`
- `core-api`: `2.0.2`
- `fleetops`: `0.7.1`
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
## Core API `2.0.2`
- **Migrations run on MySQL 8.4.** While `migrate` or `sandbox:migrate` runs, each MySQL connection it uses, including storefront's, has `restrict_fk_on_non_standard_key` off for its session and back on when the run ends. Nothing changes outside migrations, or on MySQL 8.0 and MariaDB.

## Core API `2.0.1`
- **Sort keys registered at runtime.** `Model::addSortHandler('key', fn ($builder, $direction, $request) => …)` lets an extension order a model's list endpoint by a key that is not one of its columns (`?sort=key`, `?sort=-key`), for example by a column of a companion table.

## Fleet-Ops `0.7.1`
- **The adhoc dispatch migration finishes on MySQL 8.4 and after a failed run.** Each table and column it adds is created only if it's missing, and its column changes run with MySQL 8.4's foreign key check off for the session.

## Ember Core `0.3.27`
- **`TableColumn.withSort(sortParam)`, `inGroup(group)` and `hiddenByDefault()`** for columns registered into `<extension>:<resource>:table:columns`.

## Ember UI `0.4.7`
- **Column picker groups.** Customize Columns lists columns that carry a `group` under a heading of that name, after the table's own columns.

---
## Upgrade Steps
- Pull the new images and restart the API, queue, scheduler and events containers. There are no configuration changes.
- Run `php artisan migrate` and `php artisan sandbox:migrate`. On an install whose v0.8.0 upgrade stopped in the adhoc dispatch migration, this finishes it. Elsewhere there is nothing new to run.

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
