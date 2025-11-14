#!/bin/bash
# Script de diagnóstico y reparación completa del endpoint de onboarding
# Identifica problemas en logs, base de datos y configuración
# Ejecutar: bash scripts/diagnose-and-fix-onboarding.sh

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔍 DIAGNÓSTICO COMPLETO DEL ONBOARDING${NC}"
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

FIXES_APPLIED=0
CRITICAL_ERRORS=0

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 FASE 1: ANÁLISIS DE LOGS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Extrayendo últimos logs de error...${NC}"
LAST_ERROR=$($DOCKER_CMD compose exec -T application tail -200 /fleetbase/api/storage/logs/laravel-$(date +%Y-%m-%d).log 2>/dev/null | grep -A 50 "onboard/create-account" | tail -100 || echo "No se encontraron logs")

if echo "$LAST_ERROR" | grep -q "SQLSTATE"; then
    echo -e "${RED}❌ Error de base de datos detectado${NC}"
    
    # Extraer el error SQL específico
    SQL_ERROR=$(echo "$LAST_ERROR" | grep -oP "SQLSTATE\[\d+\]:[^\"]*" | head -1)
    echo -e "${YELLOW}Error SQL:${NC} $SQL_ERROR"
    echo ""
    
    if echo "$SQL_ERROR" | grep -q "42703"; then
        echo -e "${RED}⚠️  Error de columna inexistente detectado${NC}"
        MISSING_COLUMN=$(echo "$SQL_ERROR" | grep -oP 'column "?\K[^"]+(?="? of relation)')
        MISSING_TABLE=$(echo "$SQL_ERROR" | grep -oP 'of relation "?\K[^"]+(?="?)')
        echo -e "${YELLOW}Tabla:${NC} $MISSING_TABLE"
        echo -e "${YELLOW}Columna faltante:${NC} $MISSING_COLUMN"
        CRITICAL_ERRORS=$((CRITICAL_ERRORS + 1))
    elif echo "$SQL_ERROR" | grep -q "42P01"; then
        echo -e "${RED}⚠️  Error de tabla inexistente detectada${NC}"
        CRITICAL_ERRORS=$((CRITICAL_ERRORS + 1))
    elif echo "$SQL_ERROR" | grep -q "23505"; then
        echo -e "${YELLOW}⚠️  Error de duplicado (unique constraint)${NC}"
        echo -e "${BLUE}Solución: Ejecutar rollback${NC}"
    fi
    echo ""
else
    echo -e "${GREEN}✅ No se detectaron errores SQL recientes${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 FASE 2: VERIFICACIÓN DE TABLAS CRÍTICAS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Lista de tablas críticas para onboarding
CRITICAL_TABLES=("users" "companies" "permissions" "roles" "activity" "model_has_roles" "model_has_permissions")

echo -e "${YELLOW}Verificando existencia de tablas...${NC}"
for table in "${CRITICAL_TABLES[@]}"; do
    EXISTS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '$table'
        );
    " 2>/dev/null | tr -d ' ')
    
    if [ "$EXISTS" = "t" ]; then
        echo -e "  ${GREEN}✓${NC} $table"
    else
        echo -e "  ${RED}✗${NC} $table ${YELLOW}(FALTA)${NC}"
        CRITICAL_ERRORS=$((CRITICAL_ERRORS + 1))
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 FASE 3: VERIFICACIÓN DE COLUMNAS CRÍTICAS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}1. Verificando tabla 'users'...${NC}"
USER_COLUMNS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
    ORDER BY ordinal_position;
" 2>/dev/null | tr -d ' ' | grep -v '^$')

REQUIRED_USER_COLS=("id" "uuid" "public_id" "company_uuid" "name" "email" "password")
for col in "${REQUIRED_USER_COLS[@]}"; do
    if echo "$USER_COLUMNS" | grep -q "^${col}$"; then
        echo -e "  ${GREEN}✓${NC} $col"
    else
        echo -e "  ${RED}✗${NC} $col ${YELLOW}(FALTA)${NC}"
        CRITICAL_ERRORS=$((CRITICAL_ERRORS + 1))
    fi
