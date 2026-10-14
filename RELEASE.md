> v0.7.69 ~ "SMS guard, authenticated realtime channels, database backups, private media buckets, tracking page settings and verified storefront reviews"

---
## Highlights
Fleetbase `0.7.69` ships Core API `1.6.70`, FleetOps `0.6.72`, Storefront `0.4.25`, Ledger `0.0.13`, Customer Portal `0.0.16`, Dev Engine `0.2.18`, Ember UI `0.4.6`, Ember Core `0.3.26` and FleetOps Data `0.2.3`.

- **SMS send guard.** Every text the platform sends passes a guard before a provider is called: destination validation, per-organization and per-number budgets, a circuit breaker, blocked countries and prefixes, and a send ledger. A new Admin → API Traffic → **SMS Guard** page configures it at runtime. The guard is **on in `enforce` mode by default**; switch to `monitor` for the first days after upgrading.
- **Fleetbase socket server and authenticated realtime channels.** The stock SocketCluster image is replaced by `fleetbase/fleetbase-socket`, which can authenticate channels with short-lived tokens, and the API publishes through a signed internal endpoint. The console, FleetOps and Storefront fetch tokens when the server offers them. **Socket auth is off by default** and stays off until `SOCKETCLUSTER_AUTH_ENABLED=true`, so every existing socket client keeps working.
- **Database backups that fail loudly.** Admin → Database Backups with status, schedule, retention and recent runs. Failed backups email the configured addresses, and the image now includes `mysqldump`.
- **Private media buckets.** Stored file links are signed on read, so the S3 media bucket can be fully private. FleetOps signatures and Storefront review photos upload without a public ACL.
- **FleetOps:** tracking page settings per organization, a safer public order lookup, structured label codes, status-guarded order edits with `order.changed` events, and a long list of order, geofence and orchestrator fixes.
- **Storefront:** verified-purchase reviews, order chat with the driver, richer public promotions, a console UX overhaul and hardened customer verification.
- **API cache invalidation.** Writes invalidate every cached list, record and relationship that embeds the written table, across Core, FleetOps, Storefront and Ledger.
- **Security fixes** in Core (requested relations, notifiables, company-scoped deletes), Storefront (network console actions) and Customer Portal (organization settings).

---
## Component Versions
- `console`: `0.7.69`
- `core-api`: `1.6.70`
- `fleetops`: `0.6.72`
- `storefront`: `0.4.25`
- `ledger`: `0.0.13`
- `customer-portal`: `0.0.16`
- `dev-engine`: `0.2.18`
- `ember-ui`: `0.4.6`
- `ember-core`: `0.3.26`
- `fleetops-data`: `0.2.3`
- `iam-engine`: `0.1.13`
- `registry-bridge`: `0.1.10`

---
## Fleetbase (console, images, installer)
### SMS Guard admin page (#714, #715, #716)
- **Admin → API Traffic → SMS Guard**: enable the guard and switch between `enforce` and `monitor` at runtime; budgets per organization, per destination number, new-organization probation and the platform as a whole; circuit-breaker thresholds, blocked countries and prefixes, alert emails; per-organization exceptions; pauses (what the breaker or an administrator paused, pause now, lift); and 24-hour usage per organization from the send ledger. Everything applies within a minute, no deployment.

