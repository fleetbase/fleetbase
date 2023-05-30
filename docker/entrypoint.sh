#!/bin/sh
set -e

# Call the original entrypoint
exec docker-php-entrypoint "$@"
