> v0.7.74 ~ "Sign in with Fleetbase, road distance from one routing engine, and App Review access"

---
## Highlights

- **Sign in with Fleetbase.** Fleetbase is now an OAuth 2.0 / OpenID Connect provider. Apps can offer "Continue with Fleetbase" and, with the user's consent, act on one organization the user administers. The console adds the consent screen at `/oauth/authorize`, **Admin → Auth Config → OAuth Apps** to register apps (with logo upload), rotate secrets, turn apps off and see who authorized them, and **Account → Auth → Connected apps**, where users remove access. (core-api #324 and #327, fleetbase #734 and #737)
- **One routing engine for order distance, ETAs and the map.** An order's stored distance and time, its live ETAs and the route on the map all come from the organization's routing engine. Order distance used to default to a straight-line estimate at ~50 km/h. Valhalla is now the default engine, Google is off until an administrator enables it, and the OSRM server is a setting in **Admin → Fleet-Ops → Routing** and per organization. (fleetops #406)
- **Fleetbase Hosted Routing.** Valhalla's default server is now Fleetbase Hosted Routing instead of the OpenStreetMap community servers, whose usage policy doesn't allow production traffic. The first administrator of a new install can take a free Community key during onboarding. It's on by default and says what is sent: the admin's email and the install address. Route coordinates are processed on Fleetbase servers in Singapore and not logged. (core-api #325, fleetbase #735, valhalla #11)
- **App Review access.** Apple and Google reviewers can't receive a texted sign-in code. Storefront stores and networks, and an organization's Navigator app, can now let reviewers sign in with a reserved test number and a six-digit code the owner creates. The number is never texted, and reviewers' orders are marked and never auto-dispatched. (core-api #323, storefront #162, fleetops #418)
- **Security:**
  - The Valhalla and VROOM settings are locked down. Any signed-in user could read the system API key and change the system host.
  - Organization routing hosts must be public addresses.
  - A driver, customer or contact is never linked to another organization's login account.
  - Uploaded files are stored under an extension that matches their contents.
  - league/commonmark and symfony/http-foundation are updated for published advisories. (valhalla #9 #10, vroom #8 #9, fleetops #414 #417, core-api #320, fleetbase #731)
- **Mongolian and Ukrainian.** Storefront answers customers in their language (API errors, SMS texts, notifications), and the API now ships Mongolian and Ukrainian validation, auth and password messages. (storefront #164)

---
## Component Versions
- `console`: `0.7.74`
- `core-api`: `1.6.74`
- `fleetops`: `0.6.75`
- `storefront`: `0.4.30`
- `valhalla`: `0.0.5`
- `vroom`: `0.0.5`
- `registry-bridge`: `0.1.11`
- `ledger`: `0.0.13`
- `customer-portal`: `0.0.16`
- `dev-engine`: `0.2.18`
- `ember-ui`: `0.4.6`
- `ember-core`: `0.3.26`
- `fleetops-data`: `0.2.3`
- `iam-engine`: `0.1.13`

---
## Core API `1.6.74`
- **Sign in with Fleetbase** (#324): authorization code flow with PKCE required for every client, rotating refresh tokens, revocation, ID tokens, `/oauth/userinfo`, `/oauth/jwks` and `/.well-known/openid-configuration`. Each consent is bound to the organization the user picked, and every refresh and API call checks that the user still administers it. Extensions register their own scopes. Artisan: `oauth-server:keys`, `oauth-server:client create|rotate|list`, `oauth-server:prune`.
- **Dynamic client registration** (#327): software installed on many sites, such as Fleetbase for WooCommerce, registers one public client per install at `POST /oauth/register`. The `api-key:create` scope lets a connected app create its own API key, which expires when its last grant is revoked.
- **Webhook endpoints with an API key** (#319): `/v1/webhook-endpoints` supports create, list, show, update, rotate secret and delete. Each endpoint has its own signing secret, and deliveries also carry `X-Fleetbase-Signature`.
- **App Review access** (#323): extensions register what their app signs reviewers in to. Owners turn it on in the console. Numbers reserved for fiction are never texted.
- **Hosted Routing keys at install time** (#325): `routing:register` gives a new install a free Hosted Routing key when the first admin agrees during onboarding.
- **Security: uploaded file extensions** (#320): a file's stored extension now comes from its detected type. Script extensions are never used.

---
## Fleet-Ops `0.6.75`
- **One routing engine** (#406): order distance, ETAs, tracking and the map use the organization's routing engine. If none is set, they use the admin default, then the platform's Valhalla server, then a straight-line estimate. Road results are cached for 24 hours.
- **Routing provider controls** (#406): administrators choose which providers organizations may use (Google, Valhalla, OSRM, VROOM), with per-organization exceptions, and set the default engines. The OSRM server is now a setting, system-wide and per organization.
- **Security** (#414, #417): a profile never links to another organization's login account, and an organization's routing override on a private address is ignored.
- **Orders** (#411, #412): partial `payload` edits, addresses sent with coordinates keep their street, `Idempotency-Key` on order creation, `scheduled_at` keeps its UTC offset, and service quote fixes.
- **Tracking numbers** (#413, #416): numbers with a space can be looked up again, and new numbers use only letters and digits.
- **Navigator App Review access** (#418): **Settings → Navigator App → App Review**.

---
## Storefront `0.4.30`
- **App Review access** (#162): **Settings → App Review** on a store or network. A new `manage-app-review` permission controls it.
- **Continue with Fleetbase** (#163): with an administrator's consent, an app can read the organization's stores and networks, get an API key for its Storefront app, and turn App Review access on or off.
- **Answers in the customer's language** (#164): API errors, SMS texts and notifications follow the app's `Accept-Language` (English, Mongolian, Ukrainian).

---
## Valhalla `0.0.5` and VROOM `0.0.5`
- Only system administrators can read or change the system settings. Organization settings need the Fleet-Ops `routing-settings` permissions, and the API key is never sent back to the console.
- Organization hosts on private addresses are refused on save and ignored at request time.
- Valhalla defaults to Fleetbase Hosted Routing. When it's the configured server, the Valhalla panel shows the key's plan and today's usage.

---
## Upgrade Steps
- Pull the new images and restart every API, queue, scheduler and events container.
- Migrations run on deploy. They add the OAuth provider tables, `review_accesses`, `webhook_endpoints.secret`, and `api_credentials.oauth_client_id` and `oauth_installation`.
- **To use Sign in with Fleetbase**, give every API instance the same signing key pair: `php artisan oauth-server:keys`, or `php artisan oauth-server:keys --show` and set `OAUTH_SERVER_PRIVATE_KEY` and `OAUTH_SERVER_PUBLIC_KEY`. Set `OAUTH_SERVER_ISSUER` if the public API URL differs from `APP_URL`.
- **Routing defaults changed.** Review **Admin → Fleet-Ops → Routing** after upgrading:
  - The default engine is now Valhalla (it was OSRM). If you run your own OSRM, make it the default there or set `ROUTING_DISPLAY_ENGINE=osrm`.
  - The default Valhalla server needs a key. Without one, order distance and ETAs fall back to the straight-line estimate and the panel shows "Get a free key". To keep your own Valhalla server, set its host in the panel or `VALHALLA_HOST`.
  - Google is off. Turn it on in the panel or set `ROUTING_GOOGLE_ENABLED=true`.
  - `TRACKING_PROVIDER` and `TRACKING_PROVIDER_FALLBACKS` are no longer read. Tracking follows the routing engine.
- **Routing servers on your own network.** An organization's Valhalla, VROOM or OSRM host on a private address (for example `http://valhalla:8002`) is now refused and falls back to the system server. Set `VALHALLA_ALLOW_PRIVATE_HOSTS=true`, `VROOM_ALLOW_PRIVATE_HOSTS=true` or `OSRM_ALLOW_PRIVATE_HOSTS=true` to allow it. System-level hosts are unaffected.
- Staff who aren't administrators need the new Storefront `manage-app-review` permission to manage App Review access, and the Fleet-Ops `routing-settings` permissions to change their organization's routing settings.

---
## Need help?
Join the discussion on [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions) or drop by [#fleetbase on Discord](https://discord.com/invite/HnTqQ6zAVn)
