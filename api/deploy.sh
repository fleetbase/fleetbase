#!/bin/sh

# Exit the script as soon as a command fails
set -e

# Create mysql databases if none exists
php artisan mysql:createdb

# Run migrations
php artisan migrate --force

# Run migrations for sandbox too
php artisan sandbox:migrate --force

# Seed database
php artisan fleetbase:seed

# Create permissions, policies, and roles
php artisan fleetbase:create-permissions

# Restart queue
php artisan queue:restart

# Sync scheduler
php artisan schedule-monitor:sync

# Clear cache
php artisan cache:clear
php artisan route:clear

# Optimize
php artisan config:cache
php artisan route:cache

# Initialize registry. An unreachable registry must not stop an install or an upgrade on a
# private network.
php artisan registry:init || echo "Registry not initialized, continuing."

# Notify open install pages that setup has completed
php artisan fleetbase:notify-installed || true

# Restart octane
# php artisan octane:reload
