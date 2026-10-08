# Fleetbase socket server

The realtime server behind the Fleetbase console, Navigator and Storefront apps. It is
[SocketCluster](https://socketcluster.io) 17 with three additions:

- **Authenticated subscriptions.** Clients present a short-lived JWT minted by the Fleetbase
  API. The server checks every channel subscription against the token, using local rules
  first, then a small cache, then the API's authorize endpoint.
- **No client publishing.** In `enforce` mode clients cannot publish, transmit or invoke.
  Only the API publishes.
- **Signed internal publish.** The API publishes with a signed `POST /publish` to a second,
  internal-only listener instead of opening a websocket for every event.

Image: `fleetbase/fleetbase-socket` (linux/amd64 and linux/arm64).

## Listeners

| Port (default) | Purpose | Expose publicly? |
|---|---|---|
| `8000` (`SOCKETCLUSTER_PORT`) | WebSocket at `/socketcluster/`, `GET /health-check` returns `200 OK` | Yes (docker-compose maps it to host port 38000) |
| `8001` (`SOCKETCLUSTER_INTERNAL_PORT`) | Signed `POST /publish` and `GET /stats` for the API | **No.** Keep it on the private network |

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `SOCKETCLUSTER_AUTH_ENABLED` | `false` | Switches socket auth on (`true`, `1`, `yes` or `on`). Must match the API's value. While it is off the mode is forced to `off`, the key is not used, and the internal publish and stats endpoints answer `503`, so clients that connect without socket tokens keep working even when a key is provisioned. |
| `SOCKETCLUSTER_AUTH_KEY` | unset | Shared secret, at least 32 characters. Must be identical on the API (application, queue and scheduler) and the socket server. Unset disables the feature: the mode is forced to `off` and a warning is logged at startup. A key shorter than 32 characters stops the server from starting. |
| `SOCKETCLUSTER_AUTH_MODE` | `enforce` when switched on with a key, else `off` | `off`, `log` or `enforce` (see below). |
| `SOCKETCLUSTER_AUTHORIZE_URL` | `http://application:8000/int/v1/socket/authorize` | The API's authorize endpoint, reached over the private network. |
| `SOCKETCLUSTER_PORT` | `8000` | Public listener port. |
| `SOCKETCLUSTER_INTERNAL_PORT` | `8001` | Internal listener port. |
| `SOCKETCLUSTER_OPTIONS` | `{}` | JSON merged into the SocketCluster server options, e.g. `{"origins":"https://console.example.com:*"}`. The auth settings (`authKey`, `authVerifyAlgorithms`, `allowClientPublish`, ...) are owned by the server and are ignored here, with a warning. |
| `SOCKETCLUSTER_SOCKET_CHANNEL_LIMIT` | `1000` | Maximum channels per socket. |
| `SOCKETCLUSTER_LOG_LEVEL` | `2` | `0` silent, `1` errors, `2` errors, info and warnings, `3` debug. |
| `SCC_STATE_SERVER_HOST`, `SCC_STATE_SERVER_PORT`, `SCC_AUTH_KEY`, `SCC_INSTANCE_IP`, `SCC_INSTANCE_IP_FAMILY`, `SCC_MAPPING_ENGINE`, `SCC_CLIENT_POOL_SIZE`, `SCC_STATE_SERVER_CONNECT_TIMEOUT`, `SCC_STATE_SERVER_ACK_TIMEOUT`, `SCC_STATE_SERVER_RECONNECT_RANDOMNESS`, `SCC_PUB_SUB_BATCH_DURATION`, `SCC_BROKER_RETRY_DELAY` | unset | SocketCluster Cluster (SCC) for running several instances, the same as the stock image: SCC is enabled when `SCC_STATE_SERVER_HOST` is set. |

The API side reads `SOCKETCLUSTER_AUTH_ENABLED`, `SOCKETCLUSTER_AUTH_KEY`, `SOCKETCLUSTER_PUBLISH_URL` (default
`http://{SOCKETCLUSTER_HOST}:8001`) and `SOCKETCLUSTER_TOKEN_TTL` (default `900` seconds).
When `SOCKETCLUSTER_OPTIONS` restricts `origins` and auth is off, the API also needs `SOCKETCLUSTER_ORIGIN`, an allowed origin
such as `https://console.example.com`, which it sends as the `Origin` header when publishing; without it every broadcast is refused with `Invalid origin: *`.

Generate a key with, for example, `openssl rand -hex 32`.

## Modes

| Mode | Token verification | Subscriptions | Client publish/transmit/invoke | Kick-out on expiry or identity change |
|---|---|---|---|---|
| `off` | Yes (signature and claims) | All allowed, the API is never asked | Allowed | No |
| `log` | Yes | Decided and allowed; each would-deny is logged | Allowed, logged | Logged only |
| `enforce` | Yes | Denied unless authorized | Refused | Yes |

Recommended rollout:
1. Deploy with `SOCKETCLUSTER_AUTH_ENABLED=false` (the default). The key can already be set
   on the API and the socket server; nothing is authenticated and every existing client
   keeps working.
2. Ship clients that request a socket token and connect without one when the token route
   answers `404` (auth off).
3. Once they are out, set `SOCKETCLUSTER_AUTH_ENABLED=true` on the API (application, queue
   and scheduler) and the socket server, with `SOCKETCLUSTER_AUTH_MODE=log`.
4. Watch the deny log until it only shows traffic you expect to lose, then switch to
   `enforce`.

Fresh installs made with `scripts/docker-install.sh` get a generated key, the switch off
and `log` mode, ready for step 3.

### Deny log

Every (would-)denial is one JSON line on stdout. The token is never logged.

```json
{"ts":"...","level":"info","event":"socket_auth_deny","kind":"user","sub":"<uuid>","cid":"<uuid>","channel":"order.order_abc123","reason":"not_found","client":"console/0.3.26","mode":"log","action":"subscribe"}
```

`client` comes from the `client` query parameter clients add to the websocket URL (for
example `console/0.3.26` or `navigator/2.1.0`). It is a label, not a credential.

## Authorization

1. **Token.** A token arrives in the handshake (or later via `#authenticate`). SocketCluster
   verifies the HS256 signature with `SOCKETCLUSTER_AUTH_KEY`. The server then requires
   `iss=fleetbase-api`, `aud=fleetbase-socket`, numeric `iat` and `exp` with
   `exp - iat <= 3600`, a known `kind`, and `cid` unless the kind is `system`, `tracking`
   or `checkout`. A token that fails these checks leaves the socket anonymous.
2. **Subscribe.**
   - No token or an expired token: denied, except `fleetbase.install`, which the API allows
     only while the instance has no users.
   - `scp` claim present: only exactly those channels.
   - `system` tokens: any channel.
   - Local self rules: `company.{cid|cpid}` (user and api tokens), `api.{sub}` (api tokens),
     `user.{id}` and `driver.{id}` for ids in the token's `ids`, and `install.{cid}.*` and
     `uninstall.{cid}.*` (user tokens).
   - Otherwise the API decides: `POST SOCKETCLUSTER_AUTHORIZE_URL` with
     `{"token": "<jwt>|null", "channel": "..."}`. The request is signed and times out after
     2 seconds. Identical concurrent requests share one call. Allow decisions are cached per
     token (`jti`) and channel for up to 300 seconds, never past the token's expiry. Deny
     decisions are cached for up to 30 seconds. Timeouts, errors and malformed answers are
     denials and are not cached.
3. **Expiry and re-authentication.** When a socket's token expires (detected on the next
   packet or ping/pong), when the client removes its token, or when a re-authentication
   presents a token that fails verification, the socket is kicked out of every channel
   (`kickOut` message `token_expired` or `deauthenticated`). Re-authenticating as a
   different principal (`sub` or `cid` changed) kicks it out too (`identity_changed`).
   Refreshing the token for the same principal keeps the subscriptions.

