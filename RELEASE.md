> v0.7.66 ~ "One API consumer can no longer rate-limit the whole platform, plus admin rate-limit controls, API consumer visibility and release performance reports"

---
## Highlights
Fleetbase `0.7.66` ships Core API `1.6.66` and Storefront `0.4.23`.

- **Rate limiting is per API consumer.** One integration sending a burst of order requests with a single API key put the entire platform into `429 Too many requests` for every tenant, app and console user. Each API key or token now has its own limit, so only the busy consumer is throttled.
- **Admins control rate limits from the console.** Admin › API Traffic › Rate Limits sets the per-consumer limit and window, and adds per-organization overrides (a custom limit, or unlimited) for high-volume integrations.
- **Admins can see who is using the API.** Admin › API Traffic › API Consumers shows requests, 429s and a timeline for the last 5 minutes to 7 days, with a per-consumer table. A throttled consumer can be unblocked with one click.
- **Every release gets an API performance report.** p50/p90/p95/p99 latency, throughput and error rate, overall and per endpoint, compared against the previous release, attached to the GitHub Release.

---
## Component Versions
- `console`: `0.7.66`
- `core-api`: `1.6.66`
- `fleetops`: `0.6.70`
- `storefront`: `0.4.23`
- `ledger`: `0.0.11`
- `ember-ui`: `0.4.4`
- `registry-bridge`: `0.1.10`
- `customer-portal`: `0.0.15`

---
## Fixes
- **One API consumer could rate-limit the whole platform** (core-api #280, fleetbase #689). The rate limiter ran before the API key was authenticated, so it keyed every bucket on the client IP. Behind a load balancer that is the balancer's address, so every tenant, integration, driver app and console visitor shared one bucket of 120 requests a minute. A single customer creating orders over the API returned 429 to everyone, including people trying to sign in. The limiter now keys on the API key or token, and keeps the public API and the console's sign-in routes apart.
- **One busy store could rate-limit every other store** (storefront #108). The Storefront API limiter had the same IP-keyed bucket, and its key collided with the core API's. It now keys on the store key plus the client IP, so each device of each store has its own limit.
- **The API sees the real client IP behind proxies** (fleetbase #689). Proxies on private networks are trusted by default, so rate limiting and request logs see the caller's address instead of the load balancer's. Set `TRUSTED_PROXIES` for load balancers that connect from public addresses (e.g. Google Cloud: `35.191.0.0/16,130.211.0.0/22`).
- **429 responses tell clients when to retry** (core-api #280). `Retry-After` and `X-RateLimit-*` headers were being dropped.

---
## Improvements
- **Admin › API Traffic › Rate Limits** (core-api #281, fleetbase #690):
  - Turn rate limiting on or off, and set the requests per window and the window length.
  - Turn consumer tracking on or off.
  - Add per-organization overrides.
  - "Reset to Defaults" returns to the `THROTTLE_*` environment values.
- **Admin › API Traffic › API Consumers** (core-api #281, fleetbase #690):
  - Totals for requests, 429s and active consumers, plus a request timeline.
  - The busiest or most throttled API keys, tokens and addresses, with their organization, request rate, peak and limit.
  - Counts are kept in Redis.
- **API performance report on every release** (fleetbase #691). A k6 run exercises the public API: orders, places, contacts, drivers, vehicles, fleets and more. The report is published to the job summary and attached to the GitHub Release as `performance-report-<tag>.md/.html` and `performance-metrics-<tag>.json`.

---
## Upgrade Steps
- **Check `TRUSTED_PROXIES` if your load balancer connects from a public address** (for example Google Cloud load balancers). The default trusts only private and loopback ranges.
- **High-volume API integrations:** each API key now gets its own `THROTTLE_REQUESTS_PER_MINUTE` (default 120). Give heavy integrations an organization override under Admin › API Traffic › Rate Limits.
- Consumer metrics need Redis, which the bundled stack provides. Set `THROTTLE_TRACK_CONSUMERS=false` to turn them off.

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
