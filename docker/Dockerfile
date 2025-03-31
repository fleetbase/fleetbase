# syntax = docker/dockerfile:1.2
# Base stage
FROM dunglas/frankenphp:1.5.0-php8.2-bookworm as base

# Install packages
RUN apt-get update && apt-get install -y git bind9-utils mycli nodejs npm nano \
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
  # geos \
  sockets \
  pcntl \
  @composer

# Install build dependencies for GEOS
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       pkg-config \
       libgeos-dev \
       libgeos++-dev \
       autoconf \
       build-essential \
       unzip \
    && rm -rf /var/lib/apt/lists/*

# Download, extract, compile, and enable the php-geos extension
RUN curl -fsSL -o php-geos.zip \
      https://github.com/libgeos/php-geos/archive/dfe1ab17b0f155cc315bc13c75689371676e02e1.zip \
    && unzip php-geos.zip \
    && rm php-geos.zip \
    && cd php-geos-* \
    && ./autogen.sh \
    && ./configure \
    && make -j"$(nproc)" install \
    && docker-php-ext-enable geos \
    && cd .. \
    && rm -rf php-geos-*

# Update PHP configurations
RUN sed -e 's/^expose_php.*/expose_php = Off/' "$PHP_INI_DIR/php.ini-production" > "$PHP_INI_DIR/php.ini" \
  && sed -i -e 's/^upload_max_filesize.*/upload_max_filesize = 600M/' -e 's/^post_max_size.*/post_max_size = 0/' \
  -e 's/^memory_limit.*/memory_limit = 600M/' "$PHP_INI_DIR/php.ini"

# Install global node modules
RUN npm install -g chokidar pnpm ember-cli npm-cli-login

# Install ssm-parent
COPY --from=ghcr.io/springload/ssm-parent:1.8 /usr/bin/ssm-parent /sbin/ssm-parent

# Create the pnpm directory and set the PNPM_HOME environment variable
RUN mkdir -p ~/.pnpm
ENV PNPM_HOME /root/.pnpm

# Add the pnpm global bin to the PATH
ENV PATH /root/.pnpm/bin:$PATH

# Set some build ENV variables
ENV LOG_CHANNEL=stdout
ENV CACHE_DRIVER=null
ENV BROADCAST_DRIVER=socketcluster
ENV QUEUE_CONNECTION=redis
ENV CADDYFILE_PATH=/fleetbase/Caddyfile
ENV CONSOLE_PATH=/fleetbase/console
ENV OCTANE_SERVER=frankenphp

# Set environment
ARG ENVIRONMENT=production
ENV APP_ENV=$ENVIRONMENT

# Setup github auth
ARG GITHUB_AUTH_KEY

# Copy Caddyfile
COPY --chown=www-data:www-data ./Caddyfile $CADDYFILE_PATH

# Create /fleetbase directory and set correct permissions
RUN mkdir -p /fleetbase/api && mkdir -p /fleetbase/console && chown -R www-data:www-data /fleetbase

# Set working directory
WORKDIR /fleetbase/api

# If GITHUB_AUTH_KEY is provided, create auth.json with it
RUN if [ -n "$GITHUB_AUTH_KEY" ]; then echo "{\"github-oauth\": {\"github.com\": \"$GITHUB_AUTH_KEY\"}}" > auth.json; fi

# Prepare composer cache directory
RUN mkdir -p /var/www/.cache/composer && chown -R www-data:www-data /var/www/.cache/composer

# Optimize Composer Dependency Installation
COPY --chown=www-data:www-data ./api/composer.json ./api/composer.lock /fleetbase/api/

# Pre-install Composer dependencies
RUN su www-data -s /bin/sh -c "composer install --no-scripts --optimize-autoloader --no-dev --no-cache"

# Setup application
COPY --chown=www-data:www-data ./api /fleetbase/api

# Dump autoload
RUN su www-data -s /bin/sh -c "composer dumpautoload"

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
RUN curl -L https://github.com/webdevops/go-crond/releases/download/23.12.0/go-crond.linux.amd64 > /usr/local/bin/go-crond && chmod +x /usr/local/bin/go-crond
COPY docker/crontab ./crontab
RUN chmod 0600 ./crontab

# Scheduler dev stage
FROM scheduler-base as scheduler-dev
ENTRYPOINT []
CMD ["go-crond", "--verbose", "root:./crontab"]

# Scheduler stage
FROM scheduler-base as scheduler
ENTRYPOINT ["/sbin/ssm-parent", "-c", ".ssm-parent.yaml", "run", "--"]
CMD ["go-crond", "--verbose", "root:./crontab"]

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
CMD ["sh", "-c", "php artisan octane:frankenphp --max-requests=250 --port=8000 --host=0.0.0.0 --watch"] 

# Application stage
FROM base as app
ENTRYPOINT ["/sbin/ssm-parent", "-c", ".ssm-parent.yaml", "run", "--", "docker-php-entrypoint"]
CMD ["sh", "-c", "php artisan octane:frankenphp --max-requests=250 --port=8000 --host=0.0.0.0"]
