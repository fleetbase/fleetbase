> v0.7.70 ~ "Manage realtime socket authentication from the console"

---
## Highlights

- **Socket settings in the admin console.** Configure → Socket now shows the socket server's status and recent authorization denials. It lets system administrators turn socket authentication on and choose the mode (`off`, `log`, `enforce`) without restarting anything. The shared auth key stays in the environment and is never shown.

- **The socket server applies settings at runtime.** With `SOCKETCLUSTER_AUTH_KEY` set, `fleetbase/fleetbase-socket` polls the API's signed `GET int/v1/socket/config` (every `SOCKETCLUSTER_CONFIG_POLL_SECONDS`, default 30) and applies the switch, mode and origins without a restart. Entering `enforce` disconnects every client once so their subscriptions are re-authorized. `/stats` reports the effective config and the top channel-authorization denials, which the console shows. Helm gains `socketcluster.configUrl` and `configPollSeconds`; docker-compose needs nothing new. (#722, core-api #314)
- **Fix: the socket test console escapes event content** instead of rendering it as HTML. (#722)

---
## Component Versions
- `console`: `0.7.70`
- `core-api`: `1.6.71`
- `fleetops`: `0.6.73`
- `storefront`: `0.4.26`
- `registry-bridge`: `0.1.11`
- `ledger`: `0.0.13`
- `customer-portal`: `0.0.16`
- `dev-engine`: `0.2.18`
- `ember-ui`: `0.4.6`
- `ember-core`: `0.3.26`
- `fleetops-data`: `0.2.3`
- `iam-engine`: `0.1.13`

---
## Core API `1.6.71`
- **Socket settings from the console** (#314): `GET`/`POST int/v1/settings/socket` and the signed `GET int/v1/socket/config` the socket server polls. The key stays in the environment.
- **A controller's filter is used for every query it serves** (#315): under Octane the first controller to list a model decided the filter for every other, so a Storefront network's Orders page listed every order in the company.
- **Live and test-mode data no longer share API cache entries** (#312): cache keys carry the database connection.
- **Driver-assigned lifecycle events reach `driver.{public_id}` and `driver.{uuid}`** (#311); `driverAssigned.*` is still published and deprecated.
- Internal Category responses include `parent_uuid` (#316), which Storefront's nested categories build their tree from.

## FleetOps `0.6.73`
- **Fix: creating a driver or contact with a test API key returned 500** (#404): only the columns the sandbox tables have are copied.
- **Fix: manifest lookups are scoped to the caller's organization** (#403).
- **Fix: the proof-of-delivery dashboard widget loads** (#407): it requested a path that did not exist.

## Storefront `0.4.26`
- **Nested categories** up to three levels for products and catalogs, with parent and depth on the public API and product rollup into parent categories (#156). **Catalog categories have icons** (#155). Category icon uploads no longer write the file record into `icon` (#157).
- **QPay orders complete in the published app again** (#158): a status request without `verify` checks with QPay and creates the order straight away.
- **New stores and networks show straight away** in the switcher (#148). **Network orders open at their own URL** and the in-place order panel scrolls (#149). **Settings save after a toggle** (#152). A network's saved gateways and notification channels show after a refresh (#154).
- **A truck's status decides whether it takes orders**; new trucks start inactive (#153). **Truck orders are marked** with `meta.food_truck` (#150).

## Registry Bridge `0.1.11`
- **Fix: registry endpoints returned 500 in console test mode** (#41): registry data always reads the live connection.
- **Fix: the Purchased extensions page showed blank cards** (#40).

---
## Upgrade Steps
- Run `composer update` / pull the images as usual. No migrations in this release.
- Storefront `0.4.26` requires Core API `1.6.71`.
- Socket settings: nothing changes until an administrator saves one under Configure → Socket; environment values stay the defaults. Older socket server images keep reading their environment.
- Storefront trucks: a truck is on sale only while its Storefront status is **Active**; check your trucks' status after upgrading.

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
