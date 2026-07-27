#!/bin/bash

set -e
set -o pipefail

# Resolve the directory the script is located in
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

APP_NAME="Fleetbase"
IMAGE_NAME="fleetbase-linux-static"
CONTAINER_NAME="fleetbase-linux-build"
DIST_DIR="$ROOT_DIR/builds/dist"
BINARY_NAME="fleetbase-linux-x86_64"
DOCKERFILE="$ROOT_DIR/builds/linux/static-build.Dockerfile"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Required command not found: $1" >&2
    exit 1
  fi
}

cleanup_container() {
  if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
    echo "🧹 Removing existing build container: $CONTAINER_NAME"
    docker rm -f "$CONTAINER_NAME" >/dev/null
  fi
}

require_command curl
require_command docker

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker is not running or the daemon is not reachable." >&2
  exit 1
fi

mkdir -p "$DIST_DIR"
if [[ ! -w "$DIST_DIR" ]]; then
  echo "❌ Dist directory is not writable: $DIST_DIR" >&2
  exit 1
fi

cleanup_container
trap cleanup_container EXIT

# Ensure pkg-config archive is available
SPC_DOWNLOADS_DIR="$SCRIPT_DIR/spc/downloads"
PKG_TAR="pkg-config-0.29.2.tar.gz"
PKG_URL="https://static-php-cli.fra1.digitaloceanspaces.com/static-php-cli/deps/pkg-config/${PKG_TAR}"

if [[ ! -f "${SPC_DOWNLOADS_DIR}/${PKG_TAR}" ]]; then
  echo "📥  pkg-config archive missing – downloading..."
  mkdir -p "${SPC_DOWNLOADS_DIR}"
  curl -L --retry 3 -o "${SPC_DOWNLOADS_DIR}/${PKG_TAR}" "${PKG_URL}"
else
  echo "✅  pkg-config archive already present."
fi

# Build the image
echo "📦 Building static Linux binary for ${APP_NAME}..."
docker build -f "$DOCKERFILE" -t "$IMAGE_NAME" "$ROOT_DIR"

# Create a container from the built image
echo "📦 Creating container to extract binary..."
docker create --name "$CONTAINER_NAME" "$IMAGE_NAME"

# Copy binary from container to local dist folder
echo "📂 Extracting binary..."
docker cp "$CONTAINER_NAME:/go/src/app/dist/frankenphp-linux-x86_64" "$DIST_DIR/$BINARY_NAME"

# Cleanup the temp container
cleanup_container

echo "✅ Build complete! Binary is located at: $DIST_DIR/$BINARY_NAME"
