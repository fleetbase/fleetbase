#!/usr/bin/env bash
# Prepares a server folder for compose.yml: creates the layout, generates secrets and writes the
# config. Safe to run again: existing secrets are kept, because changing the app key would make
# encrypted data unreadable.
#
#   ./init.sh --domain fleet.example.com --version v0.7.76
#
# Options:
#   --domain NAME        console address (required)
#   --api-domain NAME    API address (default: api.<domain>)
#   --version V          image tag (required)
#   --home DIR           server folder (default: /opt/fleetbase)
#   --tls MODE           auto, internal or own (default: auto)
#   --database-url URL   use an external database instead of the bundled one
#   --claim-token TOKEN  require this token to create the first organization
#   --telemetry          send usage statistics (default: off)
#   --http-port N        host port for HTTP (default: 80)
#   --https-port N       host port for HTTPS (default: 443)
set -euo pipefail

DOMAIN="" API_DOMAIN="" VERSION="" HOME_DIR="/opt/fleetbase" TLS_MODE="auto"
DATABASE_URL="" CLAIM_TOKEN="" TELEMETRY_DISABLED="true" HTTP_PORT="80" HTTPS_PORT="443"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --api-domain) API_DOMAIN="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --home) HOME_DIR="$2"; shift 2 ;;
    --tls) TLS_MODE="$2"; shift 2 ;;
    --database-url) DATABASE_URL="$2"; shift 2 ;;
    --claim-token) CLAIM_TOKEN="$2"; shift 2 ;;
    --telemetry) TELEMETRY_DISABLED="false"; shift ;;
    --http-port) HTTP_PORT="$2"; shift 2 ;;
    --https-port) HTTPS_PORT="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$DOMAIN" ]] || { echo "--domain is required" >&2; exit 2; }
[[ -n "$VERSION" ]] || { echo "--version is required" >&2; exit 2; }
case "$TLS_MODE" in auto|internal|own) ;; *) echo "--tls must be auto, internal or own" >&2; exit 2 ;; esac
API_DOMAIN="${API_DOMAIN:-api.$DOMAIN}"

# Only a non-standard port (a test run) appears in an address.
PORT_SUFFIX=""
[[ "$HTTPS_PORT" == "443" ]] || PORT_SUFFIX=":$HTTPS_PORT"
CONSOLE_URL="https://$DOMAIN$PORT_SUFFIX"
API_URL="https://$API_DOMAIN$PORT_SUFFIX"

mkdir -p "$HOME_DIR"/{config,secrets,run,certs,data/storage,data/caddy,data/mysql,data/valkey}
HOME_DIR="$(cd "$HOME_DIR" && pwd)"
chmod 700 "$HOME_DIR/secrets"
umask 077

# keep_or KEY FILE DEFAULT: the value already in FILE, or DEFAULT
keep_or() {
  local line
  line="$(grep -E "^$1=" "$2" 2>/dev/null | tail -n 1 || true)"
  if [[ -n "$line" ]]; then printf '%s' "${line#*=}"; else printf '%s' "$3"; fi
}

APP_ENV_FILE="$HOME_DIR/secrets/app.env"
DB_ENV_FILE="$HOME_DIR/secrets/database.env"
SOCKET_ENV_FILE="$HOME_DIR/secrets/socket.env"

APP_KEY="$(keep_or APP_KEY "$APP_ENV_FILE" "base64:$(openssl rand -base64 32)")"
SOCKET_KEY="$(keep_or SOCKETCLUSTER_AUTH_KEY "$APP_ENV_FILE" "$(openssl rand -hex 32)")"
DB_PASSWORD="$(keep_or MYSQL_PASSWORD "$DB_ENV_FILE" "$(openssl rand -hex 24)")"
DB_ROOT_PASSWORD="$(keep_or MYSQL_ROOT_PASSWORD "$DB_ENV_FILE" "$(openssl rand -hex 24)")"

PROFILES=""
if [[ -z "$DATABASE_URL" ]]; then
  PROFILES="bundled-database"
  DATABASE_URL="mysql://fleetbase:$DB_PASSWORD@database/fleetbase"
  cat > "$DB_ENV_FILE" <<ENV
MYSQL_DATABASE=fleetbase
MYSQL_USER=fleetbase
MYSQL_PASSWORD=$DB_PASSWORD
MYSQL_ROOT_PASSWORD=$DB_ROOT_PASSWORD
ENV
fi

cat > "$APP_ENV_FILE" <<ENV
APP_NAME=Fleetbase
APP_KEY=$APP_KEY
APP_URL=$API_URL
APP_DEBUG=false
ENVIRONMENT=production
CONSOLE_HOST=$CONSOLE_URL
SESSION_DOMAIN=$DOMAIN
DATABASE_URL=$DATABASE_URL
QUEUE_CONNECTION=redis
REDIS_QUEUE_DB=1
CACHE_DRIVER=redis
CACHE_PATH=/fleetbase/api/storage/framework/cache
CACHE_URL=tcp://cache
REDIS_URL=tcp://cache
LOG_CHANNEL=stderr
BROADCAST_DRIVER=socketcluster
SOCKETCLUSTER_AUTH_ENABLED=false
SOCKETCLUSTER_AUTH_KEY=$SOCKET_KEY
SOCKETCLUSTER_PUBLISH_URL=http://socket:8001
SOCKETCLUSTER_ORIGIN=$CONSOLE_URL
MAIL_MAILER=log
MAIL_FROM_ADDRESS=hello@$DOMAIN
MAIL_FROM_NAME=Fleetbase
OSRM_HOST=https://router.project-osrm.org
REGISTRY_HOST=https://registry.fleetbase.io
REGISTRY_PREINSTALLED_EXTENSIONS=true
TELEMETRY_DISABLED=$TELEMETRY_DISABLED
ONBOARD_ALLOW_REGISTRATION=false
ONBOARD_CLAIM_TOKEN=$CLAIM_TOKEN
ENV

cat > "$SOCKET_ENV_FILE" <<ENV
SOCKETCLUSTER_AUTH_ENABLED=false
SOCKETCLUSTER_AUTH_KEY=$SOCKET_KEY
SOCKETCLUSTER_AUTHORIZE_URL=http://application:8000/int/v1/socket/authorize
SOCKETCLUSTER_OPTIONS={"origins":"$DOMAIN:*,$API_DOMAIN:*"}
ENV

umask 022
cat > "$HOME_DIR/config/fleetbase.config.json" <<JSON
{
  "API_HOST": "$API_URL",
  "API_SECURE": true,
  "SOCKETCLUSTER_HOST": "$API_DOMAIN",
  "SOCKETCLUSTER_PORT": "$HTTPS_PORT",
  "SOCKETCLUSTER_PATH": "/socketcluster/",
  "SOCKETCLUSTER_SECURE": true
}
JSON

cat > "$HOME_DIR/config/stack.env" <<ENV
FLEETBASE_HOME=$HOME_DIR
FLEETBASE_VERSION=$VERSION
CONSOLE_DOMAIN=$DOMAIN
API_DOMAIN=$API_DOMAIN
TLS_MODE=$TLS_MODE
HTTP_PORT=$HTTP_PORT
HTTPS_PORT=$HTTPS_PORT
COMPOSE_PROFILES=$PROFILES
ENV

echo "Ready in $HOME_DIR. Next:"
echo "  docker compose -f compose.yml --env-file $HOME_DIR/config/stack.env up -d"
echo "  docker compose -f compose.yml --env-file $HOME_DIR/config/stack.env exec -T application ./deploy.sh"
