#!/bin/bash
# Script para Crear Nueva Instancia de Fleetbase con PostgreSQL
# Genera todos los archivos necesarios para una instalación limpia

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 CREAR NUEVA INSTANCIA DE FLEETBASE CON POSTGRESQL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Función para verificar si un puerto está en uso
check_port() {
    local port=$1
    if command -v ss &> /dev/null; then
        # Usar ss (más moderno y rápido)
        ss -tuln | grep -q ":${port} " && return 0 || return 1
    elif command -v netstat &> /dev/null; then
        # Fallback a netstat
        netstat -tuln | grep -q ":${port} " && return 0 || return 1
    elif command -v lsof &> /dev/null; then
        # Fallback a lsof
        lsof -i :${port} &> /dev/null && return 0 || return 1
    else
        # Si no hay herramientas disponibles, intentar conectar al puerto
        timeout 1 bash -c "echo > /dev/tcp/127.0.0.1/${port}" 2>/dev/null && return 0 || return 1
    fi
}

# Función para encontrar el siguiente puerto libre a partir de un puerto base
find_free_port() {
    local base_port=$1
    local max_attempts=${2:-100}
    local current_port=$base_port
    
    for ((i=0; i<max_attempts; i++)); do
        if ! check_port $current_port; then
            echo $current_port
            return 0
        fi
        ((current_port++))
    done
    
    # Si no se encontró puerto libre, devolver el base (el usuario decidirá)
    echo $base_port
    return 1
}

# Función para mostrar estado de un puerto
show_port_status() {
    local port=$1
    local description=$2
    
    if check_port $port; then
        echo -e "   ${RED}✗${NC} Puerto ${port} (${description}): ${RED}OCUPADO${NC}"
        return 1
    else
        echo -e "   ${GREEN}✓${NC} Puerto ${port} (${description}): ${GREEN}LIBRE${NC}"
        return 0
    fi
}

echo -e "${YELLOW}🔍 Analizando puertos del sistema...${NC}"
echo ""

# Verificar puertos comunes
echo -e "${BLUE}Estado de puertos comunes:${NC}"
show_port_status 5432 "PostgreSQL default"
show_port_status 8000 "HTTP default"
show_port_status 8001 "Socket.io default"
echo ""

# Buscar puertos libres sugeridos
echo -e "${YELLOW}🔎 Buscando puertos libres...${NC}"
SUGGESTED_DB_PORT=$(find_free_port 5432)
SUGGESTED_HTTP_PORT=$(find_free_port 8000)
SUGGESTED_CONSOLE_PORT=$(find_free_port 4200)

echo -e "${GREEN}Puertos libres sugeridos:${NC}"
echo -e "   ${BLUE}➜${NC} PostgreSQL: ${GREEN}${SUGGESTED_DB_PORT}${NC}"
echo -e "   ${BLUE}➜${NC} HTTP (API): ${GREEN}${SUGGESTED_HTTP_PORT}${NC}"
echo -e "   ${BLUE}➜${NC} Console (Web UI): ${GREEN}${SUGGESTED_CONSOLE_PORT}${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 Configuración de la nueva instancia${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Función para verificar si hay recursos Docker duplicados
check_docker_duplicates() {
    local instance_name=$1
    local has_duplicates=false
    
    echo -e "${YELLOW}🔍 Verificando recursos Docker existentes para '${instance_name}'...${NC}"
    echo ""
    
    # Verificar contenedores
    local containers=$(docker ps -a --filter "name=${instance_name}" --format "{{.Names}}" 2>/dev/null || true)
    if [ ! -z "$containers" ]; then
        echo -e "${RED}⚠️  Contenedores existentes encontrados:${NC}"
        echo "$containers" | while read container; do
            echo -e "   ${RED}✗${NC} $container"
        done
        has_duplicates=true
        echo ""
    fi
    
    # Verificar imágenes
    local images=$(docker images --filter "reference=*${instance_name}*" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null || true)
    if [ ! -z "$images" ]; then
        echo -e "${RED}⚠️  Imágenes existentes encontradas:${NC}"
        echo "$images" | while read image; do
            echo -e "   ${RED}✗${NC} $image"
        done
        has_duplicates=true
        echo ""
    fi
    
    # Verificar volúmenes
    local volumes=$(docker volume ls --filter "name=${instance_name}" --format "{{.Name}}" 2>/dev/null || true)
    if [ ! -z "$volumes" ]; then
        echo -e "${RED}⚠️  Volúmenes existentes encontrados:${NC}"
        echo "$volumes" | while read volume; do
            echo -e "   ${RED}✗${NC} $volume"
        done
        has_duplicates=true
        echo ""
    fi
    
    if [ "$has_duplicates" = true ]; then
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}ADVERTENCIA: Se encontraron recursos Docker existentes${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${YELLOW}Opciones:${NC}"
        echo -e "  ${BLUE}1)${NC} Limpiar recursos existentes y continuar"
        echo -e "  ${BLUE}2)${NC} Cancelar y usar otro nombre"
        echo ""
        read -p "¿Qué deseas hacer? (1/2): " DUPLICATE_CHOICE
        
        if [ "$DUPLICATE_CHOICE" = "1" ]; then
            echo ""
            echo -e "${YELLOW}🗑️  Limpiando recursos Docker existentes...${NC}"
            
            # Detener y eliminar contenedores
            if [ ! -z "$containers" ]; then
                echo "$containers" | while read container; do
                    docker stop "$container" 2>/dev/null || true
                    docker rm "$container" 2>/dev/null || true
                    echo -e "   ${GREEN}✓${NC} Contenedor eliminado: $container"
                done
            fi
            
            # Eliminar imágenes
            if [ ! -z "$images" ]; then
                echo "$images" | while read image; do
                    docker rmi -f "$image" 2>/dev/null || true
                    echo -e "   ${GREEN}✓${NC} Imagen eliminada: $image"
                done
            fi
            
            # Eliminar volúmenes
            if [ ! -z "$volumes" ]; then
                echo "$volumes" | while read volume; do
                    docker volume rm "$volume" 2>/dev/null || true
                    echo -e "   ${GREEN}✓${NC} Volumen eliminado: $volume"
                done
            fi
            
            echo ""
            echo -e "${GREEN}✅ Recursos Docker limpiados exitosamente${NC}"
            echo ""
            return 0
        else
            echo -e "${RED}❌ Operación cancelada${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ No se encontraron recursos Docker duplicados${NC}"
        echo ""
        return 0
    fi
}

