FROM fleetbase/fleetbase-api:latest

USER root

# Instalar dependencias de PostgreSQL para Debian/Ubuntu
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar extensión pdo_pgsql
RUN docker-php-ext-install pdo_pgsql pgsql

USER www-data

WORKDIR /fleetbase/api