A denied subscription fails with an `AuthError` whose `reason` property carries the short
reason, for example `no_token`, `out_of_scope`, `token_expired`, `authorize_timeout` or the
API's reason.

## Internal endpoints

Both use the publish key and these headers:

```
publishKey            = hex(HMAC_SHA256(key = SOCKETCLUSTER_AUTH_KEY, msg = "fleetbase-socket:publish"))
X-Fleetbase-Timestamp: <unix seconds>
X-Fleetbase-Signature: hex(HMAC_SHA256(key = publishKey, msg = timestamp + "." + rawBody))
```

Requests more than 60 seconds away from the server clock, or with a bad signature, get
`401`. Without `SOCKETCLUSTER_AUTH_KEY` both endpoints answer `503`.

- `POST /publish` with `{"channels": ["order.x", "company.y"], "data": {...}}` (or
  `{"channel": "order.x", "data": {...}}`). Each channel is a non-empty string of at most
  255 characters with no whitespace. Duplicates are published once. The body may be at
  most 2 MB. Responses: `202 {"published": n}`, `400` for a bad body, `401`, `413`.
- `GET /stats` (empty body, signed) returns uptime, mode, connected clients, cache size
  and counters (allowed and denied subscriptions, authorize calls, cache hits, timeouts,
  kick-outs, publish requests).

## Development

```sh
npm ci
npm test        # node --test: unit tests plus integration tests against a real server
npm start
```
