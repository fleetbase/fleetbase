#!/usr/bin/env bash
# scripts/docker-install.sh
# Fleetbase Docker installer — interactive setup wizard
# -------------------------------------------------------
# Usage:
#   bash scripts/docker-install.sh              # interactive (default)
#   bash scripts/docker-install.sh --non-interactive  # CI/CD, all defaults
# -------------------------------------------------------
set -euo pipefail

# ─── Colour helpers ──────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}ℹ  ${RESET}$*"; }
success() { echo -e "${GREEN}✔  ${RESET}$*"; }
warn()    { echo -e "${YELLOW}⚠  ${RESET}$*"; }
error()   { echo -e "${RED}✖  ${RESET}$*" >&2; }
section() { echo -e "\n${BOLD}── $* $(printf '─%.0s' {1..40})${RESET}"; }

# ─── Non-interactive flag ────────────────────────────────────────────────────
NON_INTERACTIVE=false
for arg in "$@"; do
  [[ "$arg" == "--non-interactive" ]] && NON_INTERACTIVE=true
done
$NON_INTERACTIVE && info "Non-interactive mode: all optional steps will use safe defaults."

# ─── Helper: generate a random hex secret ────────────────────────────────────
gen_secret() { openssl rand -hex "${1:-20}"; }

# ─── Helper: append a non-empty env var line to the override builder ─────────
# Usage: env_line VAR_NAME "value"   → echoes '      VAR_NAME: "value"' if non-empty
env_line() {
  local key="$1" val="$2"
  [[ -z "$val" ]] && return
  printf '      %s: "%s"\n' "$key" "$val"
}

echo
echo -e "${BOLD}🚀  Fleetbase Installation Wizard${RESET}"
echo

###############################################################################
# STEP 0 — Pre-flight checks
###############################################################################
section "Pre-flight Checks"

# Required tools
for tool in docker git openssl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    error "$tool is required but not found. Install it and retry."
    exit 1
  fi
  success "$tool found"
done

# Docker Compose v2
if ! docker compose version >/dev/null 2>&1; then
  error "'docker compose' (v2) is required. Please upgrade Docker Desktop or install the Compose plugin."
  exit 1
fi
success "Docker Compose v2 found"

# Port availability (warn only — do not block)
for port_label in "8000:API" "4200:Console" "3306:MySQL" "38000:SocketCluster"; do
  port="${port_label%%:*}"
  label="${port_label##*:}"
  if ss -tlnp 2>/dev/null | grep -q ":${port} " || \
     netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
    warn "Port ${port} (${label}) is already in use — this may cause a conflict."
  else
    success "Port ${port} (${label}) is free"
  fi
done

success "Pre-flight checks complete"

###############################################################################
# STEP 1 — Core parameters
###############################################################################
section "Core Configuration"

if $NON_INTERACTIVE; then
  HOST="localhost"
  ENVIRONMENT="development"
  APP_NAME="Fleetbase"
else
  read -rp "Host or IP address to bind to [localhost]: " HOST_INPUT
  HOST="${HOST_INPUT:-localhost}"

  while true; do
    read -rp "Environment (development / production) [development]: " ENV_INPUT
    ENV_INPUT=$(echo "$ENV_INPUT" | tr '[:upper:]' '[:lower:]')
    case "$ENV_INPUT" in
      ""|d|dev|development) ENVIRONMENT=development; break ;;
      p|prod|production)    ENVIRONMENT=production;  break ;;
      *) warn "Please type either 'development' or 'production'." ;;
    esac
  done

  read -rp "Application name [Fleetbase]: " APP_NAME_INPUT
  APP_NAME="${APP_NAME_INPUT:-Fleetbase}"
fi

# Derive scheme flags
USE_HTTPS=false; APP_DEBUG=true; SC_SECURE=false
[[ "$ENVIRONMENT" == "production" ]] && { USE_HTTPS=true; APP_DEBUG=false; SC_SECURE=true; }
SCHEME_API=$([[ "$USE_HTTPS" == true ]] && echo "https" || echo "http")
SCHEME_CONSOLE=$([[ "$USE_HTTPS" == true ]] && echo "https" || echo "http")

# Detect localhost
IS_LOCALHOST=false
[[ "$HOST" == "localhost" || "$HOST" == "0.0.0.0" || "$HOST" == "127.0.0.1" ]] && IS_LOCALHOST=true

info "Host: $HOST  |  Environment: $ENVIRONMENT  |  App name: $APP_NAME"

