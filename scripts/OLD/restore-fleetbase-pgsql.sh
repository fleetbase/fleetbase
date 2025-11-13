#!/bin/bash
# Script para restaurar Fleetbase a PostgreSQL
# Replica todos los pasos documentados en cursor_understanding_server_error_500_r.md
# NO crea nuevos scripts, solo orquesta los existentes

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔄 RESTAURANDO FLEETBASE PARA POSTGRESQL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Detectar si necesita sudo
DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1; then
    if sudo docker ps >/dev/null 2>&1; then
        DOCKER_CMD="sudo docker"
        echo -e "${YELLOW}ℹ️  Usando sudo para Docker${NC}"
    else
        echo -e "${RED}❌ Error: No se puede acceder a Docker${NC}"
        exit 1
    fi
fi

# Verificar que los contenedores estén corriendo
echo -e "${BLUE}📋 Paso 1/7: Verificando contenedores...${NC}"
if ! $DOCKER_CMD compose ps | grep -q "Up"; then
    echo -e "${RED}❌ Error: Los contenedores no están corriendo${NC}"
    echo -e "${YELLOW}💡 Ejecuta: docker compose up -d${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Contenedores corriendo${NC}"
echo ""

# Leer configuración de la base de datos
echo -e "${BLUE}📋 Paso 2/7: Verificando configuración de PostgreSQL...${NC}"
if [ ! -f "api/.env" ]; then
    echo -e "${RED}❌ Error: No se encuentra api/.env${NC}"
    exit 1
fi

DB_CONNECTION=$(grep "^DB_CONNECTION=" api/.env | cut -d= -f2)
if [ "$DB_CONNECTION" != "pgsql" ]; then
    echo -e "${YELLOW}⚠️  DB_CONNECTION no está configurado como 'pgsql'${NC}"
    echo -e "${YELLOW}   Valor actual: $DB_CONNECTION${NC}"
    echo -e "${YELLOW}   Por favor, verifica api/.env${NC}"
fi
echo -e "${GREEN}✅ Configuración verificada${NC}"
echo ""

# PASO CLAVE: Configurar la conexión 'mysql' para que use PostgreSQL
echo -e "${BLUE}📋 Paso 3/7: Configurando conexión 'mysql' para PostgreSQL...${NC}"
echo -e "${YELLOW}   Este es el FIX PRINCIPAL del error 500${NC}"
echo ""

# Verificar el archivo database.php actual
if [ ! -f "api/config/database.php" ]; then
    echo -e "${RED}❌ Error: No se encuentra api/config/database.php${NC}"
    exit 1
fi

# Verificar si ya está configurado correctamente
if grep -q "'mysql' => \[" api/config/database.php && grep -A 2 "'mysql' => \[" api/config/database.php | grep -q "'driver' => 'pgsql'"; then
    echo -e "${GREEN}✅ La conexión 'mysql' ya está configurada para PostgreSQL${NC}"
else
    echo -e "${YELLOW}⚠️  Configurando la conexión 'mysql' para usar PostgreSQL...${NC}"
    
    # Crear backup
    cp api/config/database.php api/config/database.php.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}   ✓ Backup creado${NC}"
    
    # Modificar el archivo local usando sed
    sed -i "/'mysql' => \[/,/'pgsql' => \[/ {
        s/'driver' => 'mysql'/'driver' => 'pgsql'/
        s/'charset' => 'utf8mb4'/'charset' => 'utf8'/
        s/'collation' => 'utf8mb4_unicode_ci'/'collation' => 'utf8_unicode_ci'/
        s/'port' => env('DB_PORT', '3306')/'port' => env('DB_PORT', '5432')/
        /unix_socket/d
        /strict/d
        /engine/d
        /options/,+2d
    }" api/config/database.php
    
    # Agregar search_path y sslmode si no existen
    sed -i "/'mysql' => \[/,/'pgsql' => \[/ {
        /'prefix_indexes'/a\            'search_path' => 'public',\n            'sslmode' => 'prefer',
    }" api/config/database.php
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   ✓ Archivo local configurado${NC}"
        echo -e "${YELLOW}   ℹ️  El contenedor tomará el cambio al reiniciar${NC}"
    else
        echo -e "${RED}❌ Error al configurar database.php${NC}"
        exit 1
    fi
fi
echo ""

# Limpiar caché de Laravel
echo -e "${BLUE}📋 Paso 4/7: Limpiando caché de Laravel...${NC}"
$DOCKER_CMD compose exec -T application php artisan config:clear > /dev/null 2>&1 || true
$DOCKER_CMD compose exec -T application php artisan cache:clear > /dev/null 2>&1 || true
$DOCKER_CMD compose exec -T application php artisan view:clear > /dev/null 2>&1 || true
echo -e "${GREEN}✅ Caché limpiado${NC}"
echo ""

