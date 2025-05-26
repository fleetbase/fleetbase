#!/usr/bin/env bash
# scripts/docker-install.sh
# Fleetbase “one‑liner” Docker installer
# --------------------------------------
set -euo pipefail

# ────────────────────────────────────────────────────────────
# 1. Get host value (CLI arg → prompt → default)
# ────────────────────────────────────────────────────────────
if [[ $# -ge 1 && -n "$1" ]]; then
  HOST="$1"
else
  read -rp "Enter host or IP address to bind to [localhost]: " HOST_INPUT
  HOST="${HOST_INPUT:-localhost}"
fi
echo "➜  Using host: $HOST"

# Resolve project root no matter where the script is called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

# ────────────────────────────────────────────────────────────
# 2. Generate a fresh Laravel APP_KEY
# ────────────────────────────────────────────────────────────
if ! command -v openssl >/dev/null 2>&1; then
    echo "✖ openssl is required but not found. Install it and retry." >&2
    exit 1
fi
APP_KEY="base64:$(openssl rand -base64 32 | tr -d '\n')"
echo "✔  Generated APP_KEY"

# ────────────────────────────────────────────────────────────
# 3. Ensure docker‑compose.override.yml has the right values
# ────────────────────────────────────────────────────────────
OVERRIDE_FILE="docker-compose.override.yml"

# We’ll use yq if available (best for YAML‑safe edits)
update_override_with_yq() {
  yq -i "
    .services.application.environment.APP_KEY       = \"$APP_KEY\" |
    .services.application.environment.CONSOLE_HOST  = \"http://$HOST:4200\"
  " "$OVERRIDE_FILE"
  echo "✔  $OVERRIDE_FILE updated (yq)"
}

# Fallback: create or append the section with plain Bash if yq isn’t installed
create_or_append_override() {
  cat > "$OVERRIDE_FILE" <<YML
services:
  application:
    environment:
      APP_KEY: "$APP_KEY"
      CONSOLE_HOST: "http://$HOST:4200"
YML
  echo "✔  $OVERRIDE_FILE written"
}

if [[ -f "$OVERRIDE_FILE" ]]; then
  if command -v yq >/dev/null 2>&1; then
    update_override_with_yq
  else
    # simple backup, then naive append‑or‑overwrite section
    cp "$OVERRIDE_FILE" "${OVERRIDE_FILE}.bak.$(date +%Y%m%d%H%M%S)"
    echo "ℹ︎  Existing $OVERRIDE_FILE backed up (no yq found — recreating)"
    create_or_append_override
  fi
else
  create_or_append_override
fi

# ────────────────────────────────────────────────────────────
# 4. Update ./console/fleetbase.config.json
# ────────────────────────────────────────────────────────────
CONFIG_PATH="console/fleetbase.config.json"
mkdir -p "$(dirname "$CONFIG_PATH")"

cat > "$CONFIG_PATH" <<JSON
{
  "API_HOST": "http://$HOST:8000",
  "SOCKETCLUSTER_HOST": "$HOST",
  "SOCKETCLUSTER_PORT": "38000"
}
JSON
echo "✔  $CONFIG_PATH updated"

# ────────────────────────────────────────────────────────────
# 5. Start the stack & run the deploy script
# ────────────────────────────────────────────────────────────
echo "⏳  Starting Fleetbase containers..."
docker compose up -d

echo "⏳  Running deploy script inside the application container..."
docker compose exec application bash -c "./deploy.sh"
docker compose up -d

echo "🏁  Fleetbase is up!  API → http://$HOST:8000 | Console → http://$HOST:4200"