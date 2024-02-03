# syntax = docker/dockerfile:1.2
# Base stage
FROM dunglas/frankenphp:sha-7454826-php8.2-alpine as base

# Install packages
RUN apk update && apk add git openssh bind-tools mycli nodejs npm \
    && mkdir -p /root/.ssh \
    && ssh-keyscan github.com >> /root/.ssh/known_hosts

# Install PHP Extensions
RUN install-php-extensions \
    pdo_mysql \
    gd \
    bcmath \
    redis \
    intl \
    zip \
    gmp \
    apcu \
    opcache \
    memcached \
    imagick \
    geos \
    sockets \
    pcntl \
    @composer

# Update PHP configurations
RUN sed -e 's/^expose_php.*/expose_php = Off/' "$PHP_INI_DIR/php.ini-production" > "$PHP_INI_DIR/php.ini" \
    && sed -i -e 's/^upload_max_filesize.*/upload_max_filesize = 600M/' -e 's/^post_max_size.*/post_max_size = 0/' \
    -e 's/^memory_limit.*/memory_limit = 600M/' "$PHP_INI_DIR/php.ini"

# Install global node modules
RUN npm install -g chokidar

# Install ssm-parent
COPY --from=ghcr.io/springload/ssm-parent:1.8 /usr/bin/ssm-parent /sbin/ssm-parent

# Set some build ENV variables
ENV LOG_CHANNEL=stdout
ENV CACHE_DRIVER=null
ENV BROADCAST_DRIVER=socketcluster
ENV QUEUE_CONNECTION=redis
ENV CADDYFILE_PATH=/fleetbase/Caddyfile
ENV OCTANE_SERVER=frankenphp

# Set environment
ARG ENVIRONMENT=production
ENV APP_ENV=$ENVIRONMENT

# Copy Caddyfile
COPY --chown=www-data:www-data ./Caddyfile $CADDYFILE_PATH

# Create /fleetbase directory and set correct permissions
RUN mkdir -p /fleetbase/api && chown -R www-data:www-data /fleetbase

# Set working directory
WORKDIR /fleetbase/api

# Load the secret into the auth.json file if exists, and install dependencies
COPY composer-auth.jso[n] /fleetbase/api/auth.json
RUN --mount=type=secret,id=composer_auth,target=/fleetbase/api/auth.json

# Optimize Composer Dependency Installation
COPY --chown=www-data:www-data ./api/composer.json ./api/composer.lock /fleetbase/api/

# Pre-install Composer dependencies
RUN su www-data -s /bin/sh -c "composer install --no-scripts --no-autoloader --optimize-autoloader --no-dev"

# Setup application
COPY --chown=www-data:www-data ./api /fleetbase/api

# Setup composer root directory
RUN mkdir -p /root/.composer
RUN mkdir -p /fleetbase/api/.composer && chown www-data:www-data /fleetbase/api/.composer

# Setup logging
RUN mkdir -p /fleetbase/api/storage/logs/ && touch /fleetbase/api/storage/logs/laravel-$(date +'%Y-%m-%d').log
RUN chown -R www-data:www-data /fleetbase/api/storage
RUN chmod -R 755 /fleetbase/api/storage

# Set permissions for deploy script
RUN chmod +x /fleetbase/api/deploy.sh

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

# Events stage
FROM base as events
ENTRYPOINT ["/sbin/ssm-parent", "-c", ".ssm-parent.yaml", "run", "--", "docker-php-entrypoint"]
CMD ["php", "artisan", "queue:work"]

# Events stage
FROM base as events-dev
ENTRYPOINT []
CMD ["php", "artisan", "queue:work"]

# Application dev stage
FROM base as app-dev
ENTRYPOINT ["docker-php-entrypoint"]
# add --watch flag later
CMD ["sh", "-c", "php artisan octane:frankenphp --port=8000 --host=0.0.0.0 --caddyfile $CADDYFILE_PATH"] 

# Application stage
FROM base as app
ENTRYPOINT ["/sbin/ssm-parent", "-c", ".ssm-parent.yaml", "run", "--", "docker-php-entrypoint"]
CMD ["sh", "-c", "php artisan octane:frankenphp --port=8000 --host=0.0.0.0 --https --http-redirect --caddyfile $CADDYFILE_PATH"]