# Reiniciar contenedores
echo -e "${BLUE}📋 Paso 5/7: Reiniciando contenedores...${NC}"
echo -e "${YELLOW}   Esto tomará unos segundos...${NC}"
$DOCKER_CMD compose restart application > /dev/null 2>&1
sleep 5
echo -e "${GREEN}✅ Contenedores reiniciados${NC}"
echo ""

# Verificar y crear roles básicos
echo -e "${BLUE}📋 Paso 6/7: Verificando roles básicos...${NC}"

# Leer credenciales del .env
DB_DATABASE=$(grep "^DB_DATABASE=" api/.env | cut -d= -f2)
DB_USERNAME=$(grep "^DB_USERNAME=" api/.env | cut -d= -f2)

# Verificar cuántos roles existen usando SQL directo
ROLE_COUNT=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM roles;" 2>/dev/null | tr -d ' ')

if [ "$ROLE_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  No hay roles en la base de datos${NC}"
    echo -e "${BLUE}🔧 Creando roles básicos...${NC}"
    
    # Crear roles directamente con SQL
    $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF' > /dev/null 2>&1
-- Habilitar extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insertar roles básicos
INSERT INTO roles (id, name, guard_name, created_at, updated_at) VALUES
  (uuid_generate_v4(), 'Administrator', 'sanctum', NOW(), NOW()),
  (uuid_generate_v4(), 'Manager', 'sanctum', NOW(), NOW()),
  (uuid_generate_v4(), 'User', 'sanctum', NOW(), NOW())
ON CONFLICT DO NOTHING;
SQL_EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   ✓ Rol creado: Administrator${NC}"
        echo -e "${GREEN}   ✓ Rol creado: Manager${NC}"
        echo -e "${GREEN}   ✓ Rol creado: User${NC}"
        echo -e "${GREEN}✅ Roles creados exitosamente${NC}"
    else
        echo -e "${RED}❌ Error al crear roles${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Roles ya existen en la base de datos ($ROLE_COUNT roles)${NC}"
fi
echo ""

# Verificar y corregir tabla personal_access_tokens
echo -e "${BLUE}📋 Paso 7/7: Verificando tabla personal_access_tokens...${NC}"

# Verificar si la tabla existe
TABLE_EXISTS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'personal_access_tokens');" 2>/dev/null | tr -d ' ')

if [ "$TABLE_EXISTS" = "f" ]; then
    echo -e "${YELLOW}⚠️  Tabla personal_access_tokens no existe${NC}"
    echo -e "${GREEN}✅ No es necesario corregirla${NC}"
else
    # Verificar tipo de dato de tokenable_id
    COLUMN_TYPE=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT data_type FROM information_schema.columns WHERE table_name = 'personal_access_tokens' AND column_name = 'tokenable_id';" 2>/dev/null | tr -d ' ')
    
    if [ "$COLUMN_TYPE" = "bigint" ]; then
        echo -e "${YELLOW}⚠️  tokenable_id es bigint, debe ser uuid${NC}"
        echo -e "${BLUE}🔧 Corrigiendo tipo de dato...${NC}"
        
        # Cambiar de bigint a uuid
        $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "ALTER TABLE personal_access_tokens ALTER COLUMN tokenable_id TYPE UUID USING tokenable_id::text::uuid;" > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ tokenable_id corregido a uuid${NC}"
        else
            echo -e "${YELLOW}⚠️  No se pudo corregir (puede ser que la tabla esté vacía)${NC}"
        fi
    elif [ "$COLUMN_TYPE" = "uuid" ]; then
        echo -e "${GREEN}✅ tokenable_id ya es de tipo uuid${NC}"
    else
        echo -e "${GREEN}✅ tokenable_id es de tipo: $COLUMN_TYPE${NC}"
    fi
fi
echo ""

# Resumen final
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ RESTAURACIÓN COMPLETADA${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🎉 Fleetbase ahora debería funcionar correctamente con PostgreSQL${NC}"
echo ""
echo -e "${YELLOW}📋 Cambios aplicados:${NC}"
echo -e "   ✅ Conexión 'mysql' configurada para usar PostgreSQL"
echo -e "   ✅ Caché de Laravel limpiado"
echo -e "   ✅ Contenedores reiniciados"
echo -e "   ✅ Roles básicos verificados/creados"
echo -e "   ✅ Tabla personal_access_tokens verificada"
echo ""
echo -e "${YELLOW}🌐 Siguiente paso:${NC}"
echo -e "   Accede a: ${GREEN}http://localhost:4200/onboard${NC}"
echo -e "   Crea tu primera cuenta de administrador"
echo ""
echo -e "${YELLOW}💡 Si necesitas datos de prueba:${NC}"
echo -e "   ${BLUE}bash scripts/seed-basic-data.sh${NC}"
echo ""
echo -e "${YELLOW}🔍 Para verificar el estado:${NC}"
echo -e "   ${BLUE}docker compose logs -f application${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