# Solicitar información de la nueva instancia
read -p "📁 Nombre del directorio de la nueva instancia: " INSTANCE_NAME

# Verificar duplicados de Docker
check_docker_duplicates "$INSTANCE_NAME"
read -p "🗄️  Nombre de la base de datos [fleetbase_${INSTANCE_NAME}]: " DB_NAME
DB_NAME=${DB_NAME:-fleetbase_${INSTANCE_NAME}}
read -p "👤 Usuario de PostgreSQL [fleetbase]: " DB_USER
DB_USER=${DB_USER:-fleetbase}
read -p "🔑 Contraseña de PostgreSQL [fleetbase]: " DB_PASS
DB_PASS=${DB_PASS:-fleetbase}

# Puerto interno de PostgreSQL (SIEMPRE debe ser 5432 - no modificable)
DB_INTERNAL_PORT=5432
echo ""
echo -e "${BLUE}ℹ️  Puerto interno de PostgreSQL: ${GREEN}5432${NC} ${YELLOW}(fijo - requerido para la comunicación interna)${NC}"
echo ""

# Solicitar puerto externo de PostgreSQL con validación
while true; do
    read -p "🔌 Puerto externo de PostgreSQL (para acceso desde host) [${SUGGESTED_DB_PORT}]: " DB_PORT
    DB_PORT=${DB_PORT:-$SUGGESTED_DB_PORT}
    
    if check_port $DB_PORT; then
        echo -e "${RED}⚠️  ADVERTENCIA: El puerto ${DB_PORT} está ocupado${NC}"
        read -p "¿Deseas usar este puerto de todos modos? (s/n): " USE_ANYWAY
        if [ "$USE_ANYWAY" = "s" ]; then
            echo -e "${YELLOW}⚠️  Usando puerto ${DB_PORT} (puede causar conflictos)${NC}"
            break
        fi
    else
        echo -e "${GREEN}✓ Puerto ${DB_PORT} disponible${NC}"
        break
    fi
done

while true; do
    read -p "🌐 Puerto HTTP [${SUGGESTED_HTTP_PORT}]: " HTTP_PORT
    HTTP_PORT=${HTTP_PORT:-$SUGGESTED_HTTP_PORT}
    
    if check_port $HTTP_PORT; then
        echo -e "${RED}⚠️  ADVERTENCIA: El puerto ${HTTP_PORT} está ocupado${NC}"
        read -p "¿Deseas usar este puerto de todos modos? (s/n): " USE_ANYWAY
        if [ "$USE_ANYWAY" = "s" ]; then
            echo -e "${YELLOW}⚠️  Usando puerto ${HTTP_PORT} (puede causar conflictos)${NC}"
            break
        fi
    else
        echo -e "${GREEN}✓ Puerto ${HTTP_PORT} disponible${NC}"
        break
    fi
done

while true; do
    read -p "🔗 Puerto Console (Web UI) [${SUGGESTED_CONSOLE_PORT}]: " CONSOLE_PORT
    CONSOLE_PORT=${CONSOLE_PORT:-$SUGGESTED_CONSOLE_PORT}
    
    if check_port $CONSOLE_PORT; then
        echo -e "${RED}⚠️  ADVERTENCIA: El puerto ${CONSOLE_PORT} está ocupado${NC}"
        read -p "¿Deseas usar este puerto de todos modos? (s/n): " USE_ANYWAY
        if [ "$USE_ANYWAY" = "s" ]; then
            echo -e "${YELLOW}⚠️  Usando puerto ${CONSOLE_PORT} (puede causar conflictos)${NC}"
            break
        fi
    else
        echo -e "${GREEN}✓ Puerto ${CONSOLE_PORT} disponible${NC}"
        break
    fi
done

# Directorio de destino
DEST_DIR="/mnt/g/Users/GAMEMAX/Documents/CREAI/${INSTANCE_NAME}"