### Socket server and channel authentication (#704, #710)
- **`fleetbase/fleetbase-socket`** replaces `socketcluster/socketcluster` in compose, the installer, Helm and the image build (amd64 and arm64).
- **Channel authentication** with `off`, `log` and `enforce` modes. With it on, clients present a token, the socket server asks the API whether that token may follow a channel, and the API publishes through a signed internal endpoint on port 8001.
- **Off until switched on:** auth needs `SOCKETCLUSTER_AUTH_ENABLED=true` on the API and the socket server. The installer generates a key but leaves the switch off and the mode at `log`. Compose, the override example, the installer and the Helm chart carry the new variables (#710).
- **Console socket test** listens on the admin's own `test.{user}` channel and reports refused subscriptions.

### Database backups (#703)
- **Admin → Database Backups:** last success and last run, with a warning when the last run failed or nothing succeeded in 26 hours. Frequency, time and day; disk, bucket and path; databases; retention by days or count; minimum dump size; failure emails; and recent runs with "Run backup now".
- **`mysqldump` in the image.** Before, the backup bucket only ever received empty gzip files.

### Public pages (#711, #712)
- **Public `/~/` pages take a nested path.** `/~/{slug}/{anything}` resolves to the page registered for `{slug}`, which reads the rest of the path itself. FleetOps' tracking page uses `/~/t/{company}/{number}` and `/~/track/{number}`.
- **Fix: public pages scroll again** after the nested route change.

### Build and CI (#701, #702, #717, #718, #719)
- **Build Fleetbase Binaries** passes again on Linux, and the macOS job runs on GitHub-hosted runners (#701). **The static binaries include the `geos` PHP extension** (#702), which FleetOps uses for geometry such as service-area centroids.
- The **API contract** job that FleetOps, Storefront and Ledger run against the published image is deterministic: tracking deletes run before the order delete, the order activity cycle ends itself, Storefront's order and review requests run after a captured order, and socket auth stays off to match production (#717, #718, #719).

---
## Core API `1.6.70` (`1.6.69` + `1.6.70`)
### Added
- **SMS send guard** (#305, #307): destination validation with libphonenumber (mobile numbers only), per-organization and per-number budgets, new-organization probation, a circuit breaker with learned signals, blocked countries and prefixes, alert emails, and a **send ledger** (`sms_sends`) with every allowed send settled against the provider outcome and every refusal with its reason. Admin API under `int/v1/sms-guard`. `SmsServiceChannel` delivers notification texts through the guard too.
- **Verification code tracing and single-use hashed codes** (#289, #307): `verification_codes` gains tracing columns; `generateSmsVerificationFor(..., ['hashed' => true])` stores an HMAC and returns the plain code once; `check()` counts attempts and reports `valid`, `invalid`, `expired` or `locked`; `consume()` uses a code up.
- **`generateSmsVerificationFor()` takes a `phone` option** (1.6.70): the code is texted to that number instead of the subject's own, which a customer changing their phone number needs.
- **Authenticated realtime channels** (#290): socket tokens, a channel authorizer with per-resource resolvers, and signed HTTP publish. `POST int/v1/socket/token` mints a user token, `POST v1/socket/system-token` serves platform API callers, and `POST int/v1/socket/authorize` is called only by the socket server.
- **Comment visibility and `comment.created`** (#306): comments carry `meta.visibility` (`internal` or `customer`). Public `GET v1/comments` no longer returns internal comments. **Chat participant roles and system messages**: participants expose `role`, messages expose `system` and `meta`.
- **API cache dependencies** (#299, #300, #301): cache keys carry the versions of every table they embed, so a write to a related table invalidates the lists, records and relationships that embed it.
- **Database backups** (#288, #295, #296): settings-driven `db:backup` on a configurable schedule, `DB_BACKUP_*` defaults, admin API under `int/v1/database-backups`.
- **API request logs** (#302): any route that attaches `LogApiRequests` is logged, and an extension can relate the log row to its own ids.

### Changed
- **Private media buckets** (#287): stored file URLs into the configured `s3` bucket are signed on read.
- **Faster lookups** (#291): the country lookup is cached and `files.subject_uuid` is indexed.
- `without[]` uses `makeHidden()`; requested relation names come back as declared; `withCounts()` accepts an array (#303).

### Security
- **Requested relations must be relations** (#303): `with`, `expand`, `with_count` and `count` reached Eloquent unchecked, so a request could run any public method on a model.
- **Only registered notifiables are resolved** from saved notification settings (#304).
- **Deletes are scoped to the company** (#304): the company constraint on `deleteRecord` never matched. Reports are filtered by company.
- **A failed comment publish no longer leaves every model unguarded** in a long-lived Octane worker (#298).
- Order lifecycle events reach `driverAssigned.{driver uuid}` again (#306).

### Removed
- `MysqlS3Backup`, `S3BackupTrimmer` and `config/laravel-mysql-s3-backup.php` (#288). The unrouted legacy Twilio-direct SMS login methods on `AuthController` (#307).

---
## FleetOps `0.6.72`
### New
- **Tracking Page settings** (#355, #357): Fleet-Ops → Settings → Tracking Page lets each organization configure the customer tracking page: its own page at `/t/{slug}`, whether its numbers can be tracked on the shared page, branding, how customers verify, and what verified customers see. Administrators set the shared page's defaults under Fleet-Ops Config → Tracking Page.
- **Structured label codes** (#356): QR codes carry a tracking URL with the tracking number and the owner's public id; barcodes use Code 128; every scan endpoint still accepts the old codes.
- **Status-guarded order edits and `order.changed` events** (#394, #398): an order's route, items, contact, schedule, notes and amounts can be edited after it is placed, and every edit is broadcast as `order.changed`; `order.driver_unassigned` when a driver is taken off. Only ad hoc orders are offered to drivers.
- **Socket auth** (#358): FleetOps channel resolvers, driver socket tokens and a per-customer tracking channel.
- **Hashed single-use verification codes, no stub users before verification** (#395); **SMS-sending routes throttled per address** (#393); an SMS guard refusal answers with its status (#396).
- **Customer photos on live order and board cards** (#387), a **latest proof-of-delivery photos** dashboard widget (#388), and organisations choose **where the live map opens** (#389).
- **Shared resource descriptors and identity stubs** come from fleetops-data (#379, #380).

### Fixed
- **Safer public order lookup** (#352): `GET int/v1/fleet-ops/lookup` is rate limited per address and returns a minimal resource without notes, meta or internal ids.
- **Signatures on private S3 buckets** (#353): written without an ACL and served through signed URLs; legacy avatar URLs are re-signed.
- Customer credentials email links to `/customer-access/{slug}` (#354). Parcel box images in production builds (#370). The shipped map-marker as the live-map fallback icon (#371).
- Places answer 404 when missing (#373). Radius circles at the requested size (#374). Public ids in facilitator and customer filters (#375). The new order draft survives editing a place (#376).
- **Deleting an order soft-deletes its payload, entities and tracking data with it** (#377). Managed users for test keys go to the sandbox database (#378).
- Telematics retention no longer scans the whole `device_events` table (#381). Zones return geofence trigger and dwell settings (#382).
- Distance is not measured from a driver's placeholder position (#383). A queued dispatch cannot reset a started order (#384). Geofence arrival is marked against the order's current destination (#385). The orchestrator runs the engine selected in settings and reports honest results (#386).
- Cached lists are invalidated when the tables they embed are written (#390). Driver and vehicle observer cleanup, latest-status index, contact address filter (#391). Relation return types declared for the console; resource expansions filtered through core (#392).
- Russian street-field translations align with the customer portal (#397, thanks @spanchenko).

---
## Storefront `0.4.25`
### New
- **Verified-purchase reviews** (#115): reviews tied to a completed order, an eligibility endpoint, deleting your own review. Public reviews no longer show the reviewer's email or phone.
- **Order chat** with the driver delivering the order (#117): get the chat, page messages, send text and photos, mark read; new messages on `chat.{id}`.
- **Public promotions** include the store, the shareable code and availability (#116). **Product add-on limits** on public payloads (#118).
- **Console UX overhaul** (#137): context switcher, network screens, cards, panels, promotions hub and create order. Drivers, customers, vehicles and places render through the shared identity components (#120).
- **Hardened customer verification** (#144, #145): creation codes are refused for identities that already have an account, numbers are validated, SMS routes are throttled, code guessing locks out, codes are hashed and single-use, and order alerts are guarded.
- Logged storefront requests relate to the store or network whose key made them (#143).
- Order chat needs socket authentication switched on (see Upgrade Steps); until then the chat endpoints answer but no realtime messages are delivered.

### Fixed
- Review photos upload without a public ACL (#112). Network and console store listings are faster (#114).
- A network order's other stores are added as pickup waypoints (#138). Removing a store through `addStores` keeps its other networks (#139).
- Storefront list caches are invalidated when the tables they embed change (#140).
- **Security:** network console actions only act on the session company's networks (#141). Relation return types declared for the console (#142).

---
## Ledger `0.0.13`
- **Transaction lists stay current** (#33): the cached list declares the tables it embeds, so edits to line items, journal entries, accounts and the transaction's parties invalidate it.
- **Public API requests are logged** (#34, #35): writes to the public wallet API and the customer invoice routes land in the API request logs.

## Customer Portal `0.0.16`
- **Security: portal customers could read and overwrite organization settings** (#22). The admin settings routes now require the permission, and the portal account is scoped to the company.
- Creating the default access slug no longer crashes when the company-name slug is taken (#22).

## Dev Engine `0.2.18`
- The sockets viewer shows `subscribeFail` and `kickOut` with the server's reason, and socket payloads render as escaped text (#51).

## Ember UI `0.4.6`
- **Skeleton loading components** and loading substates for engines (#189). **Dark resource card tier.** The dashboard **report widget runs the report** instead of showing stored results (#188).
- Fixes: notes on contacts save, the date picker shows its date format, `CoordinatesInput` accepts null, badge and button tones.

## Ember Core `0.3.26`
- **The console socket authenticates with short-lived socket tokens** (#97): fetched from `POST int/v1/socket/token`, refreshed before expiry, re-authenticated on sign-in and organization switch. With socket auth off on the server it connects anonymously as before.

## FleetOps Data `0.2.3`
- **Shared resource identity descriptors** for driver, vehicle, customer, contact, place, order, vendor and fleet, usable from any extension (#86, #88). The **identity stub builder** moves here (#87). An order's customer loads with its saved places (#85).

---
## Upgrade Steps
- **Run migrations.** Core: `database_backups`, the `files.subject_uuid` index, `meta` on chat participants and messages, `sms_sends` and the `verification_codes` tracing columns. Storefront: the `reviews` index and `order_uuid` column.
- **SMS guard is on in `enforce` mode** (`SMS_GUARD_ENABLED`, `SMS_GUARD_MODE`). To watch before refusing, deploy with `SMS_GUARD_MODE=monitor` or switch it in Admin → API Traffic → SMS Guard, review the `sms.would_block` log entries, then switch to `enforce`.
- **Socket auth:** nothing changes until you set `SOCKETCLUSTER_AUTH_ENABLED=true`. Roll it out in this order:
  1. Ship clients that request a socket token and fall back to connecting without one when the token route answers 404 (this console, FleetOps and Storefront already do).
  2. Switch it on for the API (application, queue, scheduler) and the socket server, with `SOCKETCLUSTER_AUTH_MODE=log`.
  3. Check the deny log, then switch to `enforce`.
- **Database backups** replace the old S3 backup settings. Configure them in Admin → Database Backups or with `DB_BACKUP_*`.
- **Private media bucket:** remove any public `s3:GetObject` statement from the bucket policy and turn on Block Public Access.
- **Extensions:** a relation that clients request through `with`, `expand` or counts must declare an Eloquent `Relation` return type or be listed in `$withable`, or it stops loading. Every `dynamic:` notifiable must be registered through `NotificationRegistry::registerNotifiable()`.
- **Public API clients:** `GET v1/comments` no longer returns internal comments, `POST v1/comments` accepts `visibility`, and comment, chat participant and chat message responses gain fields. The public order lookup returns a minimal resource.

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
