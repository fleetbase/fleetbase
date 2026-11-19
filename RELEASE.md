> v0.8.2 ~ "Push apps, a Passenger order config for every organization, and foreign keys that point at unique keys"

---
## Highlights

- **Push apps: an organization's own apps send pushes with their own Apple and Firebase credentials.** Examples are a Passenger app, a white-label driver app or an AppHelm build. Set them up in Fleet-Ops under **Settings → Push Apps**:
  - **One push app per mobile app.** It holds the iOS app's Apple push key and the Firebase project's service account, and the Android app needs no package name. One push app works even when the iOS and Android apps have different bundle IDs.
  - **Each device is sent through the service that issued its token.** That includes iOS apps that use Firebase.
  - **Send test push** checks the settings against one device token.
  - Navigator and devices registered without a push app still use the install-wide push settings, as before.
- **Every organization has the Passenger order config.** It sits next to Transport, so the Passenger app works without running `fleetops:create-order-config passenger` first. Like Transport, it can't be deleted and its flow is read-only, but its policies and triggers can be edited.
- **Tables that foreign keys point at can be altered on MySQL 8.4 without any workaround.** MySQL 8.4 turns on `restrict_fk_on_non_standard_key` by default, and then refuses any change to a table that a foreign key points at through a non-unique key. v0.8.1 turned the setting off while migrations run. This release makes those columns unique: 9 core tables, 7 Fleet-Ops tables, 3 registry tables and, on Cloud, 3 billing tables.
- **Sandbox no longer has foreign keys to a table it doesn't have.** Three log-table foreign keys pointed at `personal_access_tokens`, which exists only in the main database.
- **CI runs the fresh install on MySQL 8.4.8 as well as 8.0.** It also checks two things with the setting on: every foreign key points at a unique key, and every table a foreign key points at can be altered.

---
## Component Versions
- `console`: `0.8.2`
- `core-api`: `2.0.4`
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
## Core API `2.0.4`
- `sandbox:migrate` now runs the migrations of extensions installed outside core's `vendor` directory: extensions installed in a separate Composer project at `api/extensions`, and extensions linked from a local path.

## Core API `2.0.3`
- **Push apps:**
  - The `push_apps` table holds each app's provider settings, encrypted.
  - `user_devices` has `push_app_uuid`, `company_uuid` and `push_provider`.
  - `PushAppChannel` sends to a push app's devices with that app's credentials.
  - Push services are pluggable through `PushProviders::register()`.
- **Unique keys:** `uuid` is unique on `chat_channels`, `chat_messages`, `chat_participants`, `comments`, `custom_fields`, `dashboards` and `reports`, and `id` on `permissions` and `roles`.
- **Sandbox:** the `access_token_id` foreign keys to `personal_access_tokens` are dropped.
- **Extension discovery:** extensions installed in a separate Composer project at `api/extensions` are found.

## Fleet-Ops `0.7.2`
- **Settings → Push Apps:**
  - Add, edit, turn off and remove push apps, and send a test push.
  - The page uses the `view` and `update` `notification-settings` permissions.
  - Keys are never shown again after they're saved.
- **Register device:** `v1/customers/register-device` and `v1/drivers/register-device` accept `push_app`, `environment` and `push_provider`.
- **Order pushes:** order pushes, including order config `notify_customer` and `notify_driver`, reach push-app devices through the app's own credentials.
- **Passenger order config:** every organization gets the system Passenger order config. New organizations get it when they're created, and existing ones get it from a migration.
- **Unique keys:** `uuid` is unique on `devices`, `inspection_forms`, `inspection_submissions`, `order_configs`, `telematics`, `warranties` and `work_orders`.

## Registry Bridge `0.2.1`
- `uuid` is unique on `registry_extensions`, `registry_extension_bundles` and `registry_users`.

---
## Upgrade Steps
- Pull the new images and restart the API, queue, scheduler and events containers. The deploy runs `migrate` and `sandbox:migrate`. They create the push app tables and each organization's Passenger order config.
- If a migration reports a table with duplicate values, it skips that table. Remove the duplicates, then run the `php artisan migrate:refresh --force --path=…` command the message gives.
- No configuration changes are needed. Push apps are optional: until an organization adds one, its pushes go out exactly as before.
