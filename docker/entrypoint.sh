#!/bin/sh
set -e

# Run migrations
php artisan mysql:createdb
php artisan migrate
php artisan sandbox:migrate

# Call the original entrypoint
exec docker-php-entrypoint "$@"
