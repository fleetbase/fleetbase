> v0.7.69 ~ "Fleetbase socket server, database backups, private media buckets and verified storefront reviews"

---
## Highlights
Fleetbase `0.7.69` ships Core API `1.6.69`, Storefront `0.4.25` and Customer Portal `0.0.16`.

- **Fleetbase socket server.** The stock SocketCluster image is replaced by `fleetbase/fleetbase-socket`, which can authenticate realtime channels with short-lived tokens, and the API publishes through a signed internal endpoint. **Socket auth is off by default** and stays off until `SOCKETCLUSTER_AUTH_ENABLED=true`, so every existing socket client keeps working. Turn it on once your clients fetch socket tokens.
- **Database backups that fail loudly.** A new Admin → Database Backups page with status, schedule, retention and recent runs. Failed backups email the configured addresses, and the image now includes `mysqldump`.
- **Private media buckets.** Stored file links are signed on read, so the S3 media bucket can be fully private.
- **Storefront:** verified-purchase reviews, order chat with the driver, richer public promotions and faster store listings.

---
## Component Versions
- `console`: `0.7.69`
- `core-api`: `1.6.69`
- `fleetops`: `0.6.71`
- `storefront`: `0.4.25`
- `ledger`: `0.0.12`
- `iam-engine`: `0.1.13`
- `dev-engine`: `0.2.17`
- `ember-core`: `0.3.25`
- `ember-ui`: `0.4.5`
- `registry-bridge`: `0.1.10`
- `customer-portal`: `0.0.16`

---
## New Features
### Socket server and channel authentication (#704, core-api #290, storefront #113)
- **`fleetbase/fleetbase-socket`** replaces `socketcluster/socketcluster` in compose, the installer, Helm and the image build (amd64 and arm64).
- **Channel authentication** with `off`, `log` and `enforce` modes. With it on, clients present a token, the socket server asks the API whether that token may follow a channel, and the API publishes through a signed internal endpoint on port 8001.
- **Off until switched on:** auth needs `SOCKETCLUSTER_AUTH_ENABLED=true` on the API and the socket server. The installer generates a key but leaves the switch off and the mode at `log`.
- **Console socket test** listens on the admin's own `test.{user}` channel and reports refused subscriptions.

### Database backups (#703, core-api #288)
- **Admin → Database Backups:** last success and last run, with a warning when the last run failed or nothing succeeded in 26 hours. Frequency, time and day; disk, bucket and path; databases; retention by days or count; minimum dump size; failure emails; and recent runs with "Run backup now".
- **`mysqldump` in the image.** Before, the backup bucket only ever received empty gzip files.

### Storefront `0.4.25`
- **Verified-purchase reviews**, an eligibility endpoint and deleting your own review. Public reviews no longer show the reviewer's email or phone.
- **Order chat** between the customer and the driver delivering their order.
- **Public promotions** include the store, the shareable code and availability.
- **Product add-on limits** (`is_required`, `max_selectable`) on public product payloads.

---
## Improvements
- **Faster lookups:** the country lookup is cached and `files.subject_uuid` is indexed (core-api #291). Network and Console store listings are faster (storefront #114).
- **Hashed one-time codes** with attempt counting (core-api #289).

---
## Fixes
- **Build Fleetbase Binaries** passes again on Linux, and the macOS job runs on GitHub-hosted runners (#701).
- **The static binaries include the `geos` PHP extension** (#702), which FleetOps uses for geometry such as service-area centroids.
- **Review photos upload without a public ACL** (storefront #112).
- **Portal customers can no longer open organization settings** (customer-portal #22).

---
## Upgrade Steps
- Run migrations: `database_backups` and the `files.subject_uuid` index (core-api), and the `reviews` index and `order_uuid` column (storefront).
- Socket auth: nothing changes until you set `SOCKETCLUSTER_AUTH_ENABLED=true`. Roll it out in this order:
  1. Ship clients that request a socket token and fall back to connecting without one when the token route answers 404.
  2. Switch it on for the API (application, queue, scheduler) and the socket server, with `SOCKETCLUSTER_AUTH_MODE=log`.
  3. Check the deny log, then switch to `enforce`.
- Database backups replace the old S3 backup settings. Configure them in Admin → Database Backups or with `DB_BACKUP_*`.
- To make the media bucket private, remove any public `s3:GetObject` statement from the bucket policy and turn on Block Public Access.

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
