# k6 release benchmark

`api-release.js` measures the public order API and gates on rate-limit isolation. CI runs
it on every `v*` tag (`.github/workflows/performance.yml`), publishes the report to the job
summary and the `k6-report` artifact, and attaches it to the tag's GitHub Release.

## What it runs

| Phase | Scenario(s) | Key | What it proves |
|---|---|---|---|
| `throughput` | `throughput` (ramping arrival rate) | LOAD, listed in `THROTTLE_UNLIMITED_API_KEYS` | Per-endpoint p50/p95/p99, rps and error rate for order create 20% / update 20% / list 30% / get 30%. The key is unthrottled so it measures the API, not the limiter. |
| `noisy_neighbour` | `noisy_flood`, `victim`, `public_probe` (constant arrival rate) | NOISY and VICTIM, **different organizations** | One tenant floods create/update well above its per-key limit. Another tenant sends ~1 req/s of reads and writes, and an anonymous client loads a public console route (`GET /int/v1/settings/branding`). |

The phases run one after the other (`PHASE_GAP` apart), so the throughput numbers are not
skewed by the flood. The victim and the probe start `NOISY_WARMUP` into the flood, when the
noisy tenant's bucket is already exhausted.

### The isolation gate

The incident: one customer sent ~1 order write per second with one API key and **every**
consumer on the platform got HTTP 429, because the limiter keyed its buckets on the load
balancer's IP. Behind a proxy every tenant, key and console visitor shared that one bucket.

The `noisy_neighbour` phase recreates that shape from a single machine (one source IP,
exactly like traffic behind a load balancer) and requires:

- `victim_throttled == 0`: the other tenant never sees a 429,
- `public_probe_throttled == 0`: the anonymous console route never sees a 429,
- `noisy_throttled > 0`: the flooding tenant **is** throttled, so the gate cannot pass
  just because throttling was off,
- `noisy_429_missing_retry_after == 0`: every 429 carries `Retry-After`,
- `victim_requests > 0`, `public_probe_requests > 0`: the bystanders really sent traffic.

With the old IP-keyed limiter the victim and the probe share the noisy bucket and the gate
fails. `X-RateLimit-*` on 429s is reported but only warns.

### Other thresholds

| Metric | Default | Override |
|---|---|---|
| `http_req_failed` (expected noisy 429s excluded) | `rate<0.01` | `MAX_ERROR_RATE` |
| `http_req_duration{role:load,op:list\|get}` p95 | `< 800 ms` | `READ_P95_MS` (`READ_P99_MS` adds a p99 gate) |
| `http_req_duration{role:load,op:create\|update}` p95 | `< 1500 ms` | `WRITE_P95_MS` (`WRITE_P99_MS` adds a p99 gate) |

In CI the budgets can be tuned without a code change through the repository variables
`K6_READ_P95_MS`, `K6_WRITE_P95_MS` and `K6_MAX_ERROR_RATE`. CI numbers come from a shared
GitHub runner that also hosts the whole stack; compare them release to release, not with
production.

k6 exits `99` when any threshold fails. The workflow publishes the report first and then
fails the job.

## Running locally

1. Mint the three keys (idempotent: reruns print the same keys):

   ```bash
   docker compose exec -T application php artisan tinker \
     --execute="eval(base64_decode('$(base64 < scripts/ci/mint-k6-keys.php | tr -d '\n')'));" \
     | grep '^K6_' > /tmp/k6-keys.env
   set -a; . /tmp/k6-keys.env; set +a
   ```

   This creates the organizations `CI k6 Load Org`, `CI k6 Noisy Org` and `CI k6 Victim Org`,
   each with an owner and a live key, and also prints `K6_THROTTLE_ENABLED` and
   `K6_RATE_LIMIT` (the limit the noisy tenant will get).

