#!/bin/bash
# ============================================================================
# SCRIPT PARA CREAR ROLES BÁSICOS EN FLEETBASE
# ============================================================================
#
# Este script crea los roles necesarios para el funcionamiento de Fleetbase
# después de completar las migraciones. También verifica y corrige problemas
# comunes relacionados con el onboarding.
#
# FIXES INCLUIDOS:
# - Conversión de personal_access_tokens.tokenable_id de bigint a uuid
# - Creación de 6 roles básicos (Administrator, Admin, Manager, User, Fleet Manager, Driver)
# - Limpieza de usuarios y compañías para refrescar onboarding
#
# USO:
#   bash scripts/create-roles.sh              # Crear roles
#   bash scripts/create-roles.sh --clean      # Limpiar usuarios y refrescar onboarding
#   bash scripts/create-roles.sh --reset      # Limpiar todo y crear roles
#
# ============================================================================

set -e

# Procesar argumentos
CLEAN_MODE=false
RESET_MODE=false

if [ "$1" = "--clean" ] || [ "$1" = "-c" ]; then
    CLEAN_MODE=true
elif [ "$1" = "--reset" ] || [ "$1" = "-r" ]; then
    RESET_MODE=true
    CLEAN_MODE=true
fi

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Detectar si estamos usando docker o sudo docker
DOCKER_CMD="docker"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    exit 1
fi

if ! docker ps &> /dev/null; then
    DOCKER_CMD="sudo docker"
    if ! $DOCKER_CMD ps &> /dev/null; then
        echo -e "${RED}❌ No se puede conectar a Docker${NC}"
        exit 1
    fi
fi

# Leer configuración de la base de datos
DB_USERNAME=$(grep "^DB_USERNAME=" api/.env | cut -d= -f2)
DB_DATABASE=$(grep "^DB_DATABASE=" api/.env | cut -d= -f2)

