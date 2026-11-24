#!/usr/bin/env bash
# Checks that every foreign key points at a unique or primary key, after `migrate` and `sandbox:migrate`.
#
# MySQL 8.4 turns on `restrict_fk_on_non_standard_key` by default. With it on, MySQL refuses any ALTER
# of a table that a foreign key points at through a non-unique key ("1553 Cannot drop index
# '<unknown key name>'"). core-api turns the setting off while migrations run, but nothing else does,
# so this runs as a plain mysql client with the server's default and no Laravel in between.
# Run from api/ with the DB_* environment the app uses.
set -euo pipefail

main="$DB_DATABASE"
schemas="'$main','${main}_sandbox','${main}_storefront'"
sql() {
  MYSQL_PWD="${DB_PASSWORD:-}" mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -N -B -e "$1"
}

failed=0
fail() {
  echo "::error::$1"
  failed=1
}

setting="$(sql "SELECT @@global.restrict_fk_on_non_standard_key" 2>/dev/null || echo 'absent')"
echo "MySQL $(sql 'SELECT VERSION()'), restrict_fk_on_non_standard_key: $setting"

# 1. Every column a foreign key points at has a unique or primary key of its own.
nonstandard="$(sql "
  SELECT DISTINCT CONCAT(k.REFERENCED_TABLE_SCHEMA, '.', k.REFERENCED_TABLE_NAME, '.', k.REFERENCED_COLUMN_NAME)
  FROM information_schema.KEY_COLUMN_USAGE k
  WHERE k.REFERENCED_TABLE_NAME IS NOT NULL
    AND k.REFERENCED_TABLE_SCHEMA IN ($schemas)
    AND EXISTS (SELECT 1 FROM information_schema.TABLES t
                WHERE t.TABLE_SCHEMA = k.REFERENCED_TABLE_SCHEMA AND t.TABLE_NAME = k.REFERENCED_TABLE_NAME)
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.STATISTICS s
      WHERE s.TABLE_SCHEMA = k.REFERENCED_TABLE_SCHEMA AND s.TABLE_NAME = k.REFERENCED_TABLE_NAME
        AND s.NON_UNIQUE = 0 AND s.COLUMN_NAME = k.REFERENCED_COLUMN_NAME AND s.SEQ_IN_INDEX = 1
        AND (SELECT COUNT(*) FROM information_schema.STATISTICS s2
             WHERE s2.TABLE_SCHEMA = s.TABLE_SCHEMA AND s2.TABLE_NAME = s.TABLE_NAME AND s2.INDEX_NAME = s.INDEX_NAME) = 1)
  ORDER BY 1")"
if [ -n "$nonstandard" ]; then
  echo "$nonstandard"
  fail "Foreign keys point at columns with no unique key. Give each new table's uuid ->unique(), or add a migration that makes these unique."
else
  echo "Every foreign key points at a unique or primary key."
fi

# 2. No foreign key points at a table that doesn't exist, as sandbox's access_token_id keys used to.
dangling="$(sql "
  SELECT CONCAT(c.CONSTRAINT_SCHEMA, '.', c.TABLE_NAME, ' ', c.CONSTRAINT_NAME, ' -> ', c.UNIQUE_CONSTRAINT_SCHEMA, '.', c.REFERENCED_TABLE_NAME)
  FROM information_schema.REFERENTIAL_CONSTRAINTS c
  WHERE c.CONSTRAINT_SCHEMA IN ($schemas)
    AND NOT EXISTS (SELECT 1 FROM information_schema.TABLES t
                    WHERE t.TABLE_SCHEMA = c.UNIQUE_CONSTRAINT_SCHEMA AND t.TABLE_NAME = c.REFERENCED_TABLE_NAME)
  ORDER BY 1")"
if [ -n "$dangling" ]; then
  echo "$dangling"
  fail "Foreign keys point at tables that don't exist."
fi

# 3. Every table a foreign key points at can be altered with the server's default setting.
parents="$(sql "
  SELECT DISTINCT CONCAT('\`', REFERENCED_TABLE_SCHEMA, '\`.\`', REFERENCED_TABLE_NAME, '\`')
  FROM information_schema.KEY_COLUMN_USAGE k
  WHERE REFERENCED_TABLE_NAME IS NOT NULL AND REFERENCED_TABLE_SCHEMA IN ($schemas)
    AND EXISTS (SELECT 1 FROM information_schema.TABLES t
                WHERE t.TABLE_SCHEMA = k.REFERENCED_TABLE_SCHEMA AND t.TABLE_NAME = k.REFERENCED_TABLE_NAME)
  ORDER BY 1")"
altered=0
for table in $parents; do
  if output="$(sql "ALTER TABLE $table ADD COLUMN ci_fk_probe INT NULL; ALTER TABLE $table DROP COLUMN ci_fk_probe;" 2>&1)"; then
    altered=$((altered + 1))
  else
    fail "ALTER TABLE $table failed: $output"
  fi
done
echo "Altered $altered tables that foreign keys point at."

exit "$failed"