done

echo ""
echo -e "${YELLOW}2. Verificando tabla 'companies'...${NC}"
COMPANY_COLUMNS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'companies'
    ORDER BY ordinal_position;
" 2>/dev/null | tr -d ' ' | grep -v '^$')

REQUIRED_COMPANY_COLS=("id" "uuid" "public_id" "name" "owner_uuid")
for col in "${REQUIRED_COMPANY_COLS[@]}"; do
    if echo "$COMPANY_COLUMNS" | grep -q "^${col}$"; then
        echo -e "  ${GREEN}✓${NC} $col"
    else
        echo -e "  ${RED}✗${NC} $col ${YELLOW}(FALTA)${NC}"
        CRITICAL_ERRORS=$((CRITICAL_ERRORS + 1))
    fi
done

echo ""
echo -e "${YELLOW}3. Verificando tabla 'activity'...${NC}"
ACTIVITY_COLUMNS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity'
    ORDER BY ordinal_position;
" 2>/dev/null | tr -d ' ' | grep -v '^$')

REQUIRED_ACTIVITY_COLS=("id" "uuid" "log_name" "description" "batch_uuid" "properties")
for col in "${REQUIRED_ACTIVITY_COLS[@]}"; do
    if echo "$ACTIVITY_COLUMNS" | grep -q "^${col}$"; then
        echo -e "  ${GREEN}✓${NC} $col"
    else
        echo -e "  ${RED}✗${NC} $col ${YELLOW}(FALTA - SE AGREGARÁ)${NC}"
        CRITICAL_ERRORS=$((CRITICAL_ERRORS + 1))
        
        # Auto-fix para columnas conocidas
        if [ "$col" = "batch_uuid" ]; then
            echo -e "    ${BLUE}→ Agregando columna batch_uuid...${NC}"
            $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "
                ALTER TABLE activity ADD COLUMN IF NOT EXISTS batch_uuid uuid;
            " >/dev/null 2>&1
            echo -e "    ${GREEN}✅ Columna agregada${NC}"
            FIXES_APPLIED=$((FIXES_APPLIED + 1))
            CRITICAL_ERRORS=$((CRITICAL_ERRORS - 1))
        fi
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 FASE 4: VERIFICACIÓN DE DATOS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Verificando estado de la base de datos...${NC}"

USER_COUNT=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM users;
" 2>/dev/null | tr -d ' ')

COMPANY_COUNT=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM companies;
" 2>/dev/null | tr -d ' ')

echo -e "  ${BLUE}Usuarios:${NC} $USER_COUNT"
echo -e "  ${BLUE}Empresas:${NC} $COMPANY_COUNT"

if [ "$USER_COUNT" -gt 0 ] || [ "$COMPANY_COUNT" -gt 0 ]; then
    echo -e ""
    echo -e "${YELLOW}⚠️  Hay datos existentes en la base de datos${NC}"
    echo -e "${BLUE}Recomendación: Ejecutar rollback antes de crear la primera cuenta${NC}"
    echo -e "${CYAN}Comando: bash scripts/rollback-onboarding.sh${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 FASE 5: VERIFICACIÓN DE EXTENSIONES DE POSTGRESQL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Verificando extensiones instaladas...${NC}"

EXTENSIONS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT extname FROM pg_extension ORDER BY extname;
" 2>/dev/null | tr -d ' ' | grep -v '^$')

