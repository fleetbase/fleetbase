#!/bin/bash

set -e
set -o pipefail

log() {
    echo -e "\033[1;34m[🔧 $1]\033[0m"
}

log_success() {
    echo -e "\033[1;32m[✅ $1]\033[0m"
}

log_warn() {
    echo -e "\033[1;33m[⚠️  $1]\033[0m"
}

log_error() {
    echo -e "\033[1;31m[❌ $1]\033[0m"
}

# Define base paths
log "Resolving directories..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OSX_DIR="$ROOT_DIR/builds/osx"
DIST_DIR="$ROOT_DIR/builds/dist"
APP_DIR="$ROOT_DIR/api"
BREW_PREFIX="/opt/homebrew"
STATIC_PHP_CLI_VERSION="2.5.2"
TARGET_PHP_VERSION="8.2"
TOOLING_PHP_VERSION="8.4.0"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
BINARY_NAME="fleetbase-$OS-$ARCH"

log "Binary will be: $BINARY_NAME"

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        log_error "Required command not found: $1"
        exit 1
    fi
}

require_file() {
    if [ ! -f "$1" ]; then
        log_error "Required file missing: $1"
        exit 1
    fi
}

require_dir() {
    if [ ! -d "$1" ]; then
        log_error "Required directory missing: $1"
        exit 1
    fi
}

require_command php
require_command git
require_command jq
require_command curl
require_command brew

if [[ "$ARCH" != "arm64" ]]; then
    log_warn "This script is tuned for Apple Silicon builds; detected architecture: $ARCH"
fi

mkdir -p "$DIST_DIR"
if [[ ! -w "$DIST_DIR" ]]; then
    log_error "Dist directory is not writable: $DIST_DIR"
    exit 1
fi

# Setup PHP 8.4
log "Detecting current PHP version..."
ORIGINAL_PHP_PATH="$(which php)"
ORIGINAL_PHP_VERSION="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION.".".PHP_RELEASE_VERSION;' 2>/dev/null)"

log "Detected PHP version: $ORIGINAL_PHP_VERSION"
log "Detected PHP binary: $ORIGINAL_PHP_PATH"

# ───────────────────────────────────────────────────────────────────────────────
# If the *current* php is already 8.4.x, we skip the entire asdf install step
# ───────────────────────────────────────────────────────────────────────────────
if [[ "$ORIGINAL_PHP_PATH" == "$BREW_PREFIX/bin/php" && "$ORIGINAL_PHP_VERSION" =~ ^8\.4\. ]]; then
    log "Homebrew PHP $ORIGINAL_PHP_VERSION detected at $ORIGINAL_PHP_PATH — skipping asdf build/install."
