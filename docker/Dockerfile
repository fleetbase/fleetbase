FROM php:7.4-fpm-bullseye as base

# download and install geos php bindings
# need to run docker-php-ext-configure to create /usr/src/php/ext dir
RUN mkdir -p /usr/src/php/ext && curl -L https://git.osgeo.org/gitea/geos/php-geos/archive/1.0.0.tar.gz > /tmp/php-geos.tar.gz && tar -C /usr/src/php/ext -xzvf /tmp/php-geos.tar.gz

RUN apt-get update && apt-get install -y git unzip libzip-dev \
    libgd-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    imagemagick libmagickwand-dev --no-install-recommends \
    libmemcached-dev \
    libgeos-dev \
    libgmp-dev \
    default-mysql-client \
    libicu-dev \
    tmux \
    && pecl install imagick \
    && docker-php-ext-enable imagick \
    && docker-php-ext-configure gd --with-external-gd && docker-php-ext-configure php-geos \
    && docker-php-ext-install -j$(nproc) gmp php-geos gd zip pdo_mysql sockets intl bcmath && pecl install redis-4.3.0 memcached-3.1.3 && docker-php-ext-enable redis memcached opcache bcmath

RUN sed -e 's/^expose_php.*/expose_php = Off/' "$PHP_INI_DIR/php.ini-production" > "$PHP_INI_DIR/php.ini"
RUN sed -i -e 's/^upload_max_filesize.*/upload_max_filesize = 600M/' -e 's/^post_max_size.*/post_max_size = 0/' -e 's/^memory_limit.*/memory_limit = 600M/' "$PHP_INI_DIR/php.ini"

RUN curl -L https://github.com/springload/ssm-parent/releases/download/v1.4.3/ssm-parent_1.4.3_linux_amd64.tar.gz > /tmp/ssm-parent.tar.gz && tar -C /sbin -xvf /tmp/ssm-parent.tar.gz ssm-parent && rm /tmp/ssm-parent.tar.gz

WORKDIR /var/www
COPY docker/composer-install.sh ./
RUN chmod +x ./composer-install.sh && ./composer-install.sh
COPY packages /var/www/html/packages
WORKDIR /var/www/html/api
RUN chown www-data:www-data /var/www/html
RUN chown www-data:www-data /var/www/html/api
USER www-data
RUN mkdir -p ./storage/logs/ && ln -sf /dev/stdout ./storage/logs/laravel.log
# copy these first to not reinstall everything on a random file change
COPY api/composer.json api/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader
COPY --chown=www-data:nogroup . ./
# RUN composer dumpautoload

USER root

ARG ENVIRONMENT=production
ENV APP_ENV=$ENVIRONMENT

#### Scheduler stages
FROM base as scheduler-base
RUN curl -L https://github.com/webdevops/go-crond/releases/download/0.6.1/go-crond-64-linux-dynamic > /usr/local/bin/go-crond && chmod +x /usr/local/bin/go-crond
COPY docker/crontab ./crontab
RUN chmod 0600 ./crontab

FROM scheduler-base as scheduler-dev
ENTRYPOINT []
CMD ["go-crond", "--verbose", "--no-auto", "root:./crontab"]

FROM scheduler-base as scheduler
ENTRYPOINT ["/sbin/ssm-parent", "-c", ".ssm-parent.yaml", "run", "--"]
CMD ["go-crond", "--verbose", "--no-auto", "root:./crontab"]

#### Application stages
FROM base as app-dev
ENTRYPOINT ["docker-php-entrypoint"] # the default
CMD ["php-fpm"]

FROM base as events
ENTRYPOINT ["/sbin/ssm-parent", "-c", ".ssm-parent.yaml", "run", "--", "docker-php-entrypoint"]
CMD ["php", "api/artisan", "queue:work", "events"]

FROM base as jobs
ENTRYPOINT ["/sbin/ssm-parent", "-c", ".ssm-parent.yaml", "run", "--", "docker-php-entrypoint"]
CMD ["php", "api/artisan", "queue:work", "sqs"]

FROM base as app
ENTRYPOINT ["/sbin/ssm-parent", "-c", ".ssm-parent.yaml", "run", "--", "docker-php-entrypoint"]
CMD ["php-fpm"]