REQUIRED_EXTENSIONS=("postgis" "uuid-ossp")
for ext in "${REQUIRED_EXTENSIONS[@]}"; do
    if echo "$EXTENSIONS" | grep -q "^${ext}$"; then
        echo -e "  ${GREEN}✓${NC} $ext"
    else
        echo -e "  ${RED}✗${NC} $ext ${YELLOW}(FALTA - SE INSTALARÁ)${NC}"
        
        echo -e "    ${BLUE}→ Instalando extensión $ext...${NC}"
        $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "
            CREATE EXTENSION IF NOT EXISTS \"$ext\";
        " >/dev/null 2>&1
        echo -e "    ${GREEN}✅ Extensión instalada${NC}"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 FASE 6: VERIFICACIÓN DE PERMISOS Y ROLES${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

PERMISSION_COUNT=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM permissions;
" 2>/dev/null | tr -d ' ')

ROLE_COUNT=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM roles;
" 2>/dev/null | tr -d ' ')

echo -e "${YELLOW}Estado de permisos y roles:${NC}"
echo -e "  ${BLUE}Permisos:${NC} $PERMISSION_COUNT"
echo -e "  ${BLUE}Roles:${NC} $ROLE_COUNT"

if [ "$PERMISSION_COUNT" -eq 0 ] && [ "$ROLE_COUNT" -eq 0 ]; then
    echo -e ""
    echo -e "${GREEN}✅ Base de datos limpia (los permisos se crearán al crear la primera cuenta)${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 FASE 7: VERIFICACIÓN DE LOGS RECIENTES COMPLETOS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Extrayendo stack trace completo del último error...${NC}"
echo ""

LOG_FILE="/fleetbase/api/storage/logs/laravel-$(date +%Y-%m-%d).log"
if $DOCKER_CMD compose exec -T application test -f "$LOG_FILE"; then
    FULL_ERROR=$($DOCKER_CMD compose exec -T application tail -500 "$LOG_FILE" 2>/dev/null | tac | sed -n '/POST.*onboard\/create-account/,/^\[/p' | tac)
    
    if [ -n "$FULL_ERROR" ]; then
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo "$FULL_ERROR" | head -100
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        # Guardar el error en un archivo temporal
        echo "$FULL_ERROR" > /tmp/fleetbase_last_error.log
        echo ""
        echo -e "${BLUE}Error completo guardado en: /tmp/fleetbase_last_error.log${NC}"
    else
        echo -e "${YELLOW}No se encontraron errores recientes del endpoint de onboarding${NC}"
    fi
else
    echo -e "${YELLOW}No se encontró el archivo de logs de hoy${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📊 RESUMEN DEL DIAGNÓSTICO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Estadísticas:${NC}"
echo -e "  ${GREEN}Fixes aplicados:${NC} $FIXES_APPLIED"
echo -e "  ${RED}Errores críticos:${NC} $CRITICAL_ERRORS"
echo ""

if [ $CRITICAL_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ NO SE DETECTARON ERRORES CRÍTICOS${NC}"
    echo ""
    echo -e "${YELLOW}Recomendaciones:${NC}"
    echo -e "  ${BLUE}1.${NC} Si hay usuarios/empresas existentes, ejecutar rollback:"
    echo -e "     ${CYAN}bash scripts/rollback-onboarding.sh${NC}"
    echo ""
    echo -e "  ${BLUE}2.${NC} Reiniciar el contenedor de aplicación:"
    echo -e "     ${CYAN}docker compose restart application${NC}"
    echo ""
    echo -e "  ${BLUE}3.${NC} Intentar crear la cuenta en http://localhost:4200/"
    echo ""
else
    echo -e "${RED}⚠️  SE DETECTARON $CRITICAL_ERRORS ERROR(ES) CRÍTICO(S)${NC}"
    echo ""
    echo -e "${YELLOW}Acciones recomendadas:${NC}"
    echo ""
    echo -e "${RED}1. CRÍTICO: Re-ejecutar migraciones completas${NC}"
    echo -e "   ${CYAN}bash scripts/master-fix-pgsql.sh${NC}"
    echo ""
    echo -e "${RED}2. CRÍTICO: Verificar que todas las migraciones se completaron${NC}"
    echo -e "   ${CYAN}docker compose exec application php artisan migrate:status${NC}"
    echo ""
    echo -e "${YELLOW}3. Si los errores persisten, reiniciar desde cero:${NC}"
    echo -e "   ${CYAN}docker compose down -v${NC}"
    echo -e "   ${CYAN}docker compose up -d${NC}"
    echo -e "   ${CYAN}bash scripts/master-fix-pgsql.sh${NC}"
    echo ""
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}✅ DIAGNÓSTICO COMPLETADO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