else
    # Only install under asdf if we don’t already have 8.4.0 installed
    require_command asdf
    log "No Homebrew PHP 8.4 detected (found $ORIGINAL_PHP_PATH $ORIGINAL_PHP_VERSION), using asdf shell-local PHP $TOOLING_PHP_VERSION."
    if ! asdf list php | grep -q "$TOOLING_PHP_VERSION"; then
        # Use brew to install required dependencies for asdf php management
        log "Checking and installing Homebrew packages required for PHP 8.4 build..."

        for pkg in autoconf automake bison freetype gd gettext icu4c krb5 libedit libiconv libjpeg libpng libxml2 libzip pkg-config re2c zlib sqlite3 libsodium oniguruma openssl@3 nasm; do
            if ! brew list "$pkg" &>/dev/null; then
                log_warn "$pkg not found. Installing..."
                arch -arm64 brew install "$pkg"
            else
                log "$pkg already installed. Skipping."
            fi
        done

        # Set necessary env flags/paths for PHP build on OSX ARM64
        export CPPFLAGS="-I$BREW_PREFIX/opt/oniguruma/include -I$BREW_PREFIX/opt/libsodium/include -I$BREW_PREFIX/opt/bzip2/include -I$BREW_PREFIX/opt/zlib/include -I$BREW_PREFIX/opt/openssl@3/include -I$BREW_PREFIX/opt/libxml2/include -I$BREW_PREFIX/opt/libedit/include -I$BREW_PREFIX/opt/curl/include -I$BREW_PREFIX/opt/sqlite3/include -I$BREW_PREFIX/opt/freetype/include -I$BREW_PREFIX/opt/jpeg/include -I$BREW_PREFIX/opt/libpng/include -I$BREW_PREFIX/opt/libzip/include"
        export LDFLAGS="-L$BREW_PREFIX/opt/openssl@3/lib -lssl -lcrypto -lz -L$BREW_PREFIX/opt/oniguruma/lib -lonig -L$BREW_PREFIX/opt/libsodium/lib -lsodium -L$BREW_PREFIX/opt/bzip2/lib -Wl,-rpath,$BREW_PREFIX/opt/bzip2/lib -lbz2 -L$BREW_PREFIX/opt/zlib/lib -L$BREW_PREFIX/opt/openssl@3/lib -L$BREW_PREFIX/opt/libxml2/lib -L$BREW_PREFIX/opt/libedit/lib -L$BREW_PREFIX/opt/sqlite3/lib -lsqlite3 -L$BREW_PREFIX/opt/curl/lib -lcurl -L$BREW_PREFIX/opt/freetype/lib -L$BREW_PREFIX/opt/jpeg/lib -L$BREW_PREFIX/opt/libpng/lib -L$BREW_PREFIX/opt/libzip/lib -lzip -lz"
        export PKG_CONFIG_PATH="$BREW_PREFIX/opt/openssl/lib/pkgconfig:$BREW_PREFIX/opt/oniguruma/lib/pkgconfig:$BREW_PREFIX/opt/libsodium/lib/pkgconfig:$BREW_PREFIX/opt/libzip/lib/pkgconfig:$BREW_PREFIX/opt/gd/lib/pkgconfig:$BREW_PREFIX/opt/zlib/lib/pkgconfig:$BREW_PREFIX/opt/openssl@3/lib/pkgconfig:$BREW_PREFIX/opt/libxml2/lib/pkgconfig:$BREW_PREFIX/opt/curl/lib/pkgconfig:$BREW_PREFIX/opt/sqlite3/lib/pkgconfig:$BREW_PREFIX/opt/freetype/lib/pkgconfig:$BREW_PREFIX/opt/jpeg/lib/pkgconfig:$BREW_PREFIX/opt/libpng/lib/pkgconfig"
        export PHP_CONFIGURE_OPTIONS="--with-openssl=$(brew --prefix openssl) --with-iconv=$(brew --prefix libiconv)"

        log "Installing PHP $TOOLING_PHP_VERSION with asdf..."
        asdf install php "$TOOLING_PHP_VERSION" --verbose
    else
        log "asdf already has PHP $TOOLING_PHP_VERSION installed, skipping"
    fi

    log "Activating PHP $TOOLING_PHP_VERSION for this shell only..."
    export ASDF_PHP_VERSION="$TOOLING_PHP_VERSION"
    log "Build tooling PHP is now: $(php -r 'echo PHP_VERSION;' 2>/dev/null)"
fi

# Clone FrankenPHP
if [ ! -d "$OSX_DIR/frankenphp" ]; then
    log "Cloning FrankenPHP..."
    git clone https://github.com/dunglas/frankenphp "$OSX_DIR/frankenphp"
else
    log_warn "FrankenPHP already cloned. Skipping."
fi

cd "$OSX_DIR/frankenphp"
require_file "$OSX_DIR/frankenphp/build-static.sh"

# Patch build script
log "Patching build-static.sh to skip git pull..."
sed -i '' 's/^[ \t]*git pull/# git pull/' ./build-static.sh

# Set environment variables
log "Exporting build environment variables..."
export PHP_VERSION="$TARGET_PHP_VERSION"
export PHP_EXTENSIONS="pdo_mysql,gd,bcmath,redis,intl,zip,gmp,apcu,opcache,imagick,sockets,pcntl,geos,iconv,mbstring,fileinfo,ctype,tokenizer,simplexml,dom,filter,session"
export PHP_EXTENSION_LIBS="libgeos,libzip,bzip2,libxml2,openssl,zlib"
export SPC_REL_TYPE=source
export NO_COMPRESS=1
export SPC_OPT_BUILD_ARGS="--debug"
export CMAKE_OSX_ARCHITECTURES=arm64

# Clone and prepare static-php-cli in dist/
STATIC_PHP_CLI_DIR="$OSX_DIR/frankenphp/dist/static-php-cli"
if [ ! -d "$STATIC_PHP_CLI_DIR" ]; then
    log "Cloning static-php-cli $STATIC_PHP_CLI_VERSION into dist/..."
    git clone --depth 1 --branch "$STATIC_PHP_CLI_VERSION" https://github.com/crazywhalecc/static-php-cli.git "$STATIC_PHP_CLI_DIR"
else
    log_warn "static-php-cli already exists in dist/. Skipping clone."
fi

require_dir "$STATIC_PHP_CLI_DIR/src/SPC/builder/unix/library"
require_dir "$STATIC_PHP_CLI_DIR/src/SPC/builder/macos/library"
require_file "$STATIC_PHP_CLI_DIR/src/SPC/builder/unix/UnixBuilderBase.php"
require_file "$STATIC_PHP_CLI_DIR/config/source.json"
require_file "$STATIC_PHP_CLI_DIR/config/ext.json"
require_file "$STATIC_PHP_CLI_DIR/config/lib.json"
require_file "$ROOT_DIR/builds/osx/spc/libgeos-unix.php"
require_file "$ROOT_DIR/builds/osx/spc/libgeos-macos.php"
require_file "$ROOT_DIR/builds/osx/spc/UnixBuilderBase-macos.php"