echo ""
echo -e "${YELLOW}📋 Configuración de la nueva instancia:${NC}"
echo -e "${GREEN}   Directorio: ${DEST_DIR}${NC}"
echo -e "${GREEN}   Base de datos: ${DB_NAME}${NC}"
echo -e "${GREEN}   Usuario: ${DB_USER}${NC}"
echo -e "${GREEN}   Puerto DB (externo/host): ${DB_PORT}${NC}"
echo -e "${BLUE}   Puerto DB (interno): ${DB_INTERNAL_PORT} (fijo)${NC}"
echo -e "${GREEN}   Puerto HTTP (API): ${HTTP_PORT}${NC}"
echo -e "${GREEN}   Puerto Console (Web): ${CONSOLE_PORT}${NC}"
echo ""
read -p "¿Continuar? (s/n): " CONFIRM
if [ "$CONFIRM" != "s" ]; then
    echo "Cancelado."
    exit 0
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📦 1/8: Clonando repositorio de Fleetbase...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mkdir -p "$DEST_DIR"
cd "$DEST_DIR"

if [ ! -d ".git" ]; then
    git clone https://github.com/fleetbase/fleetbase.git .
    echo -e "${GREEN}✅ Repositorio clonado${NC}"
else
    echo -e "${YELLOW}⚠️  Repositorio ya existe${NC}"
fi
echo ""

# Crear estructura de directorios necesaria
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📂 2/8: Creando estructura de directorios...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mkdir -p docker/database
mkdir -p scripts
mkdir -p api/config

echo -e "${GREEN}✅ Estructura creada${NC}"
echo ""

# Crear Dockerfile.pgsql
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🐳 3/8: Creando Dockerfile.pgsql...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat > docker/Dockerfile.pgsql << 'DOCKERFILE_EOF'
FROM fleetbase/fleetbase-api:latest

# Instalar dependencias para PostgreSQL
RUN apt-get update && \
    apt-get install -y libpq-dev && \
    docker-php-ext-install pdo_pgsql pgsql && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verificar instalación
RUN php -m | grep pdo_pgsql
DOCKERFILE_EOF

echo -e "${GREEN}✅ Dockerfile.pgsql creado${NC}"
echo ""

# Crear script de inicialización de PostGIS
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🗄️  4/8: Creando script de PostGIS...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat > docker/database/01-enable-postgis.sql << 'POSTGIS_EOF'
-- Habilitar extensión PostGIS para soporte geoespacial
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verificar instalación
SELECT PostGIS_Version();
POSTGIS_EOF

echo -e "${GREEN}✅ Script PostGIS creado${NC}"
echo ""

# Crear docker-compose.override.yml
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚙️  5/8: Creando docker-compose.override.yml...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat > docker-compose.override.yml << OVERRIDE_EOF
services:
  cache:
    restart: unless-stopped

  database:
    image: postgis/postgis:16-3.4-alpine
    restart: unless-stopped
    ports:
      - "${DB_PORT}:5432"
    volumes:
      - "./docker/database/:/docker-entrypoint-initdb.d/"
      - ${INSTANCE_NAME}_postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: "${DB_USER}"
      POSTGRES_PASSWORD: "${DB_PASS}"
      POSTGRES_DB: "${DB_NAME}"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  socket:
    restart: unless-stopped

  scheduler:
    build:
      context: .
      dockerfile: docker/Dockerfile.pgsql
    image: ${INSTANCE_NAME}-fleetbase-application-pgsql:latest
    restart: unless-stopped
    environment:
      DB_CONNECTION: "pgsql"
      DB_HOST: "database"
      DB_PORT: "${DB_INTERNAL_PORT}"
      DB_DATABASE: "${DB_NAME}"
      DB_USERNAME: "${DB_USER}"
      DB_PASSWORD: "${DB_PASS}"
      DATABASE_URL: "pgsql://${DB_USER}:${DB_PASS}@database:${DB_INTERNAL_PORT}/${DB_NAME}"
      PHP_MEMORY_LIMIT: "2G"

  queue:
    build:
      context: .
      dockerfile: docker/Dockerfile.pgsql
    image: ${INSTANCE_NAME}-fleetbase-application-pgsql:latest
    restart: unless-stopped
    environment:
      DB_CONNECTION: "pgsql"
      DB_HOST: "database"
      DB_PORT: "${DB_INTERNAL_PORT}"
      DB_DATABASE: "${DB_NAME}"
      DB_USERNAME: "${DB_USER}"
      DB_PASSWORD: "${DB_PASS}"
      DATABASE_URL: "pgsql://${DB_USER}:${DB_PASS}@database:${DB_INTERNAL_PORT}/${DB_NAME}"
      PHP_MEMORY_LIMIT: "2G"

  console:
    restart: unless-stopped
    ports:
      - "${CONSOLE_PORT}:4200"

  application:
    build:
      context: .
      dockerfile: docker/Dockerfile.pgsql
    image: ${INSTANCE_NAME}-fleetbase-application-pgsql:latest
    restart: unless-stopped
    volumes:
      - "./api/config/database.php:/fleetbase/api/config/database.php"
      - "./api/app/Providers/RouteServiceProvider.php:/fleetbase/api/app/Providers/RouteServiceProvider.php"
    environment:
      DB_CONNECTION: "pgsql"
      DB_HOST: "database"
      DB_PORT: "${DB_INTERNAL_PORT}"
      DB_DATABASE: "${DB_NAME}"
      DB_USERNAME: "${DB_USER}"
      DB_PASSWORD: "${DB_PASS}"
      DATABASE_URL: "pgsql://${DB_USER}:${DB_PASS}@database:${DB_INTERNAL_PORT}/${DB_NAME}"
      PHP_MEMORY_LIMIT: "2G"
      APP_KEY: "base64:$(openssl rand -base64 32)"
      CONSOLE_HOST: "http://localhost:${CONSOLE_PORT}"
      FRONTEND_HOSTS: "http://localhost:${CONSOLE_PORT},http://localhost:${HTTP_PORT}"
      ENVIRONMENT: "dev"
      APP_DEBUG: "true"

  httpd:
    restart: unless-stopped
    ports:
      - "${HTTP_PORT}:80"
    environment:
      FRONTEND_HOSTS: "http://localhost:${CONSOLE_PORT},http://localhost:${HTTP_PORT}"

