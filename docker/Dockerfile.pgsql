# ============================================================================
# Base stage - Common setup for all environments
# ============================================================================
FROM fleetbase/fleetbase-api:latest AS base

USER root

# Instalar dependencias de PostgreSQL para Debian/Ubuntu
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar extensión pdo_pgsql
RUN docker-php-ext-install pdo_pgsql pgsql

USER www-data

WORKDIR /fleetbase/api

# ============================================================================
# Production stage - Lightweight, production-ready image
# ============================================================================
FROM base AS production

# Copy custom seeders only
COPY --chown=www-data:www-data ./api/database/seeders /fleetbase/api/database/seeders

# Regenerate Composer autoload to include new seeders
RUN composer dumpautoload

# ============================================================================
# Development stage - Includes testing dependencies and tools
# ============================================================================
FROM base AS development

# Copy custom seeders and test suites
COPY --chown=www-data:www-data ./api/database/seeders /fleetbase/api/database/seeders
COPY --chown=www-data:www-data ./api/tests /fleetbase/api/tests

# Install dev dependencies (including PHPUnit) for testing
RUN composer install --optimize-autoloader --no-cache

# Regenerate Composer autoload to include new seeders and tests
RUN composer dumpautoload

