#!/usr/bin/env bash
# Proves a running production stack works, beyond its web pages answering: a real job through
# the queue, the scheduler reaching the database, a socket connection, and the maintenance page
# opening and closing. Exits non-zero on the first failure.
#
#   ./verify.sh /opt/fleetbase
set -uo pipefail

HOME_DIR="${1:?Usage: verify.sh <server folder>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$HOME_DIR/config/stack.env"
# shellcheck disable=SC1090
source "$ENV_FILE"

compose() { docker compose -f "$HERE/compose.yml" --env-file "$ENV_FILE" "$@"; }
pass() { echo "ok    $1"; }
fail() { echo "FAIL  $1" >&2; compose ps >&2; exit 1; }

# Reaches the proxy on this machine whatever DNS says, as a browser on the internet would.
# -k because a test run uses Caddy's internal CA.
request() {
  local host="$1" path="$2"; shift 2
  curl -ksS --max-time 20 --resolve "$host:$HTTPS_PORT:127.0.0.1" "$@" "https://$host:$HTTPS_PORT$path"
}

status_of() { request "$1" "$2" -o /dev/null -w '%{http_code}' "${@:3}"; }

retry() {
  local tries="$1" what="$2"; shift 2
  for _ in $(seq 1 "$tries"); do "$@" && return 0; sleep 5; done
  fail "$what"
}

api_healthy() { request "$API_DOMAIN" /health | grep -q '"status"'; }
retry 36 "API /health through the proxy" api_healthy
pass "API answers /health through the proxy, over HTTPS"

version="$(request "$API_DOMAIN" /)"
echo "$version" | grep -q '"version"' || fail "GET / reports a version (got: $version)"
pass "API reports its version"

page="$(request "$CONSOLE_DOMAIN" /)"
echo "$page" | grep -qi '<html' || fail "Console serves its page"
pass "Console serves its page"

config="$(request "$CONSOLE_DOMAIN" /fleetbase.config.json)"
echo "$config" | grep -q "$API_DOMAIN" || fail "Console config points at the API (got: $config)"
pass "Console config points at the API"

migrations="$(compose exec -T application php artisan migrate:status 2>&1)"
echo "$migrations" | grep -qi 'pending' && fail "No pending migrations"
echo "$migrations" | grep -iE 'ran|yes' >/dev/null || fail "Migrations have run (got: $migrations)"
pass "Migrations have run, none pending"

marker="stack-verify-$(date +%s)"
# Sets a cache key, then queues a command that removes it. The key going away means a worker took
# the job. It has to be a real job class: a closure from tinker can't be serialized.
compose exec -T application php artisan tinker --execute="cache()->put('$marker', 'waiting', 600); Illuminate\Support\Facades\Artisan::queue('cache:forget', ['key' => '$marker']); echo 'queued:'.cache()->get('$marker');" 2>/dev/null | grep -q 'queued:waiting' \
  || fail "Dispatching a job"
job_ran() { compose exec -T application php artisan tinker --execute="echo 'value:'.cache()->get('$marker').':end';" 2>/dev/null | grep -q 'value::end'; }
retry 12 "A job runs through the queue worker" job_ran
pass "A job ran through the queue worker"

compose exec -T scheduler php artisan migrate:status >/dev/null 2>&1 || fail "Scheduler reaches the database"
pass "Scheduler reaches the database"
# Not grep -q: it stops at the first match, and pipefail then counts the closed pipe as a failure.
scheduler_ran() { compose logs --no-log-prefix scheduler 2>/dev/null | grep -E 'No scheduled commands|Running \[' >/dev/null; }
retry 18 "Scheduler runs its schedule" scheduler_ran
pass "Scheduler runs its schedule"

upgrade_status="$(status_of "$API_DOMAIN" '/socketcluster/' --http1.1 -m 5 \
  -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H "Origin: https://$CONSOLE_DOMAIN:$HTTPS_PORT")"
[[ "$upgrade_status" == "101" ]] || fail "Socket accepts a connection through the proxy (got: $upgrade_status)"
pass "Socket accepts a connection through the proxy"

touch "$HOME_DIR/run/maintenance"
console_status="$(status_of "$CONSOLE_DOMAIN" /)"
api_status="$(status_of "$API_DOMAIN" /health)"
maintenance_page="$(request "$CONSOLE_DOMAIN" /)"
rm -f "$HOME_DIR/run/maintenance"
[[ "$console_status" == "503" ]] || fail "Maintenance closes the console (got: $console_status)"
[[ "$api_status" == "503" ]] || fail "Maintenance closes the API (got: $api_status)"
echo "$maintenance_page" | grep -q 'closed for maintenance' || fail "Maintenance page shows"
[[ "$(status_of "$API_DOMAIN" /health)" == "200" ]] || fail "Site reopens after maintenance"
pass "Maintenance page opens and closes"

# Only the proxy may publish anything. A published port shows as host->container in .Ports.
published="$(compose ps --format '{{.Service}} {{.Ports}}' | grep -e '->' | grep -v '^proxy ' || true)"
[[ -z "$published" ]] || fail "Only the proxy publishes ports (got: $published)"
pass "Only the proxy publishes ports"

echo "All checks passed."