volumes:
  ${INSTANCE_NAME}_postgres_data:
    driver: local
OVERRIDE_EOF

echo -e "${GREEN}✅ docker-compose.override.yml creado${NC}"
echo ""

# Crear api/.env
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔧 6/8: Creando api/.env...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

APP_KEY="base64:$(openssl rand -base64 32)"

cat > api/.env << ENV_EOF
APP_NAME=Fleetbase
APP_ENV=local
APP_KEY=${APP_KEY}
APP_DEBUG=true
APP_URL=http://localhost:${HTTP_PORT}

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=pgsql
DB_HOST=database
DB_PORT=${DB_INTERNAL_PORT}
DB_DATABASE=${DB_NAME}
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASS}

BROADCAST_DRIVER=log
CACHE_DRIVER=redis
FILESYSTEM_DISK=local
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120

MEMCACHED_HOST=cache

REDIS_HOST=cache
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@fleetbase.io"
MAIL_FROM_NAME="\${APP_NAME}"

CONSOLE_HOST=http://localhost:${CONSOLE_PORT}
STOREFRONT_HOST=http://localhost:${CONSOLE_PORT}
FRONTEND_HOSTS=http://localhost:${CONSOLE_PORT},http://localhost:${HTTP_PORT}

SOCKET_HOST=socket
SOCKET_PORT=6001
SOCKET_SERVER=http://socket:6001

OSRM_HOST=http://router.project-osrm.org
ENV_EOF

echo -e "${GREEN}✅ api/.env creado${NC}"
echo ""

# Crear api/config/database.php
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 7/8: Creando api/config/database.php...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat > api/config/database.php << 'DATABASE_EOF'
<?php

use Illuminate\Support\Str;

