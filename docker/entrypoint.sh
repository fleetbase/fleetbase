#!/bin/sh
set -e

# Run migrations
php api/artisan mysql:createdb
php api/artisan migrate
php api/artisan sandbox:migrate

# Call the original entrypoint
exec docker-php-entrypoint "$@"
