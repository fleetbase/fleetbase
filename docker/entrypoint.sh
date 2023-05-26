#!/bin/sh
set -e

# Run migrations
php artisan mysql:createdb
php artisan migrate
php artisan sandbox:migrate
php artisan fleetbase:seed

# Call the original entrypoint
exec docker-php-entrypoint "$@"
