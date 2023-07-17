#!/bin/bash

if [ -f composer.lock ]; then
    rm composer.lock
fi

mv composer.json composer.prod.json && cp composer.dev.json composer.json && composer install && mv composer.prod.json composer.json