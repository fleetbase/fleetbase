#!/bin/sh
set -e

# Run migrations
php api/artisan mysql:createdb
php api/artisan migrate
php api/artisan sandbox:migrate

# Call the original entrypoint
exec /sbin/ssm-parent -c .ssm-parent.yaml run -- docker-php-entrypoint "$@"