2. Make the stack match what the phases need:

   - `throughput` needs the LOAD key unthrottled. Add it to `THROTTLE_UNLIMITED_API_KEYS`
     in `api/.env`, then reload (`php artisan config:cache` first if the config is
     cached). `setup()` aborts with an explanation if the key still gets
     `X-RateLimit-Limit`. `api/.env` is a single-file bind mount, so edit it in place;
     `sed -i` swaps the inode and the container keeps reading the old file.
   - `noisy_neighbour` needs throttling on (`THROTTLE_ENABLED=true`, or the
     administrator's rate-limit setting). With throttling off the gate fails on
     `noisy_throttled`.

3. Run it:

   ```bash
   k6 run -e BASE_URL=http://localhost:8000 \
     -e K6_LOAD_KEY=$K6_LOAD_KEY -e K6_NOISY_KEY=$K6_NOISY_KEY -e K6_VICTIM_KEY=$K6_VICTIM_KEY \
     tests/k6/api-release.js
   ```

   The dev stack's amd64 image runs under Rosetta on Apple silicon and is far slower than
   CI. Scale down (`-e THROUGHPUT_PEAK_RATE=3 -e THROUGHPUT_DURATION=60s`) or run one
   phase (`-e SCENARIOS=noisy_neighbour`).

   Without a local k6: `docker run --rm -i -v "$PWD:/work" -w /work grafana/k6 run -e
   BASE_URL=http://host.docker.internal:8000 ... tests/k6/api-release.js`.

The report is written to `K6_REPORT_DIR` (default: the current directory). k6 does not
create directories, so `mkdir -p` a custom one first:

- `summary.json`: raw k6 summary data
- `report.md`: release, commit, run config, a per-endpoint table (count, rps, p50/p95/p99,
  max, error %), the isolation result and every threshold
- `report.html`: the same as a self-contained page

The Markdown report is also printed to stdout.

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `BASE_URL` | `http://localhost:8000` | API origin |
| `K6_LOAD_KEY` / `K6_NOISY_KEY` / `K6_VICTIM_KEY` | — | Keys from `mint-k6-keys.php`. NOISY and VICTIM must be different |
| `SCENARIOS` | `throughput,noisy_neighbour` | Phases to run |
| `THROUGHPUT_PEAK_RATE` | `50` | Peak arrival rate (req/s). Ramp: 15% of the time to 20% of peak, 25% to peak, 50% at peak, 10% down |
| `THROUGHPUT_DURATION` | `3m30s` | Length of the throughput phase |
| `THROUGHPUT_VUS` / `THROUGHPUT_MAX_VUS` | `50` / `300` | Pre-allocated and maximum VUs |
| `THROUGHPUT_MIX` | `create:20,update:20,list:30,get:30` | Operation weights |
| `SEED_ORDERS` | `10` | Orders `setup()` creates for the LOAD key so update/get have targets from the start |
| `NOISY_RATE` | `10` | Flood rate (req/s); 600/min against the default 120/min limit |
| `NOISY_DURATION` | `90s` | Length of the flood |
| `NOISY_WARMUP` | `15s` | Delay before the victim and the probe start |
| `VICTIM_RATE` | `1` | Victim rate (req/s), rotating list, get, create, update and `GET /v1/places` |
| `PUBLIC_PROBE_PATH` / `PUBLIC_PROBE_EVERY` | `/int/v1/settings/branding` / `2s` | Anonymous console route and its interval |
| `PHASE_GAP` | `10s` | Pause between the phases |
| `REQUEST_TIMEOUT` | `30s` | Per-request timeout |
| `SETUP_TIMEOUT` | `120s` | Limit for `setup()` (health check, key probes, seed orders) |
| `READ_P95_MS` / `WRITE_P95_MS` | `800` / `1500` | p95 budgets for the LOAD key |
| `READ_P99_MS` / `WRITE_P99_MS` | `0` (off) | Optional p99 budgets |
| `MAX_ERROR_RATE` | `0.01` | `http_req_failed` budget |
| `RELEASE_VERSION` / `GIT_SHA` / `GIT_REF` / `RUN_URL` | `local` / — | Report metadata |
| `K6_RATE_LIMIT` | — | Per-key limit shown in the report when the NOISY key's `X-RateLimit-Limit` could not be read |
| `K6_REPORT_DIR` | `.` | Output directory for the report files |

## Tags

Every request is tagged `role` (`load`, `noisy`, `victim`, `public`), `op` (`create`,
`update`, `list`, `get`, `places`, `public`) and `endpoint` (for example
`PUT /v1/orders/:id`), and `name` groups URLs so order ids don't produce one series per
order. Endpoint values contain no braces or commas because k6's submetric syntax reserves
them.