###############################################################################
# STEP 2 — Locate project root
###############################################################################
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

###############################################################################
# STEP 3 — Database configuration
###############################################################################
section "Database Configuration"

DB_MODE="internal"   # default

if ! $NON_INTERACTIVE; then
  echo "  1) Bundled Docker MySQL  (recommended for development)"
  echo "  2) External MySQL server (e.g. AWS RDS, PlanetScale)"
  read -rp "Choose [1]: " DB_CHOICE_INPUT
  [[ "${DB_CHOICE_INPUT:-1}" == "2" ]] && DB_MODE="external"
fi

if [[ "$DB_MODE" == "external" ]]; then
  read -rp  "  Database host [127.0.0.1]: "  DB_HOST_INPUT;  DB_HOST="${DB_HOST_INPUT:-127.0.0.1}"
  read -rp  "  Database port [3306]: "        DB_PORT_INPUT;  DB_PORT="${DB_PORT_INPUT:-3306}"
  read -rp  "  Database name [fleetbase]: "   DB_NAME_INPUT;  DB_NAME="${DB_NAME_INPUT:-fleetbase}"
  read -rp  "  Database username: "           DB_USER
  read -srp "  Database password: "           DB_PASS; echo
  # URL-encode the password (basic: replace @ and / which are most problematic)
  DB_PASS_ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1],safe=''))" "$DB_PASS" 2>/dev/null || echo "$DB_PASS")
  DATABASE_URL="mysql://${DB_USER}:${DB_PASS_ENC}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  DB_ROOT_PASSWORD=""
  DB_USERNAME="$DB_USER"
  DB_PASSWORD="$DB_PASS"
  DB_DATABASE="$DB_NAME"
  success "External database configured"
else
  DB_ROOT_PASSWORD="$(gen_secret 20)"
  DB_PASSWORD="$(gen_secret 20)"
  DB_USERNAME="fleetbase"
  DB_DATABASE="fleetbase"
  DATABASE_URL="mysql://${DB_USERNAME}:${DB_PASSWORD}@database/${DB_DATABASE}"
  success "Secure database credentials auto-generated"
fi

###############################################################################
# STEP 4 — Mail configuration
###############################################################################
section "Mail Configuration"

MAIL_MAILER="log"
MAIL_HOST=""; MAIL_PORT=""; MAIL_USERNAME=""; MAIL_PASSWORD=""
MAIL_FROM_ADDRESS=""; MAIL_FROM_NAME="$APP_NAME"
MAILGUN_DOMAIN=""; MAILGUN_SECRET=""
POSTMARK_TOKEN=""; SENDGRID_API_KEY=""; RESEND_KEY=""

CONFIG_MAIL=false
if ! $NON_INTERACTIVE; then
  read -rp "Configure a mail server? Required for password resets & notifications (y/N): " MAIL_YN
  [[ "${MAIL_YN,,}" == "y" || "${MAIL_YN,,}" == "yes" ]] && CONFIG_MAIL=true
fi

if $CONFIG_MAIL; then
  echo "  Mail drivers: 1) SMTP  2) Mailgun  3) Postmark  4) SendGrid  5) Resend  6) AWS SES  7) Log only"
  read -rp "  Choose driver [1]: " MAIL_DRIVER_INPUT
  case "${MAIL_DRIVER_INPUT:-1}" in
    2) MAIL_MAILER="mailgun" ;;
    3) MAIL_MAILER="postmark" ;;
    4) MAIL_MAILER="sendgrid" ;;
    5) MAIL_MAILER="resend" ;;
    6) MAIL_MAILER="ses" ;;
    7) MAIL_MAILER="log" ;;
    *) MAIL_MAILER="smtp" ;;
  esac

  DEFAULT_FROM="hello@$( $IS_LOCALHOST && echo 'example.com' || echo "$HOST" )"
  read -rp  "  From address [$DEFAULT_FROM]: " MAIL_FROM_INPUT
  MAIL_FROM_ADDRESS="${MAIL_FROM_INPUT:-$DEFAULT_FROM}"
  read -rp  "  From name [$APP_NAME]: " MAIL_FROM_NAME_INPUT
  MAIL_FROM_NAME="${MAIL_FROM_NAME_INPUT:-$APP_NAME}"

  case "$MAIL_MAILER" in
    smtp)
      read -rp  "  SMTP host [smtp.mailgun.org]: " MAIL_HOST_INPUT; MAIL_HOST="${MAIL_HOST_INPUT:-smtp.mailgun.org}"
      read -rp  "  SMTP port [587]: "               MAIL_PORT_INPUT; MAIL_PORT="${MAIL_PORT_INPUT:-587}"
      read -rp  "  SMTP username: "                 MAIL_USERNAME
      read -srp "  SMTP password: "                 MAIL_PASSWORD; echo
      ;;
    mailgun)
      read -rp  "  Mailgun domain: "      MAILGUN_DOMAIN
      read -srp "  Mailgun API secret: "  MAILGUN_SECRET; echo
      ;;
    postmark)
      read -srp "  Postmark server token: " POSTMARK_TOKEN; echo
      ;;
    sendgrid)
      read -srp "  SendGrid API key: " SENDGRID_API_KEY; echo
      ;;
    resend)
      read -srp "  Resend API key: " RESEND_KEY; echo
      ;;
    ses)
      info "AWS SES will use the AWS credentials configured in the Storage step."
      ;;
  esac
  success "Mail driver set to: $MAIL_MAILER"