# ============================================================================
# MODO LIMPIEZA
# ============================================================================
if [ "$CLEAN_MODE" = true ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🧹 LIMPIEZA Y REFRESCO DE ONBOARDING${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Confirmar acción
    echo -e "${RED}⚠️  ADVERTENCIA: Esta acción eliminará:${NC}"
    echo -e "   • Todos los usuarios"
    echo -e "   • Todas las compañías"
    echo -e "   • Todas las relaciones usuario-compañía"
    echo -e "   • Credenciales API"
    echo -e "   • Códigos de verificación"
    echo -e "   • Invitaciones"
    echo ""
    read -p "¿Estás seguro? (escribe 'SI' para confirmar): " CONFIRM
    
    if [ "$CONFIRM" != "SI" ]; then
        echo -e "${YELLOW}❌ Operación cancelada${NC}"
        exit 0
    fi
    
    echo ""
    echo -e "${YELLOW}Limpiando datos de usuarios y compañías...${NC}"
    
    $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL'
DO $$
DECLARE
    users_deleted INT;
    companies_deleted INT;
    invites_deleted INT;
BEGIN
    -- Contar antes de eliminar
    SELECT COUNT(*) INTO users_deleted FROM users;
    SELECT COUNT(*) INTO companies_deleted FROM companies;
    SELECT COUNT(*) INTO invites_deleted FROM invites;
    
    -- Eliminar datos relacionados primero
    DELETE FROM company_users;
    DELETE FROM api_credentials;
    DELETE FROM verification_codes;
    DELETE FROM invites;
    DELETE FROM login_attempts;
    
    -- Eliminar usuarios y compañías
    DELETE FROM users;
    DELETE FROM companies;
    
    -- Limpiar actividades relacionadas
    DELETE FROM activity WHERE subject_type LIKE '%User%' OR subject_type LIKE '%Company%';
    
    -- Mostrar resultados
    RAISE NOTICE '';
    RAISE NOTICE '✅ Datos eliminados:';
    RAISE NOTICE '   • % usuarios', users_deleted;
    RAISE NOTICE '   • % compañías', companies_deleted;
    RAISE NOTICE '   • % invitaciones', invites_deleted;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Onboarding refrescado - listo para crear cuenta administrativa';
END $$;
SQL
    
    echo ""
    echo -e "${GREEN}✅ Limpieza completada${NC}"
    echo ""
    
    if [ "$RESET_MODE" = false ]; then
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✅ ¡ONBOARDING REFRESCADO!${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${YELLOW}Próximos pasos:${NC}"
        echo -e "   ${CYAN}1.${NC} Accede a: ${BLUE}http://localhost:4200/${NC}"
        echo -e "   ${CYAN}2.${NC} Crea la cuenta administrativa"
        echo ""
        exit 0
    fi
    
    echo -e "${CYAN}Continuando con la creación de roles...${NC}"
    echo ""
fi

# ============================================================================
# MODO NORMAL - CREACIÓN DE ROLES
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔧 CREACIÓN DE ROLES PARA FLEETBASE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Base de datos: ${CYAN}$DB_DATABASE${NC}"
echo ""

# Verificar si la tabla roles existe
echo -e "${YELLOW}1. Verificando tabla roles...${NC}"
TABLE_EXISTS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_name = 'roles' AND table_schema = 'public';
" 2>/dev/null | tr -d ' ')

if [ "$TABLE_EXISTS" -eq 0 ]; then
    echo -e "${RED}❌ La tabla 'roles' no existe. Ejecuta las migraciones primero.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Tabla roles encontrada${NC}"
echo ""

# Verificar y corregir personal_access_tokens
echo -e "${YELLOW}2. Verificando tabla personal_access_tokens...${NC}"
TOKENABLE_TYPE=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT data_type FROM information_schema.columns 
    WHERE table_name = 'personal_access_tokens' 
    AND column_name = 'tokenable_id';
" 2>/dev/null | tr -d ' ')

if [ "$TOKENABLE_TYPE" = "bigint" ]; then
    echo -e "${YELLOW}   → tokenable_id es bigint, convirtiendo a uuid...${NC}"
    $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_FIX_TOKENS'
-- Cambiar tokenable_id de bigint a uuid para compatibilidad con usuarios UUID
ALTER TABLE personal_access_tokens 
ALTER COLUMN tokenable_id TYPE uuid USING CASE 
    WHEN tokenable_id::text ~ '^[0-9]+$' THEN gen_random_uuid()
    ELSE tokenable_id::text::uuid 
END;
SQL_FIX_TOKENS
    echo -e "${GREEN}   ✓ tokenable_id convertido a uuid${NC}"
elif [ "$TOKENABLE_TYPE" = "uuid" ]; then
    echo -e "${GREEN}   ✓ tokenable_id ya es uuid${NC}"
else
    echo -e "${YELLOW}   ⚠ tokenable_id tiene tipo: $TOKENABLE_TYPE${NC}"
fi
echo ""

# Verificar roles existentes
echo -e "${YELLOW}3. Verificando roles existentes...${NC}"
EXISTING_ROLES=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM roles;
" 2>/dev/null | tr -d ' ')

if [ "$EXISTING_ROLES" -gt 0 ]; then
    echo -e "${CYAN}   → Roles existentes: $EXISTING_ROLES${NC}"
    $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "
        SELECT name, guard_name FROM roles ORDER BY name;
    " 2>/dev/null
    echo ""
else
    echo -e "${YELLOW}   → No hay roles en la base de datos${NC}"
    echo ""
fi

# Crear roles básicos
echo -e "${YELLOW}4. Creando roles básicos...${NC}"
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL'
DO $$
DECLARE
    roles_created INT := 0;
BEGIN
    -- Administrator
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Administrator' AND guard_name = 'sanctum') THEN
        INSERT INTO roles (id, name, guard_name, description, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Administrator', 'sanctum', 'Full system administrator with all permissions', NOW(), NOW());
        roles_created := roles_created + 1;
        RAISE NOTICE '  ✓ Administrator';
    END IF;
    
    -- Admin
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Admin' AND guard_name = 'sanctum') THEN
        INSERT INTO roles (id, name, guard_name, description, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Admin', 'sanctum', 'Company administrator', NOW(), NOW());
        roles_created := roles_created + 1;
        RAISE NOTICE '  ✓ Admin';
    END IF;
    
    -- Manager
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Manager' AND guard_name = 'sanctum') THEN
        INSERT INTO roles (id, name, guard_name, description, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Manager', 'sanctum', 'Manager with limited permissions', NOW(), NOW());
        roles_created := roles_created + 1;
        RAISE NOTICE '  ✓ Manager';
    END IF;
    
    -- User
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'User' AND guard_name = 'sanctum') THEN
        INSERT INTO roles (id, name, guard_name, description, created_at, updated_at)
        VALUES (gen_random_uuid(), 'User', 'sanctum', 'Regular user with basic permissions', NOW(), NOW());
        roles_created := roles_created + 1;
        RAISE NOTICE '  ✓ User';
    END IF;
    
    -- Fleet Manager (para FleetOps)
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Fleet Manager' AND guard_name = 'sanctum') THEN
        INSERT INTO roles (id, name, guard_name, description, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Fleet Manager', 'sanctum', 'Fleet operations manager', NOW(), NOW());
        roles_created := roles_created + 1;
        RAISE NOTICE '  ✓ Fleet Manager';
    END IF;
    
    -- Driver (para FleetOps)
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Driver' AND guard_name = 'sanctum') THEN
        INSERT INTO roles (id, name, guard_name, description, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Driver', 'sanctum', 'Fleet driver', NOW(), NOW());
        roles_created := roles_created + 1;
        RAISE NOTICE '  ✓ Driver';
    END IF;
    
    IF roles_created > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ % roles creados', roles_created;
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE 'ℹ️  Todos los roles ya existen';
    END IF;
END $$;
SQL

echo ""
echo -e "${GREEN}✅ Roles creados exitosamente${NC}"
echo ""

# Mostrar roles finales
echo -e "${YELLOW}5. Verificando roles finales...${NC}"
TOTAL_ROLES=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COUNT(*) FROM roles;
" 2>/dev/null | tr -d ' ')

echo -e "${CYAN}   Total de roles: ${GREEN}$TOTAL_ROLES${NC}"
echo ""

$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "
    SELECT name, guard_name, description FROM roles ORDER BY name;
" 2>/dev/null

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ ¡ROLES CREADOS EXITOSAMENTE!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📋 Roles disponibles:${NC}"
echo -e "   • ${CYAN}Administrator${NC} - Administrador del sistema con todos los permisos"
echo -e "   • ${CYAN}Admin${NC} - Administrador de la compañía"
echo -e "   • ${CYAN}Manager${NC} - Gerente con permisos limitados"
echo -e "   • ${CYAN}User${NC} - Usuario regular"
echo -e "   • ${CYAN}Fleet Manager${NC} - Gerente de flota"
echo -e "   • ${CYAN}Driver${NC} - Conductor"
echo ""
echo -e "${YELLOW}✅ Próximos pasos:${NC}"
echo ""
echo -e "   ${CYAN}1.${NC} Accede a la aplicación: ${BLUE}http://localhost:4200/${NC}"
echo -e "   ${CYAN}2.${NC} Crea la cuenta administrativa"
echo -e "   ${CYAN}3.${NC} El usuario se creará con el rol ${GREEN}Administrator${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}💡 Comandos útiles:${NC}"
echo ""
echo -e "   ${CYAN}# Limpiar usuarios y refrescar onboarding:${NC}"
echo -e "   bash scripts/create-roles.sh --clean"
echo ""
echo -e "   ${CYAN}# Limpiar todo y recrear roles:${NC}"
echo -e "   bash scripts/create-roles.sh --reset"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

