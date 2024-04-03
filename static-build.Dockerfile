FROM --platform=linux/amd64 dunglas/frankenphp:static-builder

# # Install packages
# RUN apt-get update && apt-get install -y git bind9-utils mycli nodejs npm \
#   && mkdir -p /root/.ssh \
#   && ssh-keyscan github.com >> /root/.ssh/known_hosts

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
COPY ./Caddyfile $CADDYFILE_PATH

# Create /fleetbase directory and set correct permissions
RUN mkdir -p /fleetbase && mkdir -p /fleetbase/api && mkdir -p /fleetbase/console

# Set working directory
WORKDIR /fleetbase/api

# Setup api
COPY  ./api /fleetbase/api

# Setup console
COPY  ./console /fleetbase/console

# Set permissions for deploy script
RUN chmod +x /fleetbase/api/deploy.sh

# Pre-install Composer dependencies
# RUN /bin/sh -c "composer install --no-scripts --optimize-autoloader --no-dev"

# Dump autoload
# RUN /bin/sh -c "composer dumpautoload"

# Build binary
RUN EMBED=/ \
    PHP_EXTENSIONS=pdo_mysql,gd,bcmath,redis,intl,zip,gmp,apcu,opcache,memcached,imagick,geos,sockets,pcntl \
    ./build-static.sh