#!/bin/sh
set -e

# Call the original entrypoint
exec /sbin/ssm-parent -c .ssm-parent.yaml run -- docker-php-entrypoint "$@"