else
  info "Skipped — emails will be written to the application log."
fi

###############################################################################
# STEP 5 — File storage
###############################################################################
section "File Storage Configuration"

FILESYSTEM_DRIVER="public"
AWS_ACCESS_KEY_ID=""; AWS_SECRET_ACCESS_KEY=""; AWS_DEFAULT_REGION=""
AWS_BUCKET=""; AWS_URL=""; AWS_USE_PATH_STYLE_ENDPOINT=""
GOOGLE_CLOUD_PROJECT_ID=""; GOOGLE_CLOUD_STORAGE_BUCKET=""; GOOGLE_CLOUD_KEY_FILE=""

if ! $NON_INTERACTIVE; then
  echo "  Storage drivers: 1) Local disk (dev only)  2) AWS S3  3) Google Cloud Storage"
  read -rp "  Choose driver [1]: " STORAGE_INPUT
  case "${STORAGE_INPUT:-1}" in
    2) FILESYSTEM_DRIVER="s3" ;;
    3) FILESYSTEM_DRIVER="gcs" ;;
    *) FILESYSTEM_DRIVER="public" ;;
  esac
fi

if [[ "$FILESYSTEM_DRIVER" == "s3" ]]; then
  read -rp  "  AWS Access Key ID: "                                     AWS_ACCESS_KEY_ID
  read -srp "  AWS Secret Access Key: "                                  AWS_SECRET_ACCESS_KEY; echo
  read -rp  "  AWS Region [us-east-1]: "                                 AWS_REGION_INPUT; AWS_DEFAULT_REGION="${AWS_REGION_INPUT:-us-east-1}"
  read -rp  "  S3 Bucket name: "                                         AWS_BUCKET
  read -rp  "  S3 Public URL (leave blank for default): "                AWS_URL
  read -rp  "  Use path-style endpoint? (for MinIO/non-AWS S3) (y/N): " PATH_STYLE_INPUT
  [[ "${PATH_STYLE_INPUT,,}" == "y" ]] && AWS_USE_PATH_STYLE_ENDPOINT="true"
  success "S3 storage configured"
elif [[ "$FILESYSTEM_DRIVER" == "gcs" ]]; then
  read -rp "  GCS Project ID: "      GOOGLE_CLOUD_PROJECT_ID
  read -rp "  GCS Bucket name: "     GOOGLE_CLOUD_STORAGE_BUCKET
  read -rp "  Path to GCS key file (JSON): " GOOGLE_CLOUD_KEY_FILE
  success "Google Cloud Storage configured"
else
  info "Local disk selected — suitable for development only."
fi

###############################################################################
# STEP 6 — Security & CORS
###############################################################################
section "Security & CORS Configuration"

# Derive SESSION_DOMAIN
SESSION_DOMAIN="$( $IS_LOCALHOST && echo 'localhost' || echo "$HOST" )"

# Derive SOCKETCLUSTER_OPTIONS origins
if $IS_LOCALHOST; then
  SOCKET_ORIGINS="http://localhost:*,https://localhost:*,ws://localhost:*,wss://localhost:*"
else
  SOCKET_ORIGINS="${SCHEME_CONSOLE}://${HOST}:*,wss://${HOST}:*"
fi
SOCKETCLUSTER_OPTIONS="{\"origins\":\"${SOCKET_ORIGINS}\"}"

