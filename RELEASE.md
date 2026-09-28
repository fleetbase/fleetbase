> v0.7.65 ~ "Authenticator app sign-in, a security pass on sign-in and permissions, and Storefront promotions and campaigns"

---
## Highlights
Fleetbase `0.7.65` ships Core API `1.6.65`, Fleet-Ops `0.6.70`, Storefront `0.4.22` and Ledger `0.0.11`.

- **Sign in with an authenticator app.** Two-factor authentication can use an authenticator app, with recovery codes, set up from Account › Auth.
- **A security pass on sign-in and permissions:**
  - two-factor sign-in checks the password first;
  - changing a password needs the current one;
  - organization settings, reports, API keys and webhooks are behind IAM permissions;
  - Fleet-Ops enforces its permissions across the API and console.
- **Storefront promotions, promo codes, customer segments and campaigns**, a customer notifications inbox, and rebuilt push notifications.
- **Fleet-Ops prunes old telematics data automatically**, with retention settings per organization.
- **Admins get richer organization pages**: search and filters, usage, recent activity, and each member's two-factor and sign-in details.
- **The Docker installer works on macOS and Windows.**

---
## Component Versions
- `console`: `0.7.65`
- `core-api`: `1.6.65`
- `fleetops`: `0.6.70`
- `storefront`: `0.4.22`
- `ledger`: `0.0.11`
- `ember-ui`: `0.4.4`
- `registry-bridge`: `0.1.10`
- `customer-portal`: `0.0.15`

