#!/bin/bash

set -ev

php /var/www/html/api/artisan mysql:createdb
php /var/www/html/api/artisan migrate --force
php /var/www/html/api/artisan sandbox:migrate --force
php /var/www/html/api/artisan sandbox:init-key
php /var/www/html/api/artisan db:seed --force
php /var/www/html/api/artisan queue:restart