success "SESSION_DOMAIN set to: $SESSION_DOMAIN"
success "WebSocket origins restricted to: $SOCKET_ORIGINS"

FRONTEND_HOSTS=""
if ! $NON_INTERACTIVE; then
  read -rp "Additional frontend hosts for CORS (comma-separated, leave blank for none): " FRONTEND_HOSTS
fi

###############################################################################
# STEP 7 — Optional third-party API keys
###############################################################################
section "Optional Third-Party Services"

IPINFO_API_KEY=""; GOOGLE_MAPS_API_KEY=""; GOOGLE_MAPS_LOCALE="us"
TWILIO_SID=""; TWILIO_TOKEN=""; TWILIO_FROM=""

CONFIG_3P=false
if ! $NON_INTERACTIVE; then
  read -rp "Configure optional third-party API keys now? (Maps, Geolocation, SMS) (y/N): " TP_YN
  [[ "${TP_YN,,}" == "y" || "${TP_YN,,}" == "yes" ]] && CONFIG_3P=true
fi

if $CONFIG_3P; then
  read -rp  "  IPInfo API key (geolocation, leave blank to skip): "  IPINFO_API_KEY
  read -rp  "  Google Maps API key (leave blank to skip): "          GOOGLE_MAPS_API_KEY
  read -rp  "  Google Maps locale [us]: "                            GM_LOCALE_INPUT; GOOGLE_MAPS_LOCALE="${GM_LOCALE_INPUT:-us}"
  read -rp  "  Twilio Account SID (SMS, leave blank to skip): "      TWILIO_SID
  read -srp "  Twilio Auth Token: "                                   TWILIO_TOKEN; echo
  read -rp  "  Twilio From phone number: "                           TWILIO_FROM
  success "Third-party services configured"
else
  info "Skipped — these can be added later via docker-compose.override.yml"
fi

###############################################################################
# STEP 8 — Generate APP_KEY
###############################################################################
section "Generating Application Key"
APP_KEY="base64:$(openssl rand -base64 32 | tr -d '\n')"
success "APP_KEY generated"

###############################################################################
# STEP 9 — Write docker-compose.override.yml
###############################################################################
section "Writing docker-compose.override.yml"

OVERRIDE_FILE="docker-compose.override.yml"

# Back up any existing override
if [[ -f "$OVERRIDE_FILE" ]]; then
  BACKUP="${OVERRIDE_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  cp "$OVERRIDE_FILE" "$BACKUP"
  info "Existing override backed up to $BACKUP"
fi

# Build the file using a temp file for atomicity
OVERRIDE_TMP="${OVERRIDE_FILE}.tmp.$$"