# Inject libgeos support
log "Injecting libgeos patch files for pinned static-php-cli $STATIC_PHP_CLI_VERSION..."
cp "$ROOT_DIR/builds/osx/spc/libgeos-unix.php" "$STATIC_PHP_CLI_DIR/src/SPC/builder/unix/library/libgeos.php"
cp "$ROOT_DIR/builds/osx/spc/libgeos-macos.php" "$STATIC_PHP_CLI_DIR/src/SPC/builder/macos/library/libgeos.php"
cp "$ROOT_DIR/builds/osx/spc/UnixBuilderBase-macos.php" "$STATIC_PHP_CLI_DIR/src/SPC/builder/unix/UnixBuilderBase.php"

# Patch SPC config
log "Patching SPC config files (source.json, ext.json, lib.json)..."
jq '. + {"php-geos": {"type": "url", "url": "https://github.com/libgeos/php-geos/archive/dfe1ab17b0f155cc315bc13c75689371676e02e1.zip", "license": [{"type": "file", "path": "php-geos-dfe1ab17b0f155cc315bc13c75689371676e02e1/MIT-LICENSE"}, {"type": "file", "path": "php-geos-dfe1ab17b0f155cc315bc13c75689371676e02e1/LGPL-2"}]}}' \
  "$STATIC_PHP_CLI_DIR/config/source.json" > "$STATIC_PHP_CLI_DIR/config/source.tmp.json" && \
  mv "$STATIC_PHP_CLI_DIR/config/source.tmp.json" "$STATIC_PHP_CLI_DIR/config/source.json"

jq '. + {"libgeos": {"type": "url", "url": "https://download.osgeo.org/geos/geos-3.12.1.tar.bz2", "filename": "geos-3.12.1.tar.bz2", "extract": "geos-3.12.1", "build-dir": "build", "license": [{"type": "file", "path": "COPYING"}]}}' \
  "$STATIC_PHP_CLI_DIR/config/source.json" > "$STATIC_PHP_CLI_DIR/config/source.tmp.json" && \
  mv "$STATIC_PHP_CLI_DIR/config/source.tmp.json" "$STATIC_PHP_CLI_DIR/config/source.json"

jq '. + {"libgeos": {"source": "libgeos", "static-libs-unix": ["libgeos.a", "libgeos_c.a"]}}' \
  "$STATIC_PHP_CLI_DIR/config/lib.json" > "$STATIC_PHP_CLI_DIR/config/lib.tmp.json" && \
  mv "$STATIC_PHP_CLI_DIR/config/lib.tmp.json" "$STATIC_PHP_CLI_DIR/config/lib.json"

jq '. + {"geos": {"type": "external", "arg-type": "enable", "source": "php-geos", "lib-depends": ["libgeos"]}}' \
  "$STATIC_PHP_CLI_DIR/config/ext.json" > "$STATIC_PHP_CLI_DIR/config/ext.tmp.json" && \
  mv "$STATIC_PHP_CLI_DIR/config/ext.tmp.json" "$STATIC_PHP_CLI_DIR/config/ext.json"

# Prepare app embed folder
log "📦 Preparing embedded app directory..."
rm -rf ./dist/app
mkdir -p ./dist/app
cp -R "$APP_DIR"/* ./dist/app/

log "Patching build-static.sh to skip git pull and composer install..."

# Skip `git pull`
sed -i '' 's/^[[:space:]]*git pull/# git pull/' "$OSX_DIR/frankenphp/build-static.sh"

# Patch add CoreServices framework for Caddy build on OSX
if grep -q -- '-framework CoreFoundation -framework SystemConfiguration' "$OSX_DIR/frankenphp/build-static.sh"; then
    sed -i '' 's/-framework CoreFoundation -framework SystemConfiguration/& -framework CoreServices/' "$OSX_DIR/frankenphp/build-static.sh"
else
    log_error "Unable to patch CoreServices framework: expected Caddy linker flags were not found."
    exit 1
fi

# ── work around 403 on GH macOS runners ────────────────────────────────────────
log "Patching curl to use a browser-like User-Agent (to avoid 403s)…"
curl() {
  command curl -sSL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15" "$@"
}
export -f curl

# Build the binary
log "⚙️ Running FrankenPHP build-static.sh..."
EMBED=dist/app ./build-static.sh

# Move built binary to dist
log "Moving built binary to output folder..."
mkdir -p "$DIST_DIR"
mv dist/frankenphp-mac-$ARCH "$DIST_DIR/$BINARY_NAME"

log_success "✅ macOS binary built at: $DIST_DIR/$BINARY_NAME"

# Clean up frankenphp build and app embed folder
log "🧹 Cleaning temporary app directory..."
rm -rf "$OSX_DIR/frankenphp"
