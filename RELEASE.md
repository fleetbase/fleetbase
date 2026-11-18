> v0.8.2 ~ "Foreign keys point at unique keys"

---
## Highlights

- **Tables that foreign keys point at can be altered on MySQL 8.4 without any workaround.** MySQL 8.4 turns on `restrict_fk_on_non_standard_key` by default, and then refuses any change to a table that a foreign key points at through a non-unique key. v0.8.1 turned the setting off while migrations run. This release makes those columns unique: 9 core tables, 7 Fleet-Ops tables, 3 registry tables and, on Cloud, 3 billing tables.
- **Sandbox no longer has foreign keys to a table it doesn't have.** Three log-table foreign keys pointed at `personal_access_tokens`, which exists only in the main database.
- CI now runs the fresh install on MySQL 8.4.8 next to 8.0, and checks that every foreign key points at a unique key and every table it points at can be altered with the setting on.

---
## Component Versions
- `console`: `0.8.2`
- `core-api`: `2.0.3`
- `fleetops`: `0.7.2`
- `storefront`: `0.5.0`
- `ledger`: `0.1.0`
- `customer-portal`: `0.1.0`
- `registry-bridge`: `0.2.1`
- `ai`: `0.1.0`
- `valhalla`: `0.1.0`
- `vroom`: `0.1.0`
- `dev-engine`: `0.2.18`
- `ember-ui`: `0.4.7`
- `ember-core`: `0.3.27`
- `fleetops-data`: `0.2.4`
- `iam-engine`: `0.1.13`

---
## Core API `2.0.3`
- `uuid` is unique on `chat_channels`, `chat_messages`, `chat_participants`, `comments`, `custom_fields`, `dashboards` and `reports`, and `id` on `permissions` and `roles`.
- The sandbox `access_token_id` foreign keys to `personal_access_tokens` are dropped.

## Fleet-Ops `0.7.2`
- `uuid` is unique on `devices`, `inspection_forms`, `inspection_submissions`, `order_configs`, `telematics`, `warranties` and `work_orders`.

## Registry Bridge `0.2.1`
- `uuid` is unique on `registry_extensions`, `registry_extension_bundles` and `registry_users`.

---
## Upgrade Steps
- Pull the new images and restart the API, queue, scheduler and events containers. The deploy runs `migrate` and `sandbox:migrate`.
- If a migration reports a table with duplicate values, it skips that table. Remove the duplicates, then run the `php artisan migrate:refresh --force --path=…` command the message gives.