return [
    'default' => env('DB_CONNECTION', 'pgsql'),

    'connections' => [
        'sqlite' => [
            'driver' => 'sqlite',
            'url' => env('DATABASE_URL'),
            'database' => env('DB_DATABASE', database_path('database.sqlite')),
            'prefix' => '',
            'foreign_key_constraints' => env('DB_FOREIGN_KEYS', true),
        ],

        'mysql' => [
            'driver' => 'mysql',
            'url' => env('DATABASE_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'forge'),
            'username' => env('DB_USERNAME', 'forge'),
            'password' => env('DB_PASSWORD', ''),
            'unix_socket' => env('DB_SOCKET', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
            'options' => extension_loaded('pdo_mysql') ? array_filter([
                PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA'),
            ]) : [],
        ],

        'pgsql' => [
            'driver' => 'pgsql',
            'url' => env('DATABASE_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'forge'),
            'username' => env('DB_USERNAME', 'forge'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'prefer',
        ],

        'sqlsrv' => [
            'driver' => 'sqlsrv',
            'url' => env('DATABASE_URL'),
            'host' => env('DB_HOST', 'localhost'),
            'port' => env('DB_PORT', '1433'),
            'database' => env('DB_DATABASE', 'forge'),
            'username' => env('DB_USERNAME', 'forge'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
        ],
    ],

    'migrations' => 'migrations',

    'redis' => [
        'client' => env('REDIS_CLIENT', 'phpredis'),

        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => env('REDIS_PREFIX', Str::slug(env('APP_NAME', 'laravel'), '_').'_database_'),
        ],

        'default' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_DB', '0'),
        ],

        'cache' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_CACHE_DB', '1'),
        ],
    ],
];
DATABASE_EOF

echo -e "${GREEN}✅ api/config/database.php creado${NC}"
echo ""

# Copiar archivos del API desde repo principal
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📦 8/9: Copiando archivos del API desde repo principal...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SOURCE_API="/mnt/g/Users/GAMEMAX/Documents/CREAI/fleetbase-repo/api"

if [ -d "$SOURCE_API/app/Providers" ]; then
    echo -e "${YELLOW}   Copiando RouteServiceProvider...${NC}"
    mkdir -p api/app/Providers
    cp "$SOURCE_API/app/Providers/RouteServiceProvider.php" api/app/Providers/ 2>/dev/null && \
        echo -e "      ${GREEN}✓${NC} RouteServiceProvider.php (con ruta 2FA)" || \
        echo -e "      ${YELLOW}⚠${NC}  No se pudo copiar RouteServiceProvider.php"
fi

if [ -d "$SOURCE_API/app/Http/Controllers" ]; then
    echo -e "${YELLOW}   Copiando TwoFactorController...${NC}"
    mkdir -p api/app/Http/Controllers
    cp "$SOURCE_API/app/Http/Controllers/TwoFactorController.php" api/app/Http/Controllers/ 2>/dev/null && \
        echo -e "      ${GREEN}✓${NC} TwoFactorController.php" || \
        echo -e "      ${YELLOW}⚠${NC}  No se pudo copiar TwoFactorController.php"
fi

echo -e "${GREEN}✅ Archivos del API copiados${NC}"
echo ""

# Copiar scripts de migración desde instancia actual
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔧 9/9: Copiando TODOS los scripts desde instancia principal...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SOURCE_SCRIPTS="/mnt/g/Users/GAMEMAX/Documents/CREAI/fleetbase-repo/scripts"

if [ -d "$SOURCE_SCRIPTS" ]; then
    echo -e "${YELLOW}   Copiando TODA la carpeta scripts/...${NC}"
    
    # Copiar todos los archivos de la carpeta scripts
    cp -r "$SOURCE_SCRIPTS"/* scripts/ 2>/dev/null || true
    
    # Dar permisos de ejecución a todos los scripts .sh
    chmod +x scripts/*.sh 2>/dev/null || true
    
    # Contar scripts copiados por tipo
    SCRIPTS_SH=$(find scripts -name "*.sh" -type f 2>/dev/null | wc -l)
    SCRIPTS_PHP=$(find scripts -name "*.php" -type f 2>/dev/null | wc -l)
    SCRIPTS_SQL=$(find scripts -name "*.sql" -type f 2>/dev/null | wc -l)
    SCRIPTS_PY=$(find scripts -name "*.py" -type f 2>/dev/null | wc -l)
    TOTAL_SCRIPTS=$(find scripts -type f 2>/dev/null | wc -l)
    
    echo ""
    echo -e "${GREEN}✅ Scripts copiados exitosamente:${NC}"
    echo -e "   ${BLUE}➜${NC} Scripts shell (.sh):   ${SCRIPTS_SH}"
    echo -e "   ${BLUE}➜${NC} Scripts PHP (.php):    ${SCRIPTS_PHP}"
    echo -e "   ${BLUE}➜${NC} Scripts SQL (.sql):    ${SCRIPTS_SQL}"
    echo -e "   ${BLUE}➜${NC} Scripts Python (.py):  ${SCRIPTS_PY}"
    echo -e "   ${BLUE}➜${NC} ${GREEN}Total de archivos:     ${TOTAL_SCRIPTS}${NC}"
    
    echo ""
    echo -e "${YELLOW}   Scripts principales incluidos:${NC}"
    [ -f "scripts/master-fix-pgsql.sh" ] && echo -e "      ${GREEN}✓${NC} master-fix-pgsql.sh"
    [ -f "scripts/run-migrations-no-artisan.php" ] && echo -e "      ${GREEN}✓${NC} run-migrations-no-artisan.php"
    [ -f "scripts/create-all-tables-sql.php" ] && echo -e "      ${GREEN}✓${NC} create-all-tables-sql.php"
    [ -f "scripts/seed-basic-data.sh" ] && echo -e "      ${GREEN}✓${NC} seed-basic-data.sh"
    [ -f "scripts/create-permissions.sh" ] && echo -e "      ${GREEN}✓${NC} create-permissions.sh"
    [ -f "scripts/run-create-essential-tables.sh" ] && echo -e "      ${GREEN}✓${NC} run-create-essential-tables.sh"
    [ -f "scripts/auto-fix-migrations.sh" ] && echo -e "      ${GREEN}✓${NC} auto-fix-migrations.sh"
    [ -f "scripts/ultra-fix-uuid.sh" ] && echo -e "      ${GREEN}✓${NC} ultra-fix-uuid.sh"
else
    echo -e "${YELLOW}⚠️  No se encontró la carpeta scripts de origen${NC}"
    echo -e "${YELLOW}   Generando scripts mínimos necesarios...${NC}"
    
    # Crear script maestro mínimo si no existe la carpeta fuente
    cat > scripts/master-fix-pgsql.sh << 'MASTER_SCRIPT_EOF'
#!/bin/bash
# Script Maestro para Aplicar Correcciones PostgreSQL a Migraciones

set -e

echo "🔧 Aplicando correcciones PostgreSQL a migraciones..."
echo ""

# Restaurar backups si existen
sudo docker compose exec -T application bash -c '
find /fleetbase/api -name "*.php.backup" -type f | while read backup; do
    original="${backup%.backup}"
    if [ -f "$backup" ]; then
        cp "$backup" "$original"
        echo "  ✓ Restaurado: $(basename "$original")"
    fi
done
'

echo ""
echo "🔄 Convirtiendo tipos UUID..."

# Convertir TODAS las columnas UUID de string/char a uuid nativo
sudo docker compose exec -T application bash -c "
    find /fleetbase/api -type f -name '*.php' -path '*/migrations/*' -not -name '*.backup' | while read file; do
        # Backup
        cp \"\$file\" \"\${file}.backup\" 2>/dev/null || true
        
        # Convertir cualquier columna que contenga 'uuid' en su nombre
        perl -i -pe 's/->(?:char|string)\('\'\'([^'\'']*uuid[^'\'']*?)'\''(?:,\s*\d+)?\)/->uuid('\''\$1'\'')/g' \"\$file\"
    done
    echo '✅ Conversión UUID completada'
"

echo ""
echo "✅ Correcciones aplicadas"
echo ""
echo "🚀 Ejecutando migraciones..."
sudo docker compose exec application php artisan migrate:fresh --force
MASTER_SCRIPT_EOF
    
    chmod +x scripts/master-fix-pgsql.sh
    echo -e "${GREEN}✅ Script maestro mínimo creado${NC}"
fi

echo ""

# Crear script de inicio
echo -e "${YELLOW}📝 Creando script de inicio...${NC}"

cat > start.sh << START_EOF
#!/bin/bash
# Script de Inicio de Instancia Fleetbase PostgreSQL

# Variables de configuración
DB_USER="${DB_USER}"
HTTP_PORT="${HTTP_PORT}"
CONSOLE_PORT="${CONSOLE_PORT}"

echo "🚀 Iniciando Fleetbase con PostgreSQL..."
echo ""

# Limpiar imágenes duplicadas antes de construir
echo "🧹 Limpiando imágenes Docker duplicadas..."
docker images | grep "${INSTANCE_NAME}-fleetbase-application-pgsql" | awk '{print \$3}' | xargs -r docker rmi -f 2>/dev/null || true
echo ""

# Construir imágenes si es necesario
if [ "\$1" = "--build" ]; then
    echo "🏗️  Construyendo imágenes Docker..."
    sudo docker compose build --no-cache
    echo ""
fi

# Iniciar servicios
echo "▶️  Iniciando servicios..."
sudo docker compose up -d

echo ""
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 30

# Verificar estado
echo ""
echo "📊 Estado de los servicios:"
sudo docker compose ps

echo ""
echo "🗄️  Estado de la base de datos:"
sudo docker compose exec -T database pg_isready -U \${DB_USER}

echo ""
echo "✅ Fleetbase iniciado"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Ejecutar migraciones: sudo docker compose exec application php artisan migrate --force"
echo "   2. Aplicar fixes PostgreSQL: bash scripts/master-fix-pgsql.sh"
echo "   3. Sembrar datos: sudo docker compose exec application php artisan fleetbase:seed"
echo ""
echo "🌐 Acceso:"
echo "   - Aplicación: http://localhost:\${HTTP_PORT}"
echo "   - Consola: http://localhost:\${CONSOLE_PORT}"
echo ""
START_EOF

chmod +x start.sh

echo -e "${GREEN}✅ Script de inicio creado${NC}"
echo ""

# Crear fleetbase.config.json para el console
echo -e "${YELLOW}🔧 Creando console/fleetbase.config.json...${NC}"

cat > console/fleetbase.config.json << CONSOLE_CONFIG_EOF
{
  "API_HOST": "http://localhost:${HTTP_PORT}",
  "SOCKETCLUSTER_HOST": "localhost",
  "SOCKETCLUSTER_PORT": "38000",
  "SOCKETCLUSTER_SECURE": "false"
}
CONSOLE_CONFIG_EOF

echo -e "${GREEN}✅ console/fleetbase.config.json creado con puerto ${HTTP_PORT}${NC}"
echo ""

# Crear README para la instancia
cat > README-INSTANCE.md << README_EOF
# Instancia Fleetbase con PostgreSQL

## Información de la Instancia

- **Nombre**: ${INSTANCE_NAME}
- **Base de datos**: ${DB_NAME}
- **Usuario DB**: ${DB_USER}
- **Puerto PostgreSQL (externo/host)**: ${DB_PORT}
- **Puerto PostgreSQL (interno)**: ${DB_INTERNAL_PORT} (fijo - no modificar)
- **Puerto HTTP (API)**: ${HTTP_PORT}
- **Puerto Console (Web)**: ${CONSOLE_PORT}

### Nota sobre Puertos de PostgreSQL

- **Puerto externo (${DB_PORT})**: Es el puerto que se expone en tu máquina host para acceder a PostgreSQL desde fuera de Docker
- **Puerto interno (${DB_INTERNAL_PORT})**: Es el puerto fijo (5432) que PostgreSQL usa dentro de la red Docker. Los contenedores usan este puerto para comunicarse entre sí

⚠️ **IMPORTANTE**: El puerto interno siempre debe ser 5432. No lo modifiques en las variables de entorno.

## Archivos Creados

\`\`\`
${INSTANCE_NAME}/
├── docker/
│   ├── Dockerfile.pgsql              # Imagen personalizada con pdo_pgsql
│   └── database/
│       └── 01-enable-postgis.sql     # Habilita PostGIS
├── api/
│   ├── .env                          # Variables de entorno
│   └── config/
│       └── database.php              # Configuración PostgreSQL
├── console/
│   └── fleetbase.config.json         # Configuración del frontend con puerto ${HTTP_PORT}
├── scripts/                          # Scripts de migración y mantenimiento
│   ├── master-fix-pgsql.sh          # Script maestro de correcciones
│   ├── seed-basic-data.sh           # Sembrar datos iniciales
│   ├── create-permissions.sh        # Crear permisos completos
│   ├── run-create-essential-tables.sh # Crear tablas con SQL directo
│   └── [otros scripts auxiliares]
├── docker-compose.override.yml       # Override con PostgreSQL
├── start.sh                          # Script de inicio
└── README-INSTANCE.md                # Este archivo
\`\`\`

## Inicio Rápido

### 1. Construir e Iniciar

\`\`\`bash
cd ${DEST_DIR}
bash start.sh --build
\`\`\`

### 2. Ejecutar Migraciones y Setup

\`\`\`bash
# Aplicar correcciones PostgreSQL y ejecutar migraciones
bash scripts/master-fix-pgsql.sh
\`\`\`

### 3. Sembrar Datos Iniciales

\`\`\`bash
# Sembrar datos básicos (usuario admin, roles, permisos básicos)
bash scripts/seed-basic-data.sh

# Crear permisos completos del sistema
bash scripts/create-permissions.sh
\`\`\`

### Credenciales por Defecto

Después de ejecutar el seeding:

- **Email**: admin@fleetbase.local
- **Password**: password

⚠️ **IMPORTANTE**: Cambiar la contraseña después del primer login en producción.

## Comandos Útiles

### Gestión de Contenedores

\`\`\`bash
# Ver logs en tiempo real
docker compose logs -f

# Ver logs de aplicación específicamente
docker compose logs -f application

# Estado de servicios
docker compose ps

# Reiniciar servicios
docker compose restart

# Detener servicios
docker compose down

# Detener y eliminar volúmenes (⚠️ elimina los datos)
docker compose down -v
\`\`\`

### Base de Datos PostgreSQL

\`\`\`bash
# Acceder a PostgreSQL
docker compose exec database psql -U ${DB_USER} -d ${DB_NAME}

# Ver todas las tablas
docker compose exec database psql -U ${DB_USER} -d ${DB_NAME} -c '\dt'

# Ver estado de migraciones
docker compose exec database psql -U ${DB_USER} -d ${DB_NAME} -c 'SELECT * FROM migrations'

# Ver usuarios creados
docker compose exec database psql -U ${DB_USER} -d ${DB_NAME} -c 'SELECT id, name, email FROM users'

# Ver permisos
docker compose exec database psql -U ${DB_USER} -d ${DB_NAME} -c 'SELECT COUNT(*) FROM permissions'
\`\`\`

### Scripts Disponibles

\`\`\`bash
# Ejecutar migraciones con correcciones
bash scripts/master-fix-pgsql.sh

# Sembrar datos básicos
bash scripts/seed-basic-data.sh

# Crear permisos completos
bash scripts/create-permissions.sh

# Crear tablas manualmente (si las migraciones fallan)
bash scripts/run-create-essential-tables.sh
\`\`\`

## Acceso

- **API Backend**: http://localhost:${HTTP_PORT}
- **Consola Web**: http://localhost:${CONSOLE_PORT}
- **Health Check**: http://localhost:${HTTP_PORT}/health

## Características PostgreSQL

✅ **PostGIS habilitado** para funciones geoespaciales
✅ **UUID nativo** para identificadores
✅ **Migraciones corregidas** automáticamente para PostgreSQL
✅ **Extensión pdo_pgsql** instalada en imagen custom
✅ **Scripts sin Artisan** para máxima compatibilidad

## Scripts Incluidos

### Scripts Principales (Corregidos para Docker)

1. **master-fix-pgsql.sh**: Script maestro que:
   - Detecta credenciales del .env automáticamente
   - Aplica correcciones a migraciones
   - Ejecuta migraciones de forma segura
   - Muestra resumen completo de acceso

2. **seed-basic-data.sh**: Siembra datos iniciales:
   - Usuario administrador
   - Roles básicos (Administrator, Manager, User)
   - Permisos básicos
   - Compañía por defecto
   - Se ejecuta desde el HOST usando Docker

3. **create-permissions.sh**: Crea permisos completos:
   - Permisos por módulo (users, companies, files, etc.)
   - Permisos especiales del sistema
   - Asigna todos los permisos a Administrator
   - Se ejecuta desde el HOST usando Docker

4. **run-create-essential-tables.sh**: Crea tablas con SQL directo:
   - Útil si las migraciones Laravel fallan
   - Crea ~60+ tablas esenciales
   - Habilita extensiones PostgreSQL (uuid-ossp, postgis)
   - Registra migraciones en la tabla migrations

### Características de los Scripts

✅ **Detección automática de Docker** (con/sin sudo)
✅ **Validación de contenedores** antes de ejecutar
✅ **Lectura automática de credenciales** desde api/.env
✅ **Mensajes con colores** para mejor visualización
✅ **Manejo de errores robusto**
✅ **Se ejecutan desde el HOST** (no necesitan estar dentro del contenedor)

## Troubleshooting

### Error: Cannot find driver

Asegúrate de que la imagen custom esté construida:

\`\`\`bash
docker compose build application scheduler queue
\`\`\`

### Error: PostGIS no encontrado

Verifica que el script de inicialización se ejecutó:

\`\`\`bash
docker compose exec database psql -U ${DB_USER} -d ${DB_NAME} -c "SELECT PostGIS_Version();"
\`\`\`

### Errores de migración

Ejecuta el script de correcciones:

\`\`\`bash
bash scripts/master-fix-pgsql.sh
\`\`\`

Si las migraciones continúan fallando, crea las tablas manualmente:

\`\`\`bash
bash scripts/run-create-essential-tables.sh
\`\`\`

### Error: php: command not found (al ejecutar scripts)

Los scripts han sido corregidos para ejecutarse **desde el HOST** usando Docker.
NO necesitas ejecutarlos dentro del contenedor.

\`\`\`bash
# ✅ CORRECTO - desde el host
bash scripts/seed-basic-data.sh

# ❌ INCORRECTO - ya no es necesario
docker compose exec application bash scripts/seed-basic-data.sh
\`\`\`

### Los contenedores no inician

Verifica que los puertos estén libres:

\`\`\`bash
# Verificar puerto PostgreSQL
lsof -i :${DB_PORT}

# Verificar puerto HTTP
lsof -i :${HTTP_PORT}

# Verificar puerto Console
lsof -i :${CONSOLE_PORT}
\`\`\`

## Notas Importantes

- Esta instancia usa **PostgreSQL 16** con **PostGIS 3.4**
- Los datos se almacenan en el volumen Docker \`${INSTANCE_NAME}_postgres_data\`
- La imagen de la aplicación se llama \`${INSTANCE_NAME}-fleetbase-application-pgsql:latest\`
- Todos los scripts están diseñados para ejecutarse desde el directorio raíz del proyecto
- Los scripts detectan automáticamente la configuración desde \`api/.env\`
- **IMPORTANTE**: El archivo \`console/fleetbase.config.json\` ha sido configurado con el puerto ${HTTP_PORT}
  - Este archivo es leído por el frontend y debe coincidir con el puerto HTTP de la API
  - Si cambias el puerto HTTP más tarde, también debes actualizar este archivo

## Flujo Completo de Instalación

\`\`\`bash
# 1. Ir al directorio de la instancia
cd ${DEST_DIR}

# 2. Construir e iniciar contenedores
bash start.sh --build

# 3. Esperar ~30 segundos para que PostgreSQL esté listo

# 4. Ejecutar migraciones
bash scripts/master-fix-pgsql.sh

# 5. Sembrar datos iniciales
bash scripts/seed-basic-data.sh

# 6. Crear permisos completos (opcional pero recomendado)
bash scripts/create-permissions.sh

# 7. Acceder a la aplicación
# http://localhost:${HTTP_PORT}
# Email: admin@fleetbase.local
# Password: password
\`\`\`

---

**Creado**: $(date +"%Y-%m-%d %H:%M:%S")
**Versión PostgreSQL**: 16 con PostGIS 3.4
**Scripts Version**: 2.0 (Corregidos para Docker)
README_EOF

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ ¡INSTANCIA CREADA EXITOSAMENTE!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📁 Ubicación: ${DEST_DIR}${NC}"
echo ""
echo -e "${GREEN}✅ Archivos de configuración creados:${NC}"
echo -e "   ${BLUE}➜${NC} api/.env (Puerto HTTP: ${HTTP_PORT})"
echo -e "   ${BLUE}➜${NC} console/fleetbase.config.json (API_HOST: http://localhost:${HTTP_PORT})"
echo -e "   ${BLUE}➜${NC} docker-compose.override.yml"
echo ""
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo -e "${GREEN}   1. cd ${DEST_DIR}${NC}"
echo -e "${GREEN}   2. bash start.sh --build${NC}"
echo -e "${GREEN}   3. bash scripts/master-fix-pgsql.sh${NC}"
echo -e "${GREEN}   4. sudo docker compose exec application php artisan fleetbase:seed${NC}"
echo ""
echo -e "${YELLOW}🌐 Acceso:${NC}"
echo -e "${GREEN}   - HTTP: http://localhost:${HTTP_PORT}${NC}"
echo -e "${GREEN}   - Console: http://localhost:${CONSOLE_PORT}${NC}"
echo ""
echo -e "${YELLOW}💡 Nota importante sobre puertos:${NC}"
echo -e "   El frontend (console) ya está configurado para usar el puerto ${HTTP_PORT}"
echo -e "   Si cambias el puerto HTTP más tarde, también debes actualizar:"
echo -e "   - api/.env (APP_URL)"
echo -e "   - console/fleetbase.config.json (API_HOST)"
echo ""
echo -e "${YELLOW}📖 Documentación completa: ${DEST_DIR}/README-INSTANCE.md${NC}"
echo ""

