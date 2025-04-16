FROM --platform=linux/amd64 dunglas/frankenphp:static-builder

WORKDIR /go/src/app

# Copy Fleetbase app
COPY ./api ./dist/app

# Install geos lib
RUN apk add --no-cache geos geos-dev

# Inject the libgeos library handlers
COPY ./docker/spc/libgeos-linux.php ./dist/static-php-cli/src/SPC/builder/linux/library/libgeos.php
COPY ./docker/spc/libgeos-unix.php ./dist/static-php-cli/src/SPC/builder/unix/library/libgeos.php

# Patch source.json to add geos extension source
RUN jq '. + {"php-geos": {"type": "url", "url": "https://github.com/libgeos/php-geos/archive/dfe1ab17b0f155cc315bc13c75689371676e02e1.zip", "license": [{"type": "file", "path": "php-geos-dfe1ab17b0f155cc315bc13c75689371676e02e1/MIT-LICENSE"}, {"type": "file", "path": "php-geos-dfe1ab17b0f155cc315bc13c75689371676e02e1/LGPL-2"}]}}' \
  ./dist/static-php-cli/config/source.json > ./dist/static-php-cli/config/source.tmp.json && \
  mv ./dist/static-php-cli/config/source.tmp.json ./dist/static-php-cli/config/source.json

# Pathc source.json to add libgeos library
RUN jq '. + {"libgeos": {"type": "url", "url": "https://download.osgeo.org/geos/geos-3.12.1.tar.bz2", "filename": "geos-3.12.1.tar.bz2", "extract": "geos-3.12.1", "build-dir": "build", "license": [{"type": "file", "path": "COPYING"}]}}' \
  ./dist/static-php-cli/config/source.json > ./dist/static-php-cli/config/source.tmp.json && \
  mv ./dist/static-php-cli/config/source.tmp.json ./dist/static-php-cli/config/source.json

# Patch ext.json to add geos extension dynamically
RUN jq '. + {"geos": {"type": "external", "arg-type": "enable", "source": "php-geos", "lib-depends": ["libgeos"]}}' \
  ./dist/static-php-cli/config/ext.json > ./dist/static-php-cli/config/ext.tmp.json && \
  mv ./dist/static-php-cli/config/ext.tmp.json ./dist/static-php-cli/config/ext.json

# Patch lib.json to add libgeos
RUN jq '. + {"libgeos": {"source": "libgeos", "static-libs-unix": ["libgeos.a", "libgeos_c.a"]}}' \
  ./dist/static-php-cli/config/lib.json > ./dist/static-php-cli/config/lib.tmp.json && \
  mv ./dist/static-php-cli/config/lib.tmp.json ./dist/static-php-cli/config/lib.json

# Install dependencies for SPC CLI
WORKDIR /go/src/app/dist/static-php-cli
RUN composer install --no-dev -a

# Set PHP extensions to be built (including geos!)
ENV PHP_EXTENSIONS="pdo_mysql,gd,bcmath,redis,intl,zip,gmp,apcu,opcache,imagick,sockets,pcntl,geos"
ENV PHP_EXTENSION_LIBS="libgeos,libzip,bzip2,libxml2,openssl,zlib"

# Force SPC to use the local source version (not download binary)
ENV SPC_REL_TYPE=source

# Move to the app directory
WORKDIR /go/src/app

# Do not run git pull
RUN sed -i 's/^[ \t]*git pull/# git pull/' ./build-static.sh

# Build the FrankenPHP static binary
RUN EMBED=dist/app ./build-static.sh