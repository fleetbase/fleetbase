# syntax = docker/dockerfile:1.2
# Base stage
FROM php:7.4-fpm-bullseye as base

# Download and install GEOS PHP bindings
RUN mkdir -p /usr/src/php/ext \
    && curl -L https://git.osgeo.org/gitea/geos/php-geos/archive/1.0.0.tar.gz > /tmp/php-geos.tar.gz \
    && tar -C /usr/src/php/ext -xzvf /tmp/php-geos.tar.gz

# Install required packages and PHP extensions
RUN apt-get update \
    && apt-get install -y nano git unzip libzip-dev libgd-dev libfreetype6-dev libjpeg62-turbo-dev libpng-dev \
    imagemagick libmagickwand-dev --no-install-recommends libmemcached-dev libgeos-dev libgmp-dev \
    default-mysql-client libicu-dev tmux nginx dnsutils mycli redis-tools \
    && pecl install imagick \
    && docker-php-ext-enable imagick \
    && docker-php-ext-configure gd --with-external-gd \
    && docker-php-ext-configure php-geos \
    && docker-php-ext-install -j$(nproc) gmp php-geos gd zip pdo_mysql sockets intl bcmath \
    && pecl install redis-4.3.0 memcached-3.1.3 \
    && docker-php-ext-enable redis memcached opcache bcmath

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Update PHP configurations
RUN sed -e 's/^expose_php.*/expose_php = Off/' "$PHP_INI_DIR/php.ini-production" > "$PHP_INI_DIR/php.ini" \
    && sed -i -e 's/^upload_max_filesize.*/upload_max_filesize = 600M/' -e 's/^post_max_size.*/post_max_size = 0/' \
    -e 's/^memory_limit.*/memory_limit = 600M/' "$PHP_INI_DIR/php.ini"

# Install ssm-parent
COPY --from=ghcr.io/springload/ssm-parent:1.8 /usr/bin/ssm-parent /sbin/ssm-parent

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set some build ENV variables
ENV LOG_CHANNEL=stdout
ENV CACHE_DRIVER=null

# For development only
WORKDIR /var/www/html
COPY --chown=www-data:nogroup ./packages ./packages

# Setup application
WORKDIR /var/www/html/api
COPY --chown=www-data:nogroup ./api ./
RUN chown -R www-data:www-data /var/www/html/api

# Setup composer root directory
RUN mkdir -p /root/.composer
RUN mkdir -p /var/www/.composer && chown www-data:www-data /var/www/.composer

# Setup logging
RUN mkdir -p ./storage/logs/ && touch ./storage/logs/laravel-$(date +'%Y-%m-%d').log
RUN chown -R www-data:www-data ./storage
RUN chmod -R 755 ./storage

# Load the secret into the auth.json file if exists, and install dependencies
COPY composer-auth.jso[n] /root/.composer/auth.json
RUN --mount=type=secret,id=composer_auth,target=/root/.composer/auth.json \
    if [ -f "/root/.composer/auth.json" ]; then \
        mkdir -p /var/www/.composer/ && \
        cp /root/.composer/auth.json /var/www/.composer/auth.json && \
        chown www-data:www-data /var/www/.composer/auth.json && \
        su www-data -s /bin/sh -c "composer install && composer dumpautoload"; \
    fi; \
    su www-data -s /bin/sh -c "composer install && composer dumpautoload"

# Continue
USER root
WORKDIR /

# Create unique instance ID
RUN echo $(cat /proc/sys/kernel/random/uuid) > /.fleetbase

# Set environment
ARG ENVIRONMENT=production
ENV APP_ENV=$ENVIRONMENT

# Set workdir to application
WORKDIR /var/www/html/api

# Scheduler base stage
FROM base as scheduler-base

# Install go-crond
RUN curl -L https://github.com/webdevops/go-crond/releases/download/0.6.1/go-crond-64-linux-dynamic > /usr/local/bin/go-crond && chmod +x /usr/local/bin/go-crond
COPY docker/crontab ./crontab
RUN chmod 0600 ./crontab

# Scheduler dev stage
FROM scheduler-base as scheduler-dev
ENTRYPOINT []
CMD ["go-crond", "--verbose", "--no-auto", "root:./crontab"]

# Scheduler stage
FROM scheduler-base as scheduler
ENTRYPOINT ["/sbin/ssm-parent", "-c", ".ssm-parent.yaml", "run", "--"]
CMD ["go-crond", "--verbose", "--no-auto", "root:./crontab"]

# Application dev stage
FROM base as app-dev
ENTRYPOINT ["docker-php-entrypoint"]
CMD ["php-fpm"]

# Events stage
FROM base as events
ENTRYPOINT ["/sbin/ssm-parent", "-c", ".ssm-parent.yaml", "run", "--", "docker-php-entrypoint"]
CMD ["php", "artisan", "queue:work", "sqs"]

# Application stage
FROM base as app
ENTRYPOINT ["/sbin/ssm-parent", "-c", ".ssm-parent.yaml", "run", "--", "docker-php-entrypoint"]
CMD ["php-fpm"]