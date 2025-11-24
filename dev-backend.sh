#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo -e "\nStopping backend services..."
  docker compose down
}
trap cleanup EXIT INT TERM

cd "$ROOT_DIR"

echo "Starting backend services in Docker (without console)..."
docker compose up --scale console=0