---
## Security
- **Two-factor sign-in checks the password first** (core-api #272, fleetbase #684, customer-portal #20). The console and Customer Portal asked the server about two-factor before sending the password. That started a two-factor session, so an email address plus the emailed or texted code was enough to sign in. It also revealed whether an account had two-factor on. The password is now checked first. Two-factor sessions expire after 10 minutes, where they used to last for years. The fifth wrong code ends the session, and the console returns you to the login page.
- **Changing your password needs the current password** (core-api #275, fleetbase #685). The server never checked it, so a stolen session could change the password. It is checked in the same request now. Setting a first password works only once, within 24 hours of accepting an invite. Password checks are limited to 10 a minute.
- **Organization settings and core endpoints need the right permissions** (core-api #278):
  - Any member could update the organization, including making themselves its owner, or changing its plan and status. Only the owner, the Administrator role or a system admin can now, and ownership, billing and status fields are ignored for anyone else.
  - Only the owner, the Administrator role or a system admin can change the organization's two-factor policy. The system two-factor policy is for system admins only.
  - Reports were open to every user. Running a report query needs `iam execute report`, and exporting needs `iam export report`.
  - Any user could list and create API keys. API keys, webhooks, API events and request logs now need their Developers permissions. Platform metrics are admin-only.
- **Fleet-Ops enforces its permissions across the API and console** (fleetops #345, ember-ui #185):
  - The Navigator app link could be opened without signing in, and handed out an API key for the first system admin's organization. It is now a signed link that expires after 30 minutes, and only system admins can create one.
  - Saving entity-editing settings overwrote other organizations' settings, and driver onboard settings could be saved for another organization. Both are limited to your own organization.
  - Bulk actions ran without their permission, for example bulk delete, cancel or dispatch. They are now disabled for users who lack it, and navigation hides what you can't open.
- **Reports check every computed column** (core-api #269). Grouped reports accepted computed SQL from the browser without checking it. Every computed column is now validated, and schema columns always take their SQL from the server.
- **Wallet updates can no longer set a balance directly** (ledger #24).

---
## Authenticator App Two-Factor Authentication
(core-api #277, fleetbase #686)

- **Authenticator App** is a two-factor method in Account › Auth, marked Recommended. It works with Authy, Google Authenticator, Microsoft Authenticator, 1Password and other TOTP apps.
- Setup asks for your current password, shows a QR code and the key for manual entry, checks a code from the app, then gives you 8 single-use recovery codes to copy or download.
- The **Authenticator App** panel sets the app up, removes it, or issues new recovery codes, each after your current password.
- At sign-in you enter the code from the app, or **Use a recovery code**, or **Send me a code instead** to fall back to email or SMS.
- Organization and system two-factor settings can't make the authenticator app the default, since each user has to set it up.
- The app secret is encrypted, and recovery codes are stored hashed.

---
## Accounts, Access and Administration
- **Settings › Authentication** has an "Allow users to change their own password" setting, on by default. With it off, users need the `iam change-password` permission. Admins and Administrators can always change their own. Account › Auth shows a note instead of the form when you can't (core-api #275, fleetbase #685).
- Invited users who aren't admins can set their first password again (core-api #275).
- Password and auth-setting changes are written to the activity log (core-api #275).
- **Admin › Organizations**:
  - Search covers owners, emails and phone numbers.
  - New filters for owner name, phone and IP address, timezone, organization type, and registered and updated dates.
  - Choose which columns to show. A new Registered column is added, and Last Activity is renamed Last Updated.
  - Filters survive the dropdown's Apply, **Clear** resets everything, and **Export selected** exports the rows you checked (core-api 1.6.65, fleetbase).
- **Organization details**:
  - The Overview tab has an organization profile and the owner.
  - Usage shows users, drivers, customers, orders, API calls and webhook callbacks.
  - A recent activity feed is added.
  - The Users tab shows each member's two-factor method, linked sign-in providers and last sign-in.
  - The separate Extensions tab is removed.
  - Admins can open organizations they aren't a member of (core-api 1.6.65, fleetbase).

---
## Fleet-Ops
- **Telematics data retention** (#341).
  - New settings page: Fleet-Ops › Settings › **Telematics Data**, with storage usage and **Run cleanup now**.
  - Old data is pruned every 15 minutes by `fleetops:prune-telematics-data`. By default it keeps:
    - device events for 30 days, with raw payloads removed after 7;
    - positions for 90 days;
    - processed deliveries for 24 hours, and quarantined ones for 7 days;
    - sync runs for 7 days.
  - New device events no longer store the raw payload twice, which roughly halves their size.
- **New permissions** (#345):
  - Maintenance schedules, devices, sensors, device events, telematics, warranties, purchase rates, fuel provider connections, transactions and sync runs, analytics, and scheduling and tracking settings.
  - Dispatching an order now needs `dispatch order` instead of `update order`. Fleet-Ops dashboards and metrics need `view analytics`.
  - Buttons, bulk actions, navigation and live map layers follow your permissions. Users who aren't admins used to see an empty live map.
- **Orders report** (#342, core-api #269):
  - The Orders report adds order ID and Internal ID, tracking number and status, payload items (one row per item), and more order columns.
  - Summaries count each order once. Deleted records are left out, and references to columns that don't exist are removed from the Drivers, Vehicles and Fuel Reports reports.
- Custom field values on fuel reports and service areas are saved. They were silently dropped (#342).
- Company settings apply in queued jobs and console commands. Affected: operational alerts, driver shift-change notifications, Vroom orchestration, tracking options and the customer credentials email (#344).
- Android order push notifications are sent at high priority, so they arrive while a driver's phone is idle (core-api #273).

---
## Storefront
- **Promotions** (#104, #106):
  - Percentage, fixed-amount, free-delivery and buy-one-get-one discounts.
  - A promotion applies automatically or through a promo code. Each one supports targeting, conditions, schedules, usage limits, budgets and stacking.
  - Discounts are priced into cash, Stripe and QPay checkouts. A promo code that can't be applied stops the checkout with an error.
  - Console screens for promotions and promo codes, including batch code generation.
- **Customer segments and campaigns** (#105, #106):
  - Rule-based segments with a live preview.
  - Push and inbox campaigns, sent now or scheduled, and a promotion can be announced when it starts.
  - The existing "send push notification" action now creates a campaign, so it respects opt-outs and also writes to the inbox.
- **Customer notifications inbox API** (#103): `storefront/v1/notifications` endpoints. Customers can list, read and delete notifications, and set whether they get order updates and promotions.
- **Push notifications rebuilt on one Storefront push channel** (#102):
  - Pushes reach Android and some iOS devices again, and Android pushes are high priority. iOS development builds are retried in the other APNs environment, and APNs channels get an environment setting.
  - Push is sent before email, so a mail error no longer blocks it. Dead device tokens are removed.
  - **Send test** on a notification channel shows Apple's or Google's raw response for a device token.
  - Promotions and Push Notifications move under `promotions/`.
- Ukrainian translation, thanks to @ispdomnet (#101).

---
## Ledger
- The base currency and default invoice currency save again, and a wallet's currency can be changed (#24, fixes fleetbase #678).
- Invoices created in the background, for example from order purchase rates, use the organization's invoice prefix, currency, terms, notes, template and due date (#27).
- Ledger's widgets have set places on the default dashboard, and Overdue AR is added to it (#25).
- Ukrainian translation, thanks to @ispdomnet (#23).

---
## Customer Portal
- The portal can be translated, with a language switcher. Russian is added, thanks to @spanchenko (#13), and Mongolian too.
- Ticket comment emails use the portal's configured URL slug (#19).

---
## Registry Bridge
- `flb verify` accepts the emailed code again when you create a developer account. It always said the code was invalid or had expired (#38, fixes fleetbase #683).
- Ukrainian translation, thanks to @ispdomnet (#37).

---
## Console, UI and Notifications
- The default dashboard has a set layout: KPIs first, then the live fleet map, reports, and the Blog and GitHub widgets last (fleetbase #682, fleetops #342, ledger #25, ember-ui 0.4.4). Earnings and Average Order Value are no longer on it by default, but can still be added.
- The GitHub widget has a new look: a Star button, the latest release, and star, watcher, fork and issue counts. It no longer scrolls inside its panel (fleetbase #682).
- Settings › Notifications apply when the queue runs as its own process, including the Docker Compose setup. They were silently ignored (core-api #274).
- **Test SMS Provider** and **Test Twilio** in Admin › System Config › Services use the credentials in the form. Under Octane they failed, or tested the saved credentials instead (core-api #270, fixes fleetbase #680).
- The report builder can group, sort and filter on computed columns, sort grouped reports by a summary, and count distinct values (ember-ui 0.4.4, core-api #269).
- A signature pad custom field type (ember-ui 0.4.4).
- Tall modals grow and scroll, and the popover arrow is drawn (ember-ui 0.4.4).
- "Configutation" is spelled correctly in the Push Notifications settings (fleetbase #681, fixes fleetbase #679).

---
## Installer
(fleetbase #677)

- `scripts/docker-install.sh` runs on macOS's stock `/bin/bash` 3.2 and on Windows Git Bash. The interactive wizard used to crash on macOS with `bad substitution`.
- The port check works on macOS and Windows, and only warns.
- The installer creates `api/.env` before starting the stack. Docker used to create a directory there, and the API couldn't boot.
- A root `.gitattributes` keeps shell scripts, Dockerfiles and config files LF on Windows checkouts.

---
## Console and API Packages
- Bumped the root Docker image version to `0.7.65`.
- Bumped Console to `0.7.65`.
- Updated the API dependencies: `fleetbase/core-api` to `^1.6.65`, `fleetbase/fleetops-api` to `^0.6.70`, `fleetbase/storefront-api` to `^0.4.22`, `fleetbase/ledger-api` to `^0.0.11`, `fleetbase/registry-bridge` to `^0.1.10`, and `fleetbase/customer-portal-api` to `^0.0.15`.
- Updated the Console dependencies: `@fleetbase/fleetops-engine` to `^0.6.70`, `@fleetbase/storefront-engine` to `^0.4.22`, `@fleetbase/ledger-engine` to `^0.0.11`, `@fleetbase/registry-bridge-engine` to `^0.1.10`, `@fleetbase/customer-portal-engine` to `^0.0.15`, and `@fleetbase/ember-ui` to `^0.4.4`.
- Updated the component submodules to their release tags, and the API and Console lockfiles.

---
## Bug Fixes
- Fixed a two-factor code being enough to sign in without the password.
- Fixed any organization member being able to take ownership of it or change its plan.
- Fixed reports, API keys and webhooks being open to every user.
- Fixed Fleet-Ops bulk actions running without their permission, and the Navigator app link working without sign-in.
- Fixed the settings page for changing your own password being unreachable, and invited users being unable to set a password.
- Fixed notification, invoice and Fleet-Ops company settings being ignored in queued jobs.
- Fixed Test SMS using the saved credentials or failing under Octane.
- Fixed Storefront push notifications not reaching Android and some iOS devices.
- Fixed Ledger currencies not saving and wallet currencies not being editable.
- Fixed custom field values on fuel reports and service areas not saving.
- Fixed `flb verify` rejecting valid codes.
- Fixed the Docker installer failing on macOS and Windows, and leaving `api/.env` as a directory.
- Fixed "Configutation" in the Push Notifications settings.

---
## Upgrade Steps
This release includes database migrations. `deploy.sh` runs them, creates the new permissions and restarts the queue.

- **Deploy the API and console together.** An older console can't sign in users who have two-factor on, and can't change passwords.
- **Grant the new permissions to roles other than Administrator.** Users without them lose access:
  - running and exporting reports (`iam execute report`, `iam export report`);
  - API keys, webhooks, events and logs in Developers;
  - dispatching orders (`fleet-ops dispatch order`);
  - Fleet-Ops dashboards and metrics (`fleet-ops view analytics`);
  - the new Fleet-Ops resources.
- **Telematics retention is on by default** and starts deleting old telematics data on the first scheduler run. To keep history, set the values to `0` under Fleet-Ops › Settings › Telematics Data before upgrading. The Fleet-Ops migrations add indexes to `device_events` and `positions`; on large tables, run them in a maintenance window. Deleted rows free space inside MySQL; run `OPTIMIZE TABLE` off-peak to return it to disk.
- **Keep the scheduler and a queue worker running.** Storefront campaigns, promotion reservations and telematics pruning depend on them.
- **Storefront apps:** `customers/register-device` now requires `token` and `platform` (`ios` or `android`). Update your Storefront app so it registers devices this way. Optionally set `STOREFRONT_PUSH_ANDROID_CHANNEL_ID`.
- Users who accepted an invite before this upgrade and never set a password should use **Forgot password**.

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
