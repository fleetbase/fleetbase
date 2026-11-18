#!/usr/bin/env bash
# Checks the databases after `migrate` and `sandbox:migrate` rather than trusting their exit codes.
# sandbox:migrate calls migrate once per path, so a path it never reached looks the same as success.
# Run from api/ with the DB_* environment the app uses.
set -euo pipefail

main="$DB_DATABASE"
sandbox="${DB_DATABASE}_sandbox"
sql() {
  MYSQL_PWD="${DB_PASSWORD:-}" mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -N -B -e "$1"
}
fail() {
  echo "::error::$1"
  exit 1
}

php artisan migrate:status --no-ansi | tee /tmp/migrate-status.txt | tail -n 5
if grep -q 'Pending' /tmp/migrate-status.txt; then
  grep 'Pending' /tmp/migrate-status.txt
  fail "Pending migrations remain on $main"
fi

main_count="$(sql "SELECT COUNT(*) FROM \`$main\`.migrations")"
sandbox_count="$(sql "SELECT COUNT(*) FROM \`$sandbox\`.migrations")"
echo "$main: $main_count migrations, $sandbox: $sandbox_count migrations"
[ "$main_count" -gt 0 ] || fail "$main has no migrations recorded"
[ "$sandbox_count" -gt 0 ] || fail "$sandbox has no migrations recorded"

# Extensions can opt out of the sandbox, so sandbox is a subset of main. Never the other way round.
extra="$(sql "SELECT COUNT(*) FROM \`$sandbox\`.migrations WHERE migration NOT IN (SELECT migration FROM \`$main\`.migrations)")"
[ "$extra" -eq 0 ] || fail "$sandbox has $extra migrations $main does not"

# Core and fleet-ops both run in the sandbox, and fleet-ops is where the spatial columns live.
for schema in "$main" "$sandbox"; do
  spatial="$(sql "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = '$schema' AND data_type IN ('point', 'geometry', 'linestring', 'polygon', 'multipolygon')")"
  echo "$schema: $spatial spatial columns"
  [ "$spatial" -gt 0 ] || fail "$schema has no spatial columns, so the spatial connection was not exercised"
done
