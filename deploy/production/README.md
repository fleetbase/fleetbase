# Production stack

Fleetbase on one server, over HTTPS, with pinned images and nothing public except ports 80 and 443. Gantry installs and upgrades this stack for you, and you can also run it by hand.

| Service | What it does | Public? |
| --- | --- | --- |
| `proxy` | Caddy: certificates, routing and the maintenance page | Ports 80 and 443 |
| `console` | The web console | Through the proxy |
| `application` | The API | Through the proxy |
| `socket` | Live updates, at `/socketcluster/` on the API address | Through the proxy |
| `queue`, `scheduler` | Background jobs and scheduled tasks | No |
| `database` | MySQL 8.4. Left out when you use your own database | No |
| `cache` | Valkey 8 | No |

## Before you start

- A Linux server with Docker and the Compose plugin, version 2.20 or newer.
- Two DNS records pointing at the server: `fleet.example.com` and `api.fleet.example.com`.
- Ports 80 and 443 open to the internet, for automatic certificates.

## Run it

```bash
./init.sh --domain fleet.example.com --version v0.7.76
docker compose -f compose.yml --env-file /opt/fleetbase/config/stack.env up -d
docker compose -f compose.yml --env-file /opt/fleetbase/config/stack.env exec -T application ./deploy.sh
./verify.sh /opt/fleetbase
```

Then open the console and create your organization. If you passed `--claim-token`, open it as `https://fleet.example.com/onboard?claim=<token>`, because the first organization can't be created without it.

## What goes where

```
/opt/fleetbase/
  config/    stack.env and the console's config. No secrets
  secrets/   app key and passwords. Readable only by root
  data/      mysql, valkey, storage (uploaded files) and caddy (certificates)
  certs/     fullchain.pem and privkey.pem, for --tls own
  run/       the maintenance flag
```

**Keep a copy of `secrets/` somewhere safe.** Without your app key, a backup can't be fully restored on a new server.

Running `init.sh` again keeps the secrets already there.

## Certificates

| `--tls` | Use it when |
| --- | --- |
| `auto` | The server is reachable from the internet. Caddy gets and renews certificates |
| `own` | You have your own certificate. Put it in `certs/` |
| `internal` | A private network, using Caddy's own certificate authority. Browsers need to trust it |

## Maintenance page

```bash
touch /opt/fleetbase/run/maintenance
rm /opt/fleetbase/run/maintenance
```

While the file exists, the console shows `site/maintenance.html`, and the API answers with a JSON 503. No restart is needed.

## Sign-ups

`init.sh` sets `ONBOARD_ALLOW_REGISTRATION=false`, so once your first organization exists, people join by invitation only.

## Telemetry

Off unless you pass `--telemetry`.
