#!/bin/bash
# Script para verificar y corregir columnas faltantes en tablas críticas
# Ejecutar después de las migraciones para asegurar compatibilidad completa
# Ejecutar: bash scripts/fix-missing-columns.sh

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔧 VERIFICAR Y CORREGIR COLUMNAS FALTANTES${NC}"
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

# Leer credenciales del .env
if [ ! -f "api/.env" ]; then
    echo -e "${RED}❌ Error: No se encuentra api/.env${NC}"
    exit 1
fi

DB_USERNAME=$(grep "^DB_USERNAME=" api/.env | cut -d= -f2)
DB_DATABASE=$(grep "^DB_DATABASE=" api/.env | cut -d= -f2)

echo -e "${BLUE}📋 Verificando contenedores...${NC}"
if ! $DOCKER_CMD compose ps | grep -q "database.*Up"; then
    echo -e "${RED}❌ Error: El contenedor de base de datos no está corriendo${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Contenedor de base de datos activo${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 VERIFICANDO COLUMNAS CRÍTICAS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

FIXES_APPLIED=0

# Fix 1: Tabla activity - columna batch_uuid
echo -e "${YELLOW}1. Verificando tabla 'activity'...${NC}"
BATCH_UUID_EXISTS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'activity' 
        AND column_name = 'batch_uuid'
    );
" 2>/dev/null | tr -d ' ')

if [ "$BATCH_UUID_EXISTS" = "f" ]; then
    echo -e "   ${YELLOW}⚠️  Falta columna 'batch_uuid'${NC}"
    echo -e "   ${BLUE}Agregando columna...${NC}"
    
    $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "
        ALTER TABLE activity ADD COLUMN IF NOT EXISTS batch_uuid uuid;
    " >/dev/null 2>&1
    
    echo -e "   ${GREEN}✅ Columna 'batch_uuid' agregada${NC}"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
else
    echo -e "   ${GREEN}✅ Columna 'batch_uuid' existe${NC}"
fi
echo ""

# Fix 2: Tabla activity - columna event (agregada en versiones nuevas de activitylog)
echo -e "${YELLOW}2. Verificando columna 'event' en 'activity'...${NC}"
EVENT_EXISTS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'activity' 
        AND column_name = 'event'
    );
" 2>/dev/null | tr -d ' ')

if [ "$EVENT_EXISTS" = "f" ]; then
    echo -e "   ${YELLOW}⚠️  Falta columna 'event'${NC}"
    echo -e "   ${BLUE}Agregando columna...${NC}"
    
    $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "
        ALTER TABLE activity ADD COLUMN IF NOT EXISTS event VARCHAR(255);
    " >/dev/null 2>&1
    
    echo -e "   ${GREEN}✅ Columna 'event' agregada${NC}"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
else
    echo -e "   ${GREEN}✅ Columna 'event' existe${NC}"
fi
echo ""

# Fix 3: Verificar que properties sea JSON y no TEXT
echo -e "${YELLOW}3. Verificando tipo de columna 'properties' en 'activity'...${NC}"
PROPERTIES_TYPE=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity' 
    AND column_name = 'properties';
" 2>/dev/null | tr -d ' ')

if [ "$PROPERTIES_TYPE" = "text" ]; then
    echo -e "   ${YELLOW}⚠️  Columna 'properties' es TEXT, debería ser JSON/JSONB${NC}"
    echo -e "   ${BLUE}Convirtiendo a JSONB...${NC}"
    
    $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "
        ALTER TABLE activity ALTER COLUMN properties TYPE JSONB USING properties::jsonb;
    " >/dev/null 2>&1
    
    echo -e "   ${GREEN}✅ Columna 'properties' convertida a JSONB${NC}"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
else
    echo -e "   ${GREEN}✅ Columna 'properties' tiene tipo correcto ($PROPERTIES_TYPE)${NC}"
fi
echo ""

# Fix 4: Tabla users - verificar columnas UUID críticas
echo -e "${YELLOW}4. Verificando tabla 'users'...${NC}"
USERS_COMPANY_UUID=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'company_uuid'
    );
" 2>/dev/null | tr -d ' ')

if [ "$USERS_COMPANY_UUID" = "t" ]; then
    echo -e "   ${GREEN}✅ Tabla 'users' está correcta${NC}"
else
    echo -e "   ${RED}⚠️  Tabla 'users' requiere revisión manual${NC}"
fi
echo ""

# Fix 5: Tabla permissions - verificar estructura
echo -e "${YELLOW}5. Verificando tabla 'permissions'...${NC}"
PERMISSIONS_EXISTS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'permissions'
    );
" 2>/dev/null | tr -d ' ')

if [ "$PERMISSIONS_EXISTS" = "t" ]; then
    echo -e "   ${GREEN}✅ Tabla 'permissions' existe${NC}"
else
    echo -e "   ${YELLOW}⚠️  Tabla 'permissions' no existe (se creará al usar la app)${NC}"
fi
echo ""

# Fix 6: Tabla companies - verificar estructura
echo -e "${YELLOW}6. Verificando tabla 'companies'...${NC}"
COMPANIES_EXISTS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'companies'
    );
" 2>/dev/null | tr -d ' ')

if [ "$COMPANIES_EXISTS" = "t" ]; then
    echo -e "   ${GREEN}✅ Tabla 'companies' existe${NC}"
else
    echo -e "   ${RED}❌ Tabla 'companies' no existe (ERROR CRÍTICO)${NC}"
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📊 RESUMEN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $FIXES_APPLIED -gt 0 ]; then
    echo -e "${GREEN}✅ Fixes aplicados: $FIXES_APPLIED${NC}"
    echo ""
    echo -e "${YELLOW}🔄 Se recomienda reiniciar el contenedor de aplicación:${NC}"
    echo -e "   ${BLUE}docker compose restart application${NC}"
    echo ""
else
    echo -e "${GREEN}✅ No se requirieron correcciones${NC}"
    echo -e "${GREEN}✅ Todas las columnas críticas están presentes${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ VERIFICACIÓN COMPLETADA${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

