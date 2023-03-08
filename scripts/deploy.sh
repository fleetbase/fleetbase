#!/bin/bash

set -ev

php /var/www/html/api/artisan mysql:createdb
php /var/www/html/api/artisan migrate --force
php /var/www/html/api/artisan migrate:sandbox --force
php /var/www/html/api/artisan init:key-column
php /var/www/html/api/artisan fix:data
php /var/www/html/api/artisan db:seed --force
php /var/www/html/api/artisan queue:restart