#!/bin/bash
# Script para hacer rollback completo de datos de onboarding
# Limpia usuarios, empresas y datos relacionados para permitir crear la primera cuenta de nuevo
# ADVERTENCIA: Este script elimina TODOS los datos pero mantiene la estructura de tablas
# Ejecutar: bash scripts/rollback-onboarding.sh

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}⚠️  ROLLBACK DE DATOS DE ONBOARDING${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Este script eliminará TODOS los datos de:${NC}"
echo -e "  ${RED}• Usuarios${NC}"
echo -e "  ${RED}• Empresas${NC}"
echo -e "  ${RED}• Roles y permisos${NC}"
echo -e "  ${RED}• Logs de actividad${NC}"
echo -e "  ${RED}• Sesiones${NC}"
echo ""
echo -e "${YELLOW}Las tablas y estructura se mantendrán intactas.${NC}"
echo ""

# Pedir confirmación
read -p "$(echo -e ${YELLOW}¿Estás seguro de continuar? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Operación cancelada.${NC}"
    exit 0
fi

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

echo ""
echo -e "${BLUE}📋 Verificando conexión a la base de datos...${NC}"
if ! $DOCKER_CMD compose exec -T database pg_isready -U "$DB_USERNAME" >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: PostgreSQL no está listo${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexión establecida${NC}"
echo ""

# Verificar datos existentes
echo -e "${BLUE}📊 Verificando datos existentes...${NC}"
echo ""

USER_COUNT=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM users;
" 2>/dev/null | tr -d ' ' || echo "0")

COMPANY_COUNT=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM companies;
" 2>/dev/null | tr -d ' ' || echo "0")

PERMISSION_COUNT=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM permissions;
" 2>/dev/null | tr -d ' ' || echo "0")

ACTIVITY_COUNT=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM activity;
" 2>/dev/null | tr -d ' ' || echo "0")

echo -e "${YELLOW}Datos actuales:${NC}"
echo -e "  ${BLUE}Usuarios:${NC} $USER_COUNT"
echo -e "  ${BLUE}Empresas:${NC} $COMPANY_COUNT"
echo -e "  ${BLUE}Permisos:${NC} $PERMISSION_COUNT"
echo -e "  ${BLUE}Logs de actividad:${NC} $ACTIVITY_COUNT"
echo ""

if [ "$USER_COUNT" -eq 0 ] && [ "$COMPANY_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ La base de datos ya está vacía${NC}"
    echo -e "${BLUE}No se requiere rollback${NC}"
    exit 0
fi

echo -e "${YELLOW}⚠️  Procediendo con el rollback en 3 segundos...${NC}"
sleep 1
echo -e "${YELLOW}   3...${NC}"
sleep 1
echo -e "${YELLOW}   2...${NC}"
sleep 1
echo -e "${YELLOW}   1...${NC}"
sleep 1
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🗑️  EJECUTANDO ROLLBACK${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Ejecutar el rollback
echo -e "${YELLOW}1/8: Deshabilitando triggers temporalmente...${NC}"
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF' >/dev/null 2>&1
-- Deshabilitar triggers para evitar problemas con foreign keys
SET session_replication_role = replica;
SQL_EOF
echo -e "${GREEN}✅ Triggers deshabilitados${NC}"
echo ""

echo -e "${YELLOW}2/8: Limpiando logs de actividad...${NC}"
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF' >/dev/null 2>&1
TRUNCATE TABLE activity CASCADE;
SQL_EOF
echo -e "${GREEN}✅ Logs de actividad eliminados${NC}"
echo ""

echo -e "${YELLOW}3/8: Limpiando sesiones y tokens...${NC}"
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF' >/dev/null 2>&1
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE personal_access_tokens CASCADE;
TRUNCATE TABLE api_credentials CASCADE;
SQL_EOF
echo -e "${GREEN}✅ Sesiones y tokens eliminados${NC}"
echo ""

echo -e "${YELLOW}4/8: Limpiando relaciones de roles y permisos...${NC}"
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF' >/dev/null 2>&1
TRUNCATE TABLE model_has_permissions CASCADE;
TRUNCATE TABLE model_has_roles CASCADE;
TRUNCATE TABLE role_has_permissions CASCADE;
SQL_EOF
echo -e "${GREEN}✅ Relaciones eliminadas${NC}"
echo ""

echo -e "${YELLOW}5/8: Limpiando roles y permisos...${NC}"
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF' >/dev/null 2>&1
TRUNCATE TABLE permissions CASCADE;
TRUNCATE TABLE roles CASCADE;
TRUNCATE TABLE policies CASCADE;
SQL_EOF
echo -e "${GREEN}✅ Roles y permisos eliminados${NC}"
echo ""

echo -e "${YELLOW}6/8: Limpiando usuarios...${NC}"
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF' >/dev/null 2>&1
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE user_devices CASCADE;
SQL_EOF
echo -e "${GREEN}✅ Usuarios eliminados${NC}"
echo ""

echo -e "${YELLOW}7/8: Limpiando empresas y datos relacionados...${NC}"
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF' >/dev/null 2>&1
TRUNCATE TABLE companies CASCADE;
TRUNCATE TABLE company_users CASCADE;
TRUNCATE TABLE invites CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE verification_codes CASCADE;
SQL_EOF
echo -e "${GREEN}✅ Empresas eliminadas${NC}"
echo ""

echo -e "${YELLOW}8/8: Rehabilitando triggers...${NC}"
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF' >/dev/null 2>&1
-- Rehabilitar triggers
SET session_replication_role = DEFAULT;
SQL_EOF
echo -e "${GREEN}✅ Triggers rehabilitados${NC}"
echo ""

# Verificar que el rollback fue exitoso
echo -e "${BLUE}📊 Verificando resultados...${NC}"
echo ""

USER_COUNT_AFTER=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM users;
" 2>/dev/null | tr -d ' ')

COMPANY_COUNT_AFTER=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM companies;
" 2>/dev/null | tr -d ' ')

PERMISSION_COUNT_AFTER=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM permissions;
" 2>/dev/null | tr -d ' ')

ACTIVITY_COUNT_AFTER=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM activity;
" 2>/dev/null | tr -d ' ')

echo -e "${YELLOW}Datos después del rollback:${NC}"
echo -e "  ${BLUE}Usuarios:${NC} $USER_COUNT_AFTER"
echo -e "  ${BLUE}Empresas:${NC} $COMPANY_COUNT_AFTER"
echo -e "  ${BLUE}Permisos:${NC} $PERMISSION_COUNT_AFTER"
echo -e "  ${BLUE}Logs de actividad:${NC} $ACTIVITY_COUNT_AFTER"
echo ""

if [ "$USER_COUNT_AFTER" -eq 0 ] && [ "$COMPANY_COUNT_AFTER" -eq 0 ]; then
    echo -e "${GREEN}✅ Rollback completado exitosamente${NC}"
    ROLLBACK_SUCCESS=true
else
    echo -e "${YELLOW}⚠️  Algunos datos no se pudieron eliminar${NC}"
    ROLLBACK_SUCCESS=false
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ ROLLBACK COMPLETADO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$ROLLBACK_SUCCESS" = true ]; then
    echo -e "${GREEN}🎉 La base de datos está limpia${NC}"
    echo ""
    echo -e "${YELLOW}✅ Próximos pasos:${NC}"
    echo ""
    echo -e "   ${BLUE}1.${NC} Reiniciar el contenedor de aplicación:"
    echo -e "      ${GREEN}docker compose restart application${NC}"
    echo ""
    echo -e "   ${BLUE}2.${NC} Volver a ${YELLOW}http://localhost:4200/${NC}"
    echo ""
    echo -e "   ${BLUE}3.${NC} Crear la primera cuenta administrativa"
    echo ""
else
    echo -e "${YELLOW}⚠️  El rollback tuvo problemas${NC}"
    echo ""
    echo -e "${YELLOW}Opción alternativa - Rollback completo (reiniciar migraciones):${NC}"
    echo -e "   ${BLUE}docker compose exec application php artisan migrate:fresh --force${NC}"
    echo ""
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

