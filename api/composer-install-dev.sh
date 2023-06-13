#!/bin/bash
mv composer.json composer.prod.json && mv composer.dev.json composer.json && composer install && mv composer.json composer.dev.json && mv composer.prod.json composer.json