{
  cat <<YAML_HEADER
services:
  application:
    environment:
YAML_HEADER

  env_line "APP_KEY"           "$APP_KEY"
  env_line "APP_NAME"          "$APP_NAME"
  env_line "APP_URL"           "${SCHEME_API}://${HOST}:8000"
  env_line "CONSOLE_HOST"      "${SCHEME_CONSOLE}://${HOST}:4200"
  env_line "ENVIRONMENT"       "$ENVIRONMENT"
  env_line "APP_DEBUG"         "$APP_DEBUG"
  env_line "DATABASE_URL"      "$DATABASE_URL"
  env_line "SESSION_DOMAIN"    "$SESSION_DOMAIN"
  env_line "FRONTEND_HOSTS"    "$FRONTEND_HOSTS"
  # Mail
  env_line "MAIL_MAILER"       "$MAIL_MAILER"
  env_line "MAIL_HOST"         "$MAIL_HOST"
  env_line "MAIL_PORT"         "$MAIL_PORT"
  env_line "MAIL_USERNAME"     "$MAIL_USERNAME"
  env_line "MAIL_PASSWORD"     "$MAIL_PASSWORD"
  env_line "MAIL_FROM_ADDRESS" "$MAIL_FROM_ADDRESS"
  env_line "MAIL_FROM_NAME"    "$MAIL_FROM_NAME"
  env_line "MAILGUN_DOMAIN"    "$MAILGUN_DOMAIN"
  env_line "MAILGUN_SECRET"    "$MAILGUN_SECRET"
  env_line "POSTMARK_TOKEN"    "$POSTMARK_TOKEN"
  env_line "SENDGRID_API_KEY"  "$SENDGRID_API_KEY"
  env_line "RESEND_KEY"        "$RESEND_KEY"
  # Storage
  [[ "$FILESYSTEM_DRIVER" != "public" ]] && env_line "FILESYSTEM_DRIVER" "$FILESYSTEM_DRIVER"
  env_line "AWS_ACCESS_KEY_ID"           "$AWS_ACCESS_KEY_ID"
  env_line "AWS_SECRET_ACCESS_KEY"       "$AWS_SECRET_ACCESS_KEY"
  env_line "AWS_DEFAULT_REGION"          "$AWS_DEFAULT_REGION"
  env_line "AWS_BUCKET"                  "$AWS_BUCKET"
  env_line "AWS_URL"                     "$AWS_URL"
  env_line "AWS_USE_PATH_STYLE_ENDPOINT" "$AWS_USE_PATH_STYLE_ENDPOINT"
  env_line "GOOGLE_CLOUD_PROJECT_ID"     "$GOOGLE_CLOUD_PROJECT_ID"
  env_line "GOOGLE_CLOUD_STORAGE_BUCKET" "$GOOGLE_CLOUD_STORAGE_BUCKET"
  env_line "GOOGLE_CLOUD_KEY_FILE"       "$GOOGLE_CLOUD_KEY_FILE"
  # Third-party
  env_line "IPINFO_API_KEY"      "$IPINFO_API_KEY"
  env_line "GOOGLE_MAPS_API_KEY" "$GOOGLE_MAPS_API_KEY"
  env_line "GOOGLE_MAPS_LOCALE"  "$GOOGLE_MAPS_LOCALE"
  env_line "TWILIO_SID"          "$TWILIO_SID"
  env_line "TWILIO_TOKEN"        "$TWILIO_TOKEN"
  env_line "TWILIO_FROM"         "$TWILIO_FROM"

  cat <<YAML_SOCKET

  socket:
    environment:
      SOCKETCLUSTER_OPTIONS: '${SOCKETCLUSTER_OPTIONS}'
YAML_SOCKET

  # Add database service block only when using the bundled container
  if [[ "$DB_MODE" == "internal" ]]; then
    cat <<YAML_DB

  database:
    environment:
      MYSQL_ROOT_PASSWORD: "${DB_ROOT_PASSWORD}"
      MYSQL_DATABASE: "${DB_DATABASE}"
      MYSQL_USER: "${DB_USERNAME}"
      MYSQL_PASSWORD: "${DB_PASSWORD}"
      MYSQL_ALLOW_EMPTY_PASSWORD: "no"
YAML_DB
  fi
} > "$OVERRIDE_TMP"

mv -f "$OVERRIDE_TMP" "$OVERRIDE_FILE"
success "$OVERRIDE_FILE written"

###############################################################################
# STEP 10 — Write console configuration files
###############################################################################
section "Updating Console Configuration"

CONFIG_DIR="console"
mkdir -p "$CONFIG_DIR"

OSRM_HOST="https://router.project-osrm.org"

cat > "${CONFIG_DIR}/fleetbase.config.json.tmp" <<JSON
{
  "API_HOST": "${SCHEME_API}://${HOST}:8000",
  "SOCKETCLUSTER_HOST": "${HOST}",
  "SOCKETCLUSTER_PORT": "38000",
  "SOCKETCLUSTER_SECURE": "${SC_SECURE}"
}
JSON
mv -f "${CONFIG_DIR}/fleetbase.config.json.tmp" "${CONFIG_DIR}/fleetbase.config.json"

ENV_DIR="${CONFIG_DIR}/environments"
mkdir -p "$ENV_DIR"

cat > "${ENV_DIR}/.env.development" <<ENV_DEV
API_HOST=http://${HOST}:8000
API_NAMESPACE=int/v1
SOCKETCLUSTER_PATH=/socketcluster/
SOCKETCLUSTER_HOST=${HOST}
SOCKETCLUSTER_SECURE=false
SOCKETCLUSTER_PORT=38000
OSRM_HOST=${OSRM_HOST}
ENV_DEV

cat > "${ENV_DIR}/.env.production" <<ENV_PROD
API_HOST=https://${HOST}:8000
API_NAMESPACE=int/v1
API_SECURE=true
SOCKETCLUSTER_PATH=/socketcluster/
SOCKETCLUSTER_HOST=${HOST}
SOCKETCLUSTER_SECURE=true
SOCKETCLUSTER_PORT=38000
OSRM_HOST=${OSRM_HOST}
ENV_PROD

success "Console configuration files updated"

