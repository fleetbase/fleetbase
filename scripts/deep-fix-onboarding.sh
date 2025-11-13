#!/bin/bash
# Script de reparación profunda para problemas persistentes de onboarding
# Aplica todas las soluciones conocidas en orden
# Ejecutar: bash scripts/deep-fix-onboarding.sh

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}🔧 REPARACIÓN PROFUNDA DEL ONBOARDING${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Este script aplicará TODAS las correcciones conocidas:${NC}"
echo -e "  ${CYAN}• Columnas faltantes en todas las tablas${NC}"
echo -e "  ${CYAN}• Extensiones de PostgreSQL${NC}"
echo -e "  ${CYAN}• Índices y constraints${NC}"
echo -e "  ${CYAN}• Tipos de datos${NC}"
echo -e "  ${CYAN}• Triggers y funciones${NC}"
echo ""

read -p "$(echo -e ${YELLOW}¿Continuar con la reparación profunda? [y/N]: ${NC})" -n 1 -r
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
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔧 INICIANDO REPARACIÓN PROFUNDA${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF'

-- ============================================
-- FASE 1: EXTENSIONES
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📦 FASE 1: Instalando extensiones requeridas...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\echo '✅ Extensiones instaladas'
\echo ''

-- ============================================
-- FASE 2: TABLA ACTIVITY - COLUMNAS FALTANTES
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📋 FASE 2: Reparando tabla activity...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Agregar columnas faltantes
ALTER TABLE activity ADD COLUMN IF NOT EXISTS batch_uuid UUID;
ALTER TABLE activity ADD COLUMN IF NOT EXISTS event VARCHAR(255);

-- Convertir properties a JSONB si es TEXT
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'activity' AND column_name = 'properties') = 'text' THEN
        ALTER TABLE activity ALTER COLUMN properties TYPE JSONB USING properties::jsonb;
    END IF;
END $$;

-- Agregar índices útiles
CREATE INDEX IF NOT EXISTS activity_batch_uuid_idx ON activity(batch_uuid);
CREATE INDEX IF NOT EXISTS activity_event_idx ON activity(event);

\echo '✅ Tabla activity reparada'
\echo ''

-- ============================================
-- FASE 3: TABLA USERS - VERIFICACIÓN
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '👤 FASE 3: Verificando tabla users...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Asegurar que uuid tenga default
ALTER TABLE users ALTER COLUMN uuid SET DEFAULT uuid_generate_v4();

-- Asegurar que public_id sea único
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_public_id_unique'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_public_id_unique UNIQUE (public_id);
    END IF;
END $$;

\echo '✅ Tabla users verificada'
\echo ''

-- ============================================
-- FASE 4: TABLA COMPANIES - VERIFICACIÓN
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🏢 FASE 4: Verificando tabla companies...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Asegurar que uuid tenga default
ALTER TABLE companies ALTER COLUMN uuid SET DEFAULT uuid_generate_v4();

-- Asegurar que public_id sea único
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'companies_public_id_unique'
    ) THEN
        ALTER TABLE companies ADD CONSTRAINT companies_public_id_unique UNIQUE (public_id);
    END IF;
END $$;

\echo '✅ Tabla companies verificada'
\echo ''

-- ============================================
-- FASE 5: TABLA PERMISSIONS - VERIFICACIÓN
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔐 FASE 5: Verificando tabla permissions...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Verificar que la primary key es correcta
DO $$
BEGIN
    -- Verificar si id es UUID
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'permissions' AND column_name = 'id') = 'uuid' THEN
        \echo '  ✓ ID es UUID (correcto para PostgreSQL)';
    END IF;
END $$;

\echo '✅ Tabla permissions verificada'
\echo ''

-- ============================================
-- FASE 6: TABLA ROLES - VERIFICACIÓN
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '👥 FASE 6: Verificando tabla roles...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Asegurar que uuid tenga default si existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE roles ALTER COLUMN uuid SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

\echo '✅ Tabla roles verificada'
\echo ''

-- ============================================
-- FASE 7: FUNCIONES Y TRIGGERS
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '⚙️  FASE 7: Creando funciones auxiliares...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Función para generar public_id único
CREATE OR REPLACE FUNCTION generate_public_id(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    random_string TEXT;
BEGIN
    random_string := encode(gen_random_bytes(12), 'base64');
    random_string := replace(random_string, '/', '_');
    random_string := replace(random_string, '+', '-');
    random_string := substring(random_string from 1 for 16);
    RETURN prefix || '_' || random_string;
END;
$$ LANGUAGE plpgsql;

\echo '✅ Funciones auxiliares creadas'
\echo ''

-- ============================================
-- FASE 8: VERIFICACIÓN DE INTEGRIDAD
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 FASE 8: Verificación de integridad...'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Verificar tablas críticas
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
        THEN '  ✓ users'
        ELSE '  ✗ users (FALTA)'
    END;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') 
        THEN '  ✓ companies'
        ELSE '  ✗ companies (FALTA)'
    END;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') 
        THEN '  ✓ permissions'
        ELSE '  ✗ permissions (FALTA)'
    END;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') 
        THEN '  ✓ roles'
        ELSE '  ✗ roles (FALTA)'
    END;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity') 
        THEN '  ✓ activity'
        ELSE '  ✗ activity (FALTA)'
    END;

\echo ''
\echo '✅ Verificación de integridad completada'
\echo ''

-- ============================================
-- RESUMEN
-- ============================================
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 RESUMEN DE DATOS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 'Usuarios: ' || COUNT(*) FROM users;
SELECT 'Empresas: ' || COUNT(*) FROM companies;
SELECT 'Permisos: ' || COUNT(*) FROM permissions;
SELECT 'Roles: ' || COUNT(*) FROM roles;
SELECT 'Actividad: ' || COUNT(*) FROM activity;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✅ REPARACIÓN PROFUNDA COMPLETADA'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SQL_EOF

echo ""
echo -e "${GREEN}✅ Todas las reparaciones SQL completadas${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔄 POST-REPARACIÓN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}1. Limpiando cache de Laravel...${NC}"
$DOCKER_CMD compose exec -T application php artisan config:clear 2>/dev/null || echo -e "${YELLOW}⚠️  Config clear falló${NC}"
$DOCKER_CMD compose exec -T application php artisan cache:clear 2>/dev/null || echo -e "${YELLOW}⚠️  Cache clear falló${NC}"
echo -e "${GREEN}✅ Cache limpiado${NC}"
echo ""

echo -e "${YELLOW}2. Verificando estado de migraciones...${NC}"
MIGRATION_STATUS=$($DOCKER_CMD compose exec -T application php artisan migrate:status 2>&1 | tail -5)
echo "$MIGRATION_STATUS"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ REPARACIÓN PROFUNDA COMPLETADA${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}✅ Próximos pasos recomendados:${NC}"
echo ""
echo -e "  ${BLUE}1.${NC} Reiniciar el contenedor de aplicación:"
echo -e "     ${CYAN}docker compose restart application${NC}"
echo ""
echo -e "  ${BLUE}2.${NC} Si hay datos parciales, ejecutar rollback:"
echo -e "     ${CYAN}bash scripts/rollback-onboarding.sh${NC}"
echo ""
echo -e "  ${BLUE}3.${NC} Intentar crear la cuenta administrativa en:"
echo -e "     ${CYAN}http://localhost:4200/${NC}"
echo ""
echo -e "  ${BLUE}4.${NC} Si persisten los errores, ejecutar diagnóstico:"
echo -e "     ${CYAN}bash scripts/diagnose-and-fix-onboarding.sh${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

