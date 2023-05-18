#!/bin/sh
set -e

# Run migrations
php artisan mysql:createdb
php artisan migrate
php artisan sandbox:migrate

# Call the original entrypoint
exec /sbin/ssm-parent -c .ssm-parent.yaml run -- docker-php-entrypoint "$@"