###############################################################################
# STEP 11 — Start containers
###############################################################################
section "Starting Fleetbase Containers"
echo "  This may take a few minutes on first run..."
docker compose up -d

###############################################################################
# STEP 12 — Wait for database
###############################################################################
section "Waiting for Database"
DB_SERVICE="database"
DB_WAIT_TIMEOUT=90

DB_CONTAINER=$(docker compose ps -q "$DB_SERVICE" 2>/dev/null || true)
if [[ -z "$DB_CONTAINER" ]]; then
  error "Cannot find a running container for service \"$DB_SERVICE\". Check docker-compose.yml."
  exit 1
fi

# Prefer Docker HEALTHCHECK if defined, fall back to mysqladmin ping
if docker inspect -f '{{.State.Health.Status}}' "$DB_CONTAINER" &>/dev/null; then
  SECONDS=0
  until [[ "$(docker inspect -f '{{.State.Health.Status}}' "$DB_CONTAINER")" == "healthy" ]]; do
    if (( SECONDS >= DB_WAIT_TIMEOUT )); then
      error "Timed out waiting for the database to become healthy."
      exit 1
    fi
    sleep 2
  done
  sleep 5  # brief grace period after healthy
else
  SECONDS=0
  until docker compose exec -T "$DB_SERVICE" sh -c "mysqladmin --silent --wait=1 -uroot -h127.0.0.1 ping" &>/dev/null; do
    if (( SECONDS >= DB_WAIT_TIMEOUT )); then
      error "Timed out waiting for the database to accept connections."
      exit 1
    fi
    sleep 2
  done
fi
success "Database is ready"

###############################################################################
# STEP 13 — Run deploy script
###############################################################################
section "Running Deployment Script"
docker compose exec -T application bash -c "./deploy.sh"
docker compose up -d
success "Deployment complete"

###############################################################################
# STEP 14 — Post-install summary
###############################################################################
CONFIGURED_ITEMS=()
SKIPPED_ITEMS=()

[[ "$DB_MODE" == "external" ]] \
  && CONFIGURED_ITEMS+=("External Database") \
  || CONFIGURED_ITEMS+=("Bundled MySQL (secure credentials auto-generated)")

$CONFIG_MAIL \
  && CONFIGURED_ITEMS+=("Mail (${MAIL_MAILER})") \
  || SKIPPED_ITEMS+=("Mail (using log driver — configure later)")

[[ "$FILESYSTEM_DRIVER" != "public" ]] \
  && CONFIGURED_ITEMS+=("File Storage (${FILESYSTEM_DRIVER^^})") \
  || SKIPPED_ITEMS+=("File storage (local disk — not suitable for production)")

CONFIGURED_ITEMS+=("WebSocket security (origins restricted to ${HOST})")

$CONFIG_3P \
  && CONFIGURED_ITEMS+=("Third-party APIs (Maps, Geolocation, SMS)") \
  || SKIPPED_ITEMS+=("Third-party APIs (Maps, Geolocation, SMS)")

echo
printf '%0.s═' {1..60}; echo
echo -e "  ${BOLD}🏁  Fleetbase Installation Complete${RESET}"
printf '%0.s═' {1..60}; echo
echo
echo "  📍  Endpoints"
printf "      API     → %s://%s:8000\n"    "$SCHEME_API"     "$HOST"
printf "      Console → %s://%s:4200\n"   "$SCHEME_CONSOLE" "$HOST"
if [[ ${#CONFIGURED_ITEMS[@]} -gt 0 ]]; then
  echo
  echo "  ✔   Configured:"
  for item in "${CONFIGURED_ITEMS[@]}"; do echo "      • $item"; done
fi
if [[ ${#SKIPPED_ITEMS[@]} -gt 0 ]]; then
  echo
  echo "  ⚠   Skipped (defaults applied):"
  for item in "${SKIPPED_ITEMS[@]}"; do echo "      • $item"; done
fi
echo
echo "  🔐  Next Steps"
echo "      1. Open the Console URL in your browser."
echo "      2. Complete the onboarding wizard to create your"
echo "         initial organization and administrator account."
if [[ ${#SKIPPED_ITEMS[@]} -gt 0 ]]; then
  echo "      3. To configure skipped options, edit"
  echo "         docker-compose.override.yml and run:"
  echo "         docker compose up -d"
fi
echo
echo "  📄  Config saved to: docker-compose.override.yml"
printf '%0.s═' {1..60}; echo
echo
