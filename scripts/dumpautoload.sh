#!/bin/bash
composer dump-autoload --working-dir /var/www/html/api
composer dump-autoload --working-dir /var/www/html/packages/core-api
composer dump-autoload --working-dir /var/www/html/packages/fleetops-api
composer dump-autoload --working-dir /var/www/html/packages/storefront-api
