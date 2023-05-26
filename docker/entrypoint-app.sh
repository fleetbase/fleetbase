#!/bin/sh
set -e

# Run migrations
php artisan mysql:createdb
php artisan migrate
php artisan sandbox:migrate
php artisan fleetbase:seed

# Call the original entrypoint
exec /sbin/ssm-parent -c .ssm-parent.yaml run -- docker-php-entrypoint "$@"