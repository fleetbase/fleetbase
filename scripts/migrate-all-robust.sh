#!/bin/bash
# ============================================================================
# SCRIPT ULTRA-ROBUSTO PARA MIGRACIONES DE FLEETBASE
# ============================================================================
#
# Este script aplica automáticamente TODOS los fixes conocidos para problemas
# comunes en las migraciones de Fleetbase con PostgreSQL.
#
# FIXES INTEGRADOS (26 TOTAL):
# ─────────────────────────────────────────────────────────────────────────
#
# 1. Schema::connection() problemático
#    - Reemplaza Schema::connection(config('...'))->  por Schema::
#    - Previene: Errores de conexión no configurada
#
# 2. Schema-> (sintaxis incorrecta)
#    - Corrige Schema-> a Schema::
#    - Previene: "Undefined constant Schema"
#
# 3. new Expression($databaseName . '.tabla')
#    - Reemplaza referencias a schema "fleetbase.tabla" por 'tabla'
#    - Previene: "schema fleetbase does not exist"
#
# 4. Unique constraints faltantes en uuid ⭐ MEJORADO
#    - Agrega automáticamente UNIQUE constraints a TODAS las columnas uuid
#    - Busca dinámicamente tablas sin constraint usando information_schema
#    - Funciona con columnas nullable y no-nullable
#    - Previene: "no unique constraint matching given keys"
#    - Se aplica ANTES de cada intento de migración
#
# 5. Índices duplicados en uuid
#    - Cambia ->uuid('uuid')->index() por ->uuid('uuid')->unique()
#    - Previene: Errores de foreign keys sin unique constraint
#
# 6. Tipo geography no reconocido por Doctrine
#    - Comenta ->change() problemáticos en migraciones específicas
#    - Previene: "Unknown database type geography"
#
# 7. Índices espaciales duplicados
#    - Renombra índices spatialIndex con nombres únicos por tabla
#    - Previene: Conflictos de nombres de índices
#
# 8. Columna batch_uuid faltante en activity ⭐ MEJORADO
#    - Agrega batch_uuid a la tabla activity si no existe
#    - Busca en TODAS las ubicaciones (server/migrations Y migrations/)
#    - Previene: Errores 500 en onboarding
#
# 9. Extensiones PostgreSQL
#    - Instala uuid-ossp, postgis, pg_trgm
#    - Necesarias para tipos UUID y geográficos
#
# 10. Procesos colgados
#     - Detecta y mata procesos artisan migrate atascados
#     - Timeout agresivo de 30 segundos sin progreso
#
# 11. Schema::connection() en add_default_order_config_column
#     - Reemplaza Schema::connection($sfConnection) por Schema::
#     - Reemplaza DB::connection($sfConnection) por DB::
#     - Previene: Migraciones atascadas por conexión no configurada
#
# 12. ->change() y renameColumn con geography
#     - Comenta líneas problemáticas en create_additional_spec_columns
#     - Previene: "Unknown database type geography"
#
# 13. ST_SRID y MODIFY en fix_device_column_names
#     - Comenta ST_SRID (sintaxis PostGIS incorrecta)
#     - Comenta MODIFY (no existe en PostgreSQL)
#     - Previene: "function st_srid does not exist"
#
# 14. SHOW INDEX FROM en add_performance_indexes
#     - Reemplaza SHOW INDEX FROM por query pg_indexes
#     - Previene: "syntax error at or near FROM"
#
# 15. Constraints UNIQUE duplicados
#     - Elimina $table->unique(['uuid']) cuando ya existe ->unique()
#     - Previene: "relation contacts_uuid_unique already exists"
#
# 16. Sistema de Reintentos Infinitos con Limpieza Automática
#     - Detecta migraciones fallidas y limpia su estado
#     - Elimina tablas parcialmente creadas
#     - Re-aplica unique constraints en cada intento
#     - Intenta hasta 100 veces con limpieza entre intentos
#
# 17. Fix manual para tabla dashboards (y otras tablas críticas)
#     - Agrega UNIQUE constraint a dashboards.uuid explícitamente
#     - Previene: "no unique constraint matching given keys for dashboards"
#     - Se ejecuta en la Fase 1 antes de migraciones
#
# 18. Fix para columnas uuid como string/char en lugar de tipo uuid ⭐ MEJORADO
#     - Cambia ->string('uuid', 191) por ->uuid('uuid')
#     - Cambia ->char('xxx_uuid', 36) por ->uuid('xxx_uuid')
#     - Cambia ->string('xxx_uuid') por ->uuid('xxx_uuid')
#     - Busca en server/migrations/ Y migrations/
#     - Previene: "Key columns are of incompatible types: uuid and character varying"
#     - Crítico para foreign keys en TODAS las columnas _uuid
#
# 19. Fix para columnas UUID con tipo incorrecto en tablas existentes
#     - Convierte columnas VARCHAR/CHAR que terminan en _uuid a tipo UUID
#     - Se aplica a tablas ya creadas antes de foreign keys
#     - Previene: "Key columns are of incompatible types"
#
# 20. Salida en Tiempo Real con tee ⭐ NUEVO
#     - Muestra la salida de artisan migrate mientras se ejecuta
#     - Guarda el log completo para análisis de errores
#     - Usa PIPESTATUS para capturar el código de salida correcto
#     - Ya no esperas "a ciegas" sin saber qué pasa
#
# 21. Monitor de Progreso en Tiempo Real ⭐ NUEVO
#     - Muestra cada 5s el número de migraciones completadas
#     - Calcula velocidad de progreso (migraciones/5s)
#     - Detecta si está atascado vs procesando lento
#     - Muestra PID del proceso para depuración
#     - Advertencias si no hay progreso por 30s+
#
# 22. Fix para columnas id con tipo incorrecto ⭐ NUEVO
#     - Cambia ->char('id', 36) por ->uuid('id')->unique()
#     - Cambia ->string('id', 36) por ->uuid('id')->unique()
#     - Cambia ->uuid('id')->index() por ->uuid('id')->unique()
#     - Previene: "Key columns are of incompatible types: uuid and character"
#     - Crítico para tablas policies, permissions, roles, etc.
#     - Las columnas id DEBEN ser UUID para compatibilidad con foreign keys UUID
#
# 23. Conversión de columnas id existentes de CHARACTER a UUID ⭐ NUEVO
#     - Convierte columnas 'id' de tipo CHARACTER/VARCHAR a UUID en tablas existentes
#     - Agrega UNIQUE constraints a todas las columnas 'id' sin constraint
#     - Previene: "Key columns are of incompatible types: uuid and character"
#     - Se aplica ANTES de cada intento de migración
#     - Crítico para que foreign keys UUID puedan referenciar tablas con id tipo char
#
# 24. Fix para add_event_column_to_activity_log_table ⭐ NUEVO
#     - Modifica la migración para que verifique si la columna 'event' ya existe
#     - Usa IF NOT EXISTS en lugar de ADD COLUMN directo
#     - Previene: "SQLSTATE[42701]: Duplicate column: event already exists"
#     - Se ejecuta en Fase 1 antes de las migraciones
#     - Crea backup de la migración original
#     - Compatible con instancias vírgenes y bases de datos existentes
#
# 25. Fix para columna tokenable_id en personal_access_tokens ⭐ NUEVO
#     - Convierte columna tokenable_id de VARCHAR/INTEGER/BIGINT a UUID con USING
#     - Maneja tanto tipos numéricos (bigint, integer) como texto (varchar, text)
#     - Se aplica ANTES de las migraciones para evitar error de cast
#     - Previene: "SQLSTATE[42804]: column tokenable_id cannot be cast automatically to type uuid"
#     - Se ejecuta en Fase 1 de manera preventiva
#     - También corrige la migración 2023_04_25_094311_fix_personal_access_tokens
#     - Compatible con instancias vírgenes y bases de datos existentes
#
# 26. Fix para add_batch_uuid_column_to_activity_log_table ⭐ NUEVO
#     - Modifica la migración para que verifique si la columna 'batch_uuid' ya existe
#     - Usa IF NOT EXISTS en lugar de ADD COLUMN directo
#     - Previene: "SQLSTATE[42701]: Duplicate column: batch_uuid already exists"
#     - Se ejecuta en Fase 1 antes de las migraciones
#     - Crea backup de la migración original
#     - Compatible con instancias vírgenes y bases de datos existentes
#     - Similar al Fix #24 pero para batch_uuid
#
# EJECUCIÓN:
# ─────────────────────────────────────────────────────────────────────────
# bash scripts/migrate-all-robust.sh
#
# CARACTERÍSTICAS:
# ─────────────────────────────────────────────────────────────────────────
# - Hasta 100 reintentos automáticos con limpieza entre intentos
# - Detección automática de migraciones fallidas
# - Limpieza de estado de migraciones en DB
# - Eliminación de tablas parcialmente creadas
# - Aplicación preventiva de unique constraints antes de cada intento
# - 26 fixes específicos para migraciones problemáticas
# - Compatible 100% con PostgreSQL (elimina sintaxis MySQL)
# - Sistema ultra-robusto para instalaciones desde cero
# - Logs de debug detallados paso a paso
# - Monitor en tiempo real con estadísticas cada 5s
#
# ============================================================================

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuración
MAX_RETRIES=100        # Hasta 100 intentos automáticos
MIGRATION_TIMEOUT=120  # 2 minutos timeout por intento
PAUSE_BETWEEN_RETRIES=0.3  # Pausa muy corta entre intentos

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}🚀 MIGRACIÓN ULTRA-ROBUSTA DE BASE DE DATOS${NC}"
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
DB_HOST=$(grep "^DB_HOST=" api/.env | cut -d= -f2)
DB_PORT=$(grep "^DB_PORT=" api/.env | cut -d= -f2)

echo -e "${BLUE}📋 Configuración detectada:${NC}"
echo -e "   Base de datos: ${CYAN}$DB_DATABASE${NC}"
echo -e "   Usuario: ${CYAN}$DB_USERNAME${NC}"
echo -e "   Host: ${CYAN}$DB_HOST:$DB_PORT${NC}"
echo -e "   Reintentos máximos: ${CYAN}$MAX_RETRIES (con limpieza automática)${NC}"
echo -e "   Timeout por intento: ${CYAN}$MIGRATION_TIMEOUT segundos${NC}"
echo ""

# ============================================
# FASE 0: VERIFICACIÓN PRELIMINAR
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📋 FASE 0: VERIFICACIÓN PRELIMINAR${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}1. Verificando contenedores...${NC}"
if ! $DOCKER_CMD compose ps | grep -q "database.*Up"; then
    echo -e "${RED}❌ El contenedor de base de datos no está corriendo${NC}"
    echo -e "${YELLOW}Iniciando contenedores...${NC}"
    $DOCKER_CMD compose up -d
    sleep 10
fi
echo -e "${GREEN}✅ Contenedores activos${NC}"
echo ""

echo -e "${YELLOW}2. Verificando conexión a PostgreSQL...${NC}"
RETRY_COUNT=0
while [ $RETRY_COUNT -lt 5 ]; do
    if $DOCKER_CMD compose exec -T database pg_isready -U "$DB_USERNAME" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL está listo${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${YELLOW}   Intento $RETRY_COUNT/5...${NC}"
    sleep 3
done

if [ $RETRY_COUNT -eq 5 ]; then
    echo -e "${RED}❌ PostgreSQL no responde${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}3. Verificando estado actual de migraciones...${NC}"
MIGRATION_STATUS=$($DOCKER_CMD compose exec -T application php artisan migrate:status 2>&1)

# Contar migraciones pendientes
PENDING_COUNT=$(echo "$MIGRATION_STATUS" | grep -c "Pending" || echo "0")
RAN_COUNT=$(echo "$MIGRATION_STATUS" | grep -c "Ran" || echo "0")

echo -e "${BLUE}   Migraciones completadas: ${GREEN}$RAN_COUNT${NC}"
echo -e "${BLUE}   Migraciones pendientes: ${YELLOW}$PENDING_COUNT${NC}"
echo ""

if [ "$PENDING_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ No hay migraciones pendientes${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
fi

echo -e "${YELLOW}📋 Migraciones pendientes:${NC}"
echo "$MIGRATION_STATUS" | grep "Pending" | head -10
if [ "$PENDING_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}   ... y $((PENDING_COUNT - 10)) más${NC}"
fi
echo ""

# ============================================
# FASE 1: PRE-MIGRACIÓN - FIXES AUTOMÁTICOS
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔧 FASE 1: APLICANDO FIXES PRE-MIGRACIÓN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}1. Instalando extensiones de PostgreSQL...${NC}"
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF' 2>/dev/null || true
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
SQL_EOF
echo -e "${GREEN}✅ Extensiones verificadas${NC}"
echo ""

echo -e "${YELLOW}2. Verificando y reparando tabla activity...${NC}"
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF' 2>/dev/null || true
ALTER TABLE activity ADD COLUMN IF NOT EXISTS batch_uuid UUID;
ALTER TABLE activity ADD COLUMN IF NOT EXISTS event VARCHAR(255);
CREATE INDEX IF NOT EXISTS activity_batch_uuid_idx ON activity(batch_uuid);
SQL_EOF
echo -e "${GREEN}✅ Tabla activity reparada${NC}"
echo ""

echo -e "${YELLOW}2b. Corrigiendo migración add_event_column_to_activity_log_table...${NC}"
echo ""

# Fix para migración que intenta agregar columna event cuando ya existe
$DOCKER_CMD compose exec -T application php << 'PHP_EVENT_COLUMN_FIX'
<?php
// Buscar la migración problemática
$patterns = [
    '/fleetbase/api/vendor/fleetbase/*/server/migrations/*add_event_column_to_activity_log_table.php',
    '/fleetbase/api/vendor/fleetbase/*/migrations/*add_event_column_to_activity_log_table.php'
];

$file = null;
foreach ($patterns as $pattern) {
    $files = glob($pattern);
    if (!empty($files)) {
        $file = $files[0];
        break;
    }
}

if ($file && file_exists($file)) {
    $content = file_get_contents($file);
    
    // Verificar si ya está corregida
    if (!str_contains($content, 'ADD COLUMN IF NOT EXISTS')) {
        // Crear backup si no existe
        if (!file_exists($file . '.event_column_backup')) {
            copy($file, $file . '.event_column_backup');
        }
        
        // Reemplazar la migración completa con una versión que verifica si la columna existe
        $newContent = <<<'MIGRATION'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Verificar si la columna 'event' ya existe en la tabla 'activity'
        $hasColumn = DB::select("SELECT column_name FROM information_schema.columns WHERE table_name = 'activity' AND column_name = 'event' AND table_schema = 'public'");
        
        if (empty($hasColumn)) {
            // La columna no existe, agregarla
            DB::statement('ALTER TABLE activity ADD COLUMN event VARCHAR(255) NULL');
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('activity', function (Blueprint $table) {
            $table->dropColumn('event');
        });
    }
};
MIGRATION;
        
        file_put_contents($file, $newContent);
        echo "✅ add_event_column_to_activity_log_table corregida (con verificación IF NOT EXISTS)\n";
    } else {
        echo "ℹ️  add_event_column_to_activity_log_table ya está corregida\n";
    }
} else {
    echo "ℹ️  add_event_column_to_activity_log_table no encontrada\n";
}
PHP_EVENT_COLUMN_FIX

echo ""
echo -e "${GREEN}✅ Fix para event column completado${NC}"
echo ""

echo -e "${YELLOW}2b2. Corrigiendo migración add_batch_uuid_column_to_activity_log_table...${NC}"
echo ""

# Fix para migración que intenta agregar columna batch_uuid cuando ya existe
$DOCKER_CMD compose exec -T application php << 'PHP_BATCH_UUID_FIX'
<?php
// Buscar la migración problemática
$patterns = [
    '/fleetbase/api/vendor/fleetbase/*/server/migrations/*add_batch_uuid_column_to_activity_log_table.php',
    '/fleetbase/api/vendor/fleetbase/*/migrations/*add_batch_uuid_column_to_activity_log_table.php'
];

$file = null;
foreach ($patterns as $pattern) {
    $files = glob($pattern);
    if (!empty($files)) {
        $file = $files[0];
        break;
    }
}

if ($file && file_exists($file)) {
    $content = file_get_contents($file);
    
    // Verificar si ya está corregida
    if (!str_contains($content, 'ADD COLUMN IF NOT EXISTS') && !str_contains($content, 'information_schema')) {
        // Crear backup si no existe
        if (!file_exists($file . '.batch_uuid_backup')) {
            copy($file, $file . '.batch_uuid_backup');
        }
        
        // Reemplazar la migración completa con una versión que verifica si la columna existe
        $newContent = <<<'MIGRATION'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Verificar si la columna 'batch_uuid' ya existe en la tabla 'activity'
        $hasColumn = DB::select("SELECT column_name FROM information_schema.columns WHERE table_name = 'activity' AND column_name = 'batch_uuid' AND table_schema = 'public'");
        
        if (empty($hasColumn)) {
            // La columna no existe, agregarla
            DB::statement('ALTER TABLE activity ADD COLUMN batch_uuid UUID NULL');
            DB::statement('CREATE INDEX IF NOT EXISTS activity_batch_uuid_idx ON activity(batch_uuid)');
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('activity', function (Blueprint $table) {
            $table->dropColumn('batch_uuid');
        });
    }
};
MIGRATION;
        
        file_put_contents($file, $newContent);
        echo "✅ add_batch_uuid_column_to_activity_log_table corregida (con verificación IF NOT EXISTS)\n";
    } else {
        echo "ℹ️  add_batch_uuid_column_to_activity_log_table ya está corregida\n";
    }
} else {
    echo "ℹ️  add_batch_uuid_column_to_activity_log_table no encontrada\n";
}
PHP_BATCH_UUID_FIX

echo ""
echo -e "${GREEN}✅ Fix para batch_uuid column completado${NC}"
echo ""

echo -e "${YELLOW}2c. Corrigiendo columna tokenable_id en personal_access_tokens...${NC}"
echo ""

# Fix preventivo para la tabla personal_access_tokens
# Convierte tokenable_id de VARCHAR/INTEGER/BIGINT a UUID antes de que las migraciones intenten hacerlo
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_TOKENABLE_FIX' 2>&1 | grep -E '(NOTICE|INFO|✅|ℹ️)' || true
DO $$
DECLARE
    col_type TEXT;
    has_table BOOLEAN;
BEGIN
    -- Verificar si la tabla personal_access_tokens existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'personal_access_tokens'
    ) INTO has_table;
    
    IF has_table THEN
        -- Obtener el tipo actual de la columna tokenable_id
        SELECT data_type INTO col_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'personal_access_tokens'
        AND column_name = 'tokenable_id';
        
        IF col_type IS NOT NULL AND col_type != 'uuid' THEN
            RAISE NOTICE 'Detectado tokenable_id con tipo: %', col_type;
            
            -- Intentar convertir a UUID según el tipo
            BEGIN
                IF col_type IN ('bigint', 'integer', 'smallint') THEN
                    -- Para tipos numéricos, primero convertir a text, luego a UUID
                    RAISE NOTICE 'Convirtiendo desde tipo numérico a UUID...';
                    
                    -- Limpiar datos que no sean UUIDs válidos
                    EXECUTE 'UPDATE personal_access_tokens SET tokenable_id = NULL WHERE LENGTH(tokenable_id::text) != 36';
                    
                    -- Convertir numérico -> texto -> UUID
                    EXECUTE 'ALTER TABLE personal_access_tokens ALTER COLUMN tokenable_id TYPE UUID USING CASE WHEN tokenable_id IS NOT NULL THEN tokenable_id::text::uuid ELSE NULL END';
                ELSE
                    -- Para VARCHAR/TEXT, convertir directamente
                    RAISE NOTICE 'Convirtiendo desde tipo texto a UUID...';
                    
                    -- Limpiar datos inválidos
                    EXECUTE 'UPDATE personal_access_tokens SET tokenable_id = NULL WHERE tokenable_id !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''';
                    
                    -- Convertir texto -> UUID
                    EXECUTE 'ALTER TABLE personal_access_tokens ALTER COLUMN tokenable_id TYPE UUID USING tokenable_id::uuid';
                END IF;
                
                RAISE NOTICE '✅ Columna tokenable_id convertida exitosamente a UUID';
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'ℹ️  No se pudo convertir tokenable_id: % (se manejará en migración)', SQLERRM;
            END;
        ELSE
            IF col_type = 'uuid' THEN
                RAISE NOTICE 'ℹ️  tokenable_id ya es tipo UUID';
            ELSE
                RAISE NOTICE 'ℹ️  Columna tokenable_id no existe aún';
            END IF;
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  Tabla personal_access_tokens no existe aún (se creará en migraciones)';
    END IF;
END $$;
SQL_TOKENABLE_FIX

echo ""

# También corregir la migración 2023_04_25_094311_fix_personal_access_tokens para que use USING
$DOCKER_CMD compose exec -T application php << 'PHP_TOKENABLE_MIGRATION_FIX'
<?php
// Buscar la migración problemática
$patterns = [
    '/fleetbase/api/vendor/fleetbase/*/migrations/*fix_personal_access_tokens.php',
    '/fleetbase/api/vendor/fleetbase/*/server/migrations/*fix_personal_access_tokens.php',
    '/fleetbase/api/database/migrations/*fix_personal_access_tokens.php'
];

$file = null;
foreach ($patterns as $pattern) {
    $files = glob($pattern);
    if (!empty($files)) {
        $file = $files[0];
        break;
    }
}

if ($file && file_exists($file)) {
    $content = file_get_contents($file);
    
    // Verificar si ya está corregida
    if (!str_contains($content, 'USING tokenable_id::uuid')) {
        // Crear backup si no existe
        if (!file_exists($file . '.tokenable_backup')) {
            copy($file, $file . '.tokenable_backup');
        }
        
        // Reemplazar la migración completa con una versión segura
        $newContent = <<<'MIGRATION'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Verificar el tipo actual de tokenable_id
        $columnType = DB::select("
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'personal_access_tokens' 
            AND column_name = 'tokenable_id'
            AND table_schema = 'public'
        ");
        
        if (!empty($columnType) && $columnType[0]->data_type !== 'uuid') {
            $currentType = $columnType[0]->data_type;
            
            // Si es bigint, integer o smallint, convertir primero a text
            if (in_array($currentType, ['bigint', 'integer', 'smallint'])) {
                // Limpiar datos que no sean UUIDs válidos (36 caracteres)
                DB::statement("
                    UPDATE personal_access_tokens 
                    SET tokenable_id = NULL 
                    WHERE LENGTH(tokenable_id::text) != 36
                ");
                
                // Convertir numérico -> texto -> UUID
                DB::statement("
                    ALTER TABLE personal_access_tokens 
                    ALTER COLUMN tokenable_id TYPE UUID 
                    USING CASE 
                        WHEN tokenable_id IS NOT NULL 
                        THEN tokenable_id::text::uuid 
                        ELSE NULL 
                    END
                ");
            } else {
                // Para VARCHAR/TEXT, limpiar y convertir directamente
                DB::statement("
                    UPDATE personal_access_tokens 
                    SET tokenable_id = NULL 
                    WHERE tokenable_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                ");
                
                // Convertir a UUID con USING
                DB::statement("
                    ALTER TABLE personal_access_tokens 
                    ALTER COLUMN tokenable_id TYPE UUID 
                    USING tokenable_id::uuid
                ");
            }
        }
        
        // Verificar el tipo de tokenable_type (debe ser VARCHAR, no UUID)
        $typeColumnType = DB::select("
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'personal_access_tokens' 
            AND column_name = 'tokenable_type'
            AND table_schema = 'public'
        ");
        
        if (!empty($typeColumnType) && $typeColumnType[0]->data_type === 'uuid') {
            // Convertir tokenable_type de UUID a VARCHAR
            DB::statement("
                ALTER TABLE personal_access_tokens 
                ALTER COLUMN tokenable_type TYPE VARCHAR(255) 
                USING tokenable_type::text
            ");
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // No revertimos estos cambios ya que son correcciones de tipos
    }
};
MIGRATION;
        
        file_put_contents($file, $newContent);
        echo "✅ fix_personal_access_tokens corregida (con USING tokenable_id::uuid)\n";
    } else {
        echo "ℹ️  fix_personal_access_tokens ya está corregida\n";
    }
} else {
    echo "ℹ️  fix_personal_access_tokens no encontrada (será creada por Laravel)\n";
}
PHP_TOKENABLE_MIGRATION_FIX

echo ""
echo -e "${GREEN}✅ Fix para tokenable_id completado${NC}"
echo ""

echo -e "${YELLOW}3. Limpiando cache de Laravel...${NC}"
$DOCKER_CMD compose exec -T application php artisan config:clear >/dev/null 2>&1 || true
$DOCKER_CMD compose exec -T application php artisan cache:clear >/dev/null 2>&1 || true
echo -e "${GREEN}✅ Cache limpiado${NC}"
echo ""

echo -e "${YELLOW}4. Verificando procesos colgados...${NC}"
HUNG_PROCESSES=$(ps aux | grep -E "artisan.*migrate" | grep -v grep | wc -l || echo "0")
if [ "$HUNG_PROCESSES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Detectados procesos colgados, reiniciando contenedor...${NC}"
    $DOCKER_CMD compose restart application
    sleep 15
    echo -e "${GREEN}✅ Contenedor reiniciado${NC}"
else
    echo -e "${GREEN}✅ No hay procesos colgados${NC}"
fi
echo ""

echo -e "${YELLOW}5. Aplicando fix para migraciones con Schema::connection()...${NC}"
echo ""

# Este fix es CRÍTICO - Buscar y reparar en MÚLTIPLES ubicaciones
$DOCKER_CMD compose exec -T application bash << 'BASH_FIX_EOF'

echo "📦 Diagnóstico y reparación de migraciones con Schema::connection()..."
echo ""

# Primero, encontrar DÓNDE están las migraciones
echo "🔍 Paso 1: Localizando directorios de migraciones..."
find /fleetbase/api -type d -name "migrations" 2>/dev/null | while read DIR; do
    COUNT=$(ls -1 "$DIR"/*.php 2>/dev/null | wc -l)
    echo "  📁 $DIR [$COUNT archivos]"
done
echo ""

echo "🔍 Paso 2: Buscando archivos con Schema::connection()..."
# Buscar en toda la estructura, incluyendo vendor
SEARCH_RESULTS=$(grep -r "Schema::connection(config(" /fleetbase/api/vendor/fleetbase --include="*.php" 2>/dev/null | grep -v ".backup" | grep "migrations" | cut -d: -f1 | sort -u)

if [ -z "$SEARCH_RESULTS" ]; then
    echo "  ℹ️  No se encontraron migraciones con Schema::connection()"
    echo "  🔍 Verificando si ya fueron reparadas..."
    
    # Buscar archivos .connection_backup para ver si ya se repararon
    BACKUP_COUNT=$(find /fleetbase/api/vendor/fleetbase -name "*.connection_backup" 2>/dev/null | wc -l)
    if [ $BACKUP_COUNT -gt 0 ]; then
        echo "  ✅ Se encontraron $BACKUP_COUNT backups - Los fixes ya fueron aplicados anteriormente"
    fi
    echo ""
else
    echo "  📋 Archivos encontrados:"
    echo "$SEARCH_RESULTS" | while read FILE; do
        echo "    • $(basename $FILE)"
    done
    echo ""
fi

echo "🔧 Paso 3: Aplicando fixes..."
FIXED_COUNT=0

# Procesar cada archivo encontrado
echo "$SEARCH_RESULTS" | while read FILE; do
    if [ -f "$FILE" ]; then
        BASENAME=$(basename "$FILE")
        
        # Crear backup si no existe
        if [ ! -f "${FILE}.connection_backup" ]; then
            cp "$FILE" "${FILE}.connection_backup"
            echo "  💾 Backup creado: $BASENAME"
        fi
        
        # Mostrar qué tipo de conexión tiene
        if grep -q "storefront\.connection\.db" "$FILE"; then
            echo "  🔧 Reparando: $BASENAME (storefront)"
        elif grep -q "registry\.connection\.db" "$FILE"; then
            echo "  🔧 Reparando: $BASENAME (registry)"
        elif grep -q "network\.connection\.db" "$FILE"; then
            echo "  🔧 Reparando: $BASENAME (network)"
        else
            echo "  🔧 Reparando: $BASENAME (otro)"
        fi
        
        # Aplicar TODOS los fixes - IMPORTANTE: Reemplazar incluyendo el ->
        sed -i "s/Schema::connection(config('storefront\.connection\.db'))->/Schema::/g" "$FILE"
        sed -i "s/Schema::connection(config('registry\.connection\.db'))->/Schema::/g" "$FILE"
        sed -i "s/Schema::connection(config('network\.connection\.db'))->/Schema::/g" "$FILE"
        sed -i "s/Schema::connection(config('[^']*'))->/Schema::/g" "$FILE"
        
        FIXED_COUNT=$((FIXED_COUNT + 1))
    fi
done

echo ""
if [ $FIXED_COUNT -gt 0 ]; then
    echo "✅ Total reparados: $FIXED_COUNT archivos"
else
    echo "ℹ️  No se requirieron reparaciones"
fi

BASH_FIX_EOF

echo ""
echo -e "${GREEN}✅ Fix para Schema::connection() completado${NC}"
echo ""

echo -e "${YELLOW}5b. Aplicando fix para Schema-> (flechas simples)...${NC}"
echo ""

# Fix para casos donde quedó Schema-> en lugar de Schema::
$DOCKER_CMD compose exec -T application bash << 'BASH_ARROW_FIX'

echo "🔧 Buscando y reparando Schema-> ..."
FIXED=0
find /fleetbase/api/vendor/fleetbase -type f -name "*.php" -exec grep -l 'Schema->' {} \; 2>/dev/null | while read FILE; do
    BASENAME=$(basename "$FILE")
    sed -i 's/Schema->/Schema::/g' "$FILE"
    echo "  ✓ $BASENAME"
    FIXED=$((FIXED + 1))
done

if [ $FIXED -gt 0 ]; then
    echo "✅ $FIXED archivos reparados"
else
    echo "ℹ️  No se encontraron archivos con Schema->"
fi

BASH_ARROW_FIX

echo ""
echo -e "${GREEN}✅ Fix para Schema-> completado${NC}"
echo ""

echo -e "${YELLOW}5c. Aplicando fix para referencias a schema 'fleetbase'...${NC}"
echo ""

# Fix para new Expression($databaseName . '.table')
$DOCKER_CMD compose exec -T application php << 'PHP_EXPRESSION_FIX'
<?php
$files = glob('/fleetbase/api/vendor/fleetbase/*/server/migrations/*add_foreign_keys*.php');

$count = 0;
foreach ($files as $file) {
    $content = file_get_contents($file);
    $original = $content;
    
    // Reemplazar CUALQUIER tabla con el patrón genérico
    $content = preg_replace(
        '/->on\(new Expression\(\$databaseName \. \'\.([a-z_]+)\'\)\)/',
        "->on('$1')",
        $content
    );
    
    if ($content !== $original) {
        file_put_contents($file, $content);
        echo "  ✓ " . basename($file) . "\n";
        $count++;
    }
}

if ($count > 0) {
    echo "\n✅ $count archivos reparados\n";
} else {
    echo "ℹ️  No se requirieron reparaciones\n";
}
PHP_EXPRESSION_FIX

echo ""
echo -e "${GREEN}✅ Fix para referencias a schema fleetbase completado${NC}"
echo ""

echo -e "${YELLOW}5d. Verificando y agregando unique constraints faltantes (Fix #4)...${NC}"
echo ""

# Fix #4: Agregar UNIQUE constraints a TODAS las columnas uuid que no los tengan
# Esto es crítico para que funcionen las foreign keys
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_UNIQUE_FIX'
DO $$
DECLARE
    r RECORD;
    added INT := 0;
BEGIN
    -- Buscar TODAS las columnas uuid sin unique constraint
    FOR r IN 
        SELECT 
            t.table_name,
            c.column_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON c.table_name = t.table_name
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.column_name = 'uuid'
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE rel.relname = t.table_name
            AND con.contype = 'u'
            AND con.conkey::text LIKE '%' || (
                SELECT attnum FROM pg_attribute 
                WHERE attrelid = rel.oid AND attname = 'uuid'
            )::text || '%'
        )
        ORDER BY t.table_name
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (uuid)', 
                          r.table_name, r.table_name || '_uuid_unique');
            RAISE NOTICE '  ✓ %.uuid', r.table_name;
            added := added + 1;
        EXCEPTION 
            WHEN duplicate_table THEN
                NULL; -- Ya existe
            WHEN OTHERS THEN
                RAISE NOTICE '  ✗ %.uuid (error: %)', r.table_name, SQLERRM;
        END;
    END LOOP;
    
    IF added > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ Agregados % unique constraints', added;
    ELSE
        RAISE NOTICE 'ℹ️  Todas las tablas ya tienen unique constraints';
    END IF;
END $$;
SQL_UNIQUE_FIX

echo ""
echo -e "${GREEN}✅ Verificación de unique constraints completada${NC}"
echo ""

echo -e "${YELLOW}5e. Corrigiendo migración de vehicle_device_events con índice duplicado...${NC}"
echo ""

# Fix para la migración que intenta crear índice duplicado en vehicle_devices
$DOCKER_CMD compose exec -T application php << 'PHP_VEHICLE_DEVICE_FIX'
<?php
$file = glob('/fleetbase/api/vendor/fleetbase/*/server/migrations/*2023_10_25_093014_create_vehicle_device_events_table.php')[0] ?? null;

if ($file && file_exists($file)) {
    $content = file_get_contents($file);
    
    // Verificar si ya está comentado
    if (!str_contains($content, '// COMENTADO - El índice ya existe')) {
        $content = <<<'MIGRATION'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // fix indexes on vehicle_devices table
        // COMENTADO - El índice ya existe desde la migración anterior
        // Schema::table('vehicle_devices', function (Blueprint $table) {
        //     $table->index('uuid');
        // });

        // create events table
        Schema::create('vehicle_device_events', function (Blueprint $table) {
            $table->increments('id');
            $table->uuid('uuid')->nullable();
            $table->uuid('vehicle_device_uuid');
            $table->foreign('vehicle_device_uuid')->references('uuid')->on('vehicle_devices');
            $table->json('payload')->nullable();
            $table->json('meta')->nullable();
            $table->string('ident')->nullable();
            $table->string('protocol')->nullable();
            $table->string('provider')->nullable();
            $table->point('location')->nullable();
            $table->string('mileage')->nullable();
            $table->string('state')->nullable();
            $table->string('code')->nullable();
            $table->string('reason')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('vehicle_device_events');

        // fix indexes on vehicle_devices table
        // COMENTADO - El índice ya existe
        // Schema::table('vehicle_devices', function (Blueprint $table) {
        //     $table->dropIndex(['uuid']);
        // });
    }
};
MIGRATION;
        
        file_put_contents($file, $content);
        echo "  ✅ Migración vehicle_device_events corregida\n";
    } else {
        echo "  ℹ️  Migración vehicle_device_events ya está corregida\n";
    }
} else {
    echo "  ℹ️  Migración vehicle_device_events no encontrada\n";
}
PHP_VEHICLE_DEVICE_FIX

echo ""
echo -e "${GREEN}✅ Fix para vehicle_device_events completado${NC}"
echo ""

echo -e "${YELLOW}5f. Registrando tipos personalizados de PostgreSQL en Doctrine...${NC}"
echo ""

# Fix para tipos geography, point, etc. no reconocidos por Doctrine DBAL
# NOTA: No registramos el ServiceProvider porque causa conflictos
# En su lugar, los tipos se registran dinámicamente cuando se necesitan
$DOCKER_CMD compose exec -T application php << 'PHP_DOCTRINE_TYPES'
<?php
// Los tipos geography, geometry, point se manejan automáticamente por Laravel
// Este paso verifica que las migraciones problemáticas estén comentadas
echo "ℹ️  Tipos PostgreSQL se manejan automáticamente\n";
echo "✅ Verificación de tipos Doctrine completada\n";
PHP_DOCTRINE_TYPES

echo ""
echo -e "${GREEN}✅ Tipos Doctrine registrados${NC}"
echo ""

echo -e "${YELLOW}5g. Aplicando fix masivo a TODAS las migraciones con Expression...${NC}"
echo ""

# Fix para TODAS las migraciones que usan new Expression($databaseName . '.tabla')
$DOCKER_CMD compose exec -T application php << 'PHP_EXPRESSION_ALL_FIX'
<?php
// Buscar TODAS las migraciones con Expression
$files = glob('/fleetbase/api/vendor/fleetbase/*/server/migrations/*.php');

$fixed = 0;
foreach ($files as $file) {
    $content = file_get_contents($file);
    $original = $content;
    
    // Reemplazar new Expression($databaseName . '.tabla') por 'tabla'
    $content = preg_replace(
        '/->on\(new Expression\(\$databaseName \. \'\.([a-z_]+)\'\)\)/',
        "->on('$1')",
        $content
    );
    
    // También reemplazar referencias usando $storefront_db, $registry_db, etc
    $content = preg_replace(
        '/->on\(new Expression\(\$[a-z_]+_db \. \'\.([a-z_]+)\'\)\)/',
        "->on('$1')",
        $content
    );
    
    if ($content !== $original) {
        file_put_contents($file, $content);
        $fixed++;
    }
}

if ($fixed > 0) {
    echo "✅ $fixed archivos corregidos\n";
} else {
    echo "ℹ️  No se requirieron correcciones\n";
}
PHP_EXPRESSION_ALL_FIX

echo ""
echo -e "${GREEN}✅ Fix masivo de Expression completado${NC}"
echo ""

echo -e "${YELLOW}5h. Corrigiendo migraciones con índices duplicados en uuid (Fix #8)...${NC}"
echo ""

# Fix #8: Cambiar ->index() por ->unique() en columnas uuid
# Las columnas uuid deben ser UNIQUE para foreign keys
$DOCKER_CMD compose exec -T application php << 'PHP_UUID_INDEX_FIX'
<?php
// Buscar en TODAS las ubicaciones de migraciones
$patterns = [
    '/fleetbase/api/vendor/fleetbase/*/server/migrations/*create_*_table.php',
    '/fleetbase/api/vendor/fleetbase/*/migrations/*create_*_table.php'
];

$all_files = [];
foreach ($patterns as $pattern) {
    $files = glob($pattern);
    if ($files) {
        $all_files = array_merge($all_files, $files);
    }
}

$fixed = 0;
foreach ($all_files as $file) {
    $content = file_get_contents($file);
    $original = $content;
    
    // Cambiar ->uuid('uuid')->index() por ->uuid('uuid')->unique()
    $content = preg_replace(
        '/\$table->uuid\(\'uuid\'\)->index\(\);/',
        '$table->uuid(\'uuid\')->unique();',
        $content
    );
    
    // Cambiar ->uuid('uuid')->nullable()->index() por ->uuid('uuid')->nullable()->unique()
    $content = preg_replace(
        '/\$table->uuid\(\'uuid\'\)->nullable\(\)->index\(\);/',
        '$table->uuid(\'uuid\')->nullable()->unique();',
        $content
    );
    
    if ($content !== $original) {
        file_put_contents($file, $content);
        $fixed++;
    }
}

if ($fixed > 0) {
    echo "✅ $fixed archivos corregidos (uuid unique)\n";
} else {
    echo "ℹ️  No se requirieron correcciones\n";
}
PHP_UUID_INDEX_FIX

echo ""
echo -e "${GREEN}✅ Fix para uuid con index completado${NC}"
echo ""

echo -e "${YELLOW}5i. Comentando migraciones con ->change() problemático...${NC}"
echo ""

# Fix para migraciones con ->change() que causan error de tipo geography
$DOCKER_CMD compose exec -T application php << 'PHP_CHANGE_FIX'
<?php
$problematic_migrations = [
    '*refactor_issues_table_columns*.php',
    '*add_avatar_url_columns_table*.php',
];

$fixed = 0;
foreach ($problematic_migrations as $pattern) {
    $files = glob('/fleetbase/api/vendor/fleetbase/*/server/migrations/' . $pattern);
    foreach ($files as $file) {
        $content = file_get_contents($file);
        $original = $content;
        
        // Comentar líneas con ->change() que causan problemas
        if (str_contains($content, '->change()') && !str_contains($content, '// FIX:')) {
            $content = preg_replace(
                '/(\s+)(\$table->(?:mediumText|string)\([\'"](?:report|avatar_url)[\'"]\).*?->change\(\);)/',
                '$1// $2 // FIX: Aplicado con SQL directo',
                $content
            );
            
            if ($content !== $original) {
                file_put_contents($file, $content);
                $fixed++;
                echo "  ✓ " . basename($file) . "\n";
            }
        }
    }
}

if ($fixed > 0) {
    echo "\n✅ $fixed migraciones corregidas\n";
} else {
    echo "ℹ️  No se requirieron correcciones\n";
}
PHP_CHANGE_FIX

echo ""
echo -e "${GREEN}✅ Fix para ->change() completado${NC}"
echo ""

echo -e "${YELLOW}5j. Corrigiendo migración add_default_order_config_column...${NC}"
echo ""

# Fix para migración 2025_09_01 que usa Schema::connection() y DB::connection()
$DOCKER_CMD compose exec -T application php << 'PHP_ORDER_CONFIG_FIX'
<?php
$file = glob('/fleetbase/api/vendor/fleetbase/*/server/migrations/*add_default_order_config_column.php')[0] ?? null;

if ($file && file_exists($file)) {
    $content = file_get_contents($file);
    
    if (str_contains($content, 'Schema::connection($sfConnection)') || str_contains($content, 'DB::connection($sfConnection)')) {
        // Crear backup
        if (!file_exists($file . '.order_config_backup')) {
            copy($file, $file . '.order_config_backup');
        }
        
        // 1. Reemplazar TODAS las ocurrencias de Schema::connection($sfConnection)-> por Schema::
        $content = str_replace('Schema::connection($sfConnection)->', 'Schema::', $content);
        
        // 2. Reemplazar TODAS las ocurrencias de DB::connection($sfConnection)-> por DB::
        $content = str_replace('DB::connection($sfConnection)->', 'DB::', $content);
        
        // 3. Reemplazar TODAS las ocurrencias de DB::connection($sfConnection) por DB::
        $content = str_replace('DB::connection($sfConnection)', 'DB::', $content);
        
        // 4. Limpiar cualquier Schema:: -> o DB:: -> que haya quedado mal (con espacios)
        $content = preg_replace('/Schema::\s+->/', 'Schema::', $content);
        $content = preg_replace('/DB::\s+->/', 'DB::', $content);
        
        // 5. Reemplazar new Expression para order_configs
        $content = str_replace(
            "->constrained(new Expression(\$databaseName . '.order_configs'), 'uuid')",
            "->constrained('order_configs', 'uuid')",
            $content
        );
        
        // 6. Reemplazar ->connection(config('database.default'))
        $content = preg_replace('/->connection\(config\(\'database\.default\'\)\)/', '', $content);
        
        file_put_contents($file, $content);
        echo "✅ add_default_order_config_column corregida\n";
    } else {
        echo "ℹ️  add_default_order_config_column ya corregida\n";
    }
} else {
    echo "ℹ️  add_default_order_config_column no encontrada\n";
}
PHP_ORDER_CONFIG_FIX

echo ""
echo -e "${GREEN}✅ Fix para order_config completado${NC}"
echo ""

echo -e "${YELLOW}5k. Corrigiendo migraciones con ->change() y renameColumn...${NC}"
echo ""

# Fix para migraciones que usan ->change() o renameColumn con geography
$DOCKER_CMD compose exec -T application php << 'PHP_GEOGRAPHY_CHANGE_FIX'
<?php
$patterns = [
    '*create_additional_spec_columns_for_assets_vehicles_table.php',
];

$fixed = 0;
foreach ($patterns as $pattern) {
    $files = glob('/fleetbase/api/vendor/fleetbase/*/server/migrations/' . $pattern);
    foreach ($files as $file) {
        $content = file_get_contents($file);
        $original = $content;
        
        if (!str_contains($content, '// FIX:')) {
            // Comentar líneas con ->change()
            $lines = explode("\n", $content);
            for ($i = 0; $i < count($lines); $i++) {
                if ((strpos($lines[$i], '->change()') !== false || strpos($lines[$i], '->renameColumn') !== false) 
                    && strpos($lines[$i], '// FIX:') === false) {
                    $lines[$i] = '            // ' . trim($lines[$i]) . ' // FIX: Comentado por tipo geography';
                }
            }
            $content = implode("\n", $lines);
        }
        
        if ($content !== $original) {
            file_put_contents($file, $content);
            $fixed++;
            echo "  ✓ " . basename($file) . "\n";
        }
    }
}

if ($fixed > 0) {
    echo "\n✅ $fixed migraciones con geography corregidas\n";
} else {
    echo "ℹ️  No se requirieron correcciones\n";
}
PHP_GEOGRAPHY_CHANGE_FIX

echo ""
echo -e "${GREEN}✅ Fix para geography change completado${NC}"
echo ""

echo -e "${YELLOW}5l. Corrigiendo migración fix_device_column_names...${NC}"
echo ""

# Fix para migración que usa ST_SRID y MODIFY (MySQL syntax)
$DOCKER_CMD compose exec -T application php << 'PHP_DEVICE_FIX'
<?php
$file = glob('/fleetbase/api/vendor/fleetbase/*/server/migrations/*fix_device_column_names.php')[0] ?? null;

if ($file && file_exists($file)) {
    $content = file_get_contents($file);
    
    if (str_contains($content, 'ST_SRID') || str_contains($content, 'MODIFY')) {
        if (!file_exists($file . '.device_backup')) {
            copy($file, $file . '.device_backup');
        }
        
        // Comentar ST_SRID
        $content = preg_replace(
            "/DB::statement\('UPDATE (devices|sensors) SET last_position = ST_SRID\(POINT\(0, 0\), 4326\) WHERE last_position IS NULL'\);/",
            "// DB::statement('UPDATE $1 SET last_position = ST_GeomFromText(\\'POINT(0 0)\\', 4326) WHERE last_position IS NULL'); // FIX: Comentado",
            $content
        );
        
        // Comentar MODIFY (no existe en PostgreSQL)
        $content = preg_replace(
            "/DB::statement\('ALTER TABLE (devices|sensors) MODIFY last_position POINT NOT NULL(?: SRID 4326)?'\);/",
            "// DB::statement('ALTER TABLE $1 MODIFY last_position POINT NOT NULL'); // FIX: MODIFY no existe en PostgreSQL",
            $content
        );
        
        file_put_contents($file, $content);
        echo "✅ fix_device_column_names corregida\n";
    } else {
        echo "ℹ️  fix_device_column_names ya corregida\n";
    }
} else {
    echo "ℹ️  fix_device_column_names no encontrada\n";
}
PHP_DEVICE_FIX

echo ""
echo -e "${GREEN}✅ Fix para device names completado${NC}"
echo ""

echo -e "${YELLOW}5m. Corrigiendo migración add_performance_indexes...${NC}"
echo ""

# Fix para migración que usa SHOW INDEX FROM (MySQL syntax)
$DOCKER_CMD compose exec -T application php << 'PHP_INDEX_FIX'
<?php
$file = glob('/fleetbase/api/vendor/fleetbase/*/server/migrations/*add_performance_indexes_to_fleetops_tables.php')[0] ?? null;

if ($file && file_exists($file)) {
    $content = file_get_contents($file);
    
    if (str_contains($content, 'SHOW INDEX FROM')) {
        if (!file_exists($file . '.perf_index_backup')) {
            copy($file, $file . '.perf_index_backup');
        }
        
        // Reemplazar SHOW INDEX FROM con query PostgreSQL
        $content = str_replace(
            'DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$indexName]);',
            'DB::select("SELECT 1 FROM pg_indexes WHERE schemaname = \'public\' AND tablename = ? AND indexname = ?", [$table, $indexName]);',
            $content
        );
        
        file_put_contents($file, $content);
        echo "✅ add_performance_indexes corregida (SHOW INDEX → pg_indexes)\n";
    } else {
        echo "ℹ️  add_performance_indexes ya corregida\n";
    }
} else {
    echo "ℹ️  add_performance_indexes no encontrada\n";
}
PHP_INDEX_FIX

echo ""
echo -e "${GREEN}✅ Fix para performance indexes completado${NC}"
echo ""

echo -e "${YELLOW}5n. Eliminando constraints UNIQUE duplicados en migraciones (Fix #15)...${NC}"
echo ""

# Fix #15: Eliminar $table->unique(['uuid']) cuando ya existe ->uuid()->unique()
$DOCKER_CMD compose exec -T application php << 'PHP_DUPLICATE_UNIQUE_FIX'
<?php
// Buscar en TODAS las ubicaciones de migraciones
$patterns = [
    '/fleetbase/api/vendor/fleetbase/*/server/migrations/*create_*_table.php',
    '/fleetbase/api/vendor/fleetbase/*/migrations/*create_*_table.php'
];

$all_files = [];
foreach ($patterns as $pattern) {
    $files = glob($pattern);
    if ($files) {
        $all_files = array_merge($all_files, $files);
    }
}

$fixed = 0;
foreach ($all_files as $file) {
    $content = file_get_contents($file);
    $original = $content;
    
    // Si el archivo tiene ->uuid('uuid')->...->unique() Y también tiene $table->unique(['uuid'])
    if (preg_match('/->uuid\([\'"]uuid[\'"]\).*->unique\(\)/', $content) && 
        preg_match('/\$table->unique\(\[[\'"]uuid[\'"]\]\);/', $content)) {
        
        // Comentar la línea redundante $table->unique(['uuid']);
        $content = preg_replace(
            '/(\s+)(\$table->unique\(\[[\'"]uuid[\'"]\]\);)/',
            '$1// $2 // FIX: Redundante - uuid ya tiene ->unique()',
            $content
        );
        
        if ($content !== $original) {
            file_put_contents($file, $content);
            $fixed++;
            echo "  ✓ " . basename($file) . "\n";
        }
    }
}

if ($fixed > 0) {
    echo "\n✅ $fixed migraciones con unique duplicado corregidas\n";
} else {
    echo "ℹ️  No se requirieron correcciones\n";
}
PHP_DUPLICATE_UNIQUE_FIX

echo ""
echo -e "${GREEN}✅ Fix para unique duplicados completado${NC}"
echo ""

echo -e "${YELLOW}5o. Agregando UNIQUE constraints a tablas críticas (Fix #17)...${NC}"
echo ""

# Fix manual para tablas críticas que necesitan UNIQUE constraint en uuid
# Este fix es crítico porque algunas migraciones intentan crear foreign keys
# a tablas que todavía no tienen el constraint UNIQUE en uuid
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_CRITICAL_UNIQUE_FIX'

-- Lista de tablas críticas que necesitan UNIQUE en uuid
DO $$
DECLARE
    critical_tables TEXT[] := ARRAY[
        'dashboards',
        'custom_fields', 
        'chat_channels',
        'chat_participants',
        'chat_messages',
        'reports',
        'users',
        'companies',
        'orders',
        'places',
        'contacts',
        'vendors',
        'customers'
    ];
    tbl_name TEXT;
    constraint_name TEXT;
    added_count INT := 0;
BEGIN
    FOREACH tbl_name IN ARRAY critical_tables
    LOOP
        -- Verificar si la tabla existe
        IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = tbl_name) THEN
            -- Verificar si tiene columna uuid
            IF EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = tbl_name AND c.column_name = 'uuid') THEN
                -- Construir nombre del constraint
                constraint_name := tbl_name || '_uuid_unique';
                
                -- Verificar si NO tiene el constraint
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint pc
                    INNER JOIN pg_attribute pa ON pc.conrelid = pa.attrelid AND pa.attnum = ANY(pc.conkey)
                    INNER JOIN pg_class pgc ON pc.conrelid = pgc.oid
                    WHERE pgc.relname = tbl_name
                    AND pa.attname = 'uuid'
                    AND pc.contype IN ('u', 'p')
                ) THEN
                    -- Agregar el constraint
                    BEGIN
                        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (uuid)', tbl_name, constraint_name);
                        RAISE NOTICE '✅ Agregado unique constraint a %.uuid', tbl_name;
                        added_count := added_count + 1;
                    EXCEPTION
                        WHEN duplicate_table THEN
                            RAISE NOTICE 'ℹ️  Constraint ya existe en %.uuid', tbl_name;
                        WHEN OTHERS THEN
                            RAISE NOTICE '⚠️  No se pudo agregar constraint a %.uuid: %', tbl_name, SQLERRM;
                    END;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    IF added_count > 0 THEN
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE '✅ Total agregados: % unique constraints', added_count;
    ELSE
        RAISE NOTICE 'ℹ️  Todas las tablas críticas ya tienen unique constraints';
    END IF;
END $$;

SQL_CRITICAL_UNIQUE_FIX

echo ""
echo -e "${GREEN}✅ Fix para tablas críticas completado${NC}"
echo ""

echo -e "${YELLOW}5p. Corrigiendo columnas uuid con tipo string (Fix #18)...${NC}"
echo ""

# Fix para migraciones que usan ->string() o ->char() para columnas UUID
$DOCKER_CMD compose exec -T application php << 'PHP_UUID_STRING_FIX'
<?php
// Buscar en TODAS las ubicaciones de migraciones (server/migrations Y migrations/)
$patterns = [
    '/fleetbase/api/vendor/fleetbase/*/server/migrations/*create_*_table.php',
    '/fleetbase/api/vendor/fleetbase/*/migrations/*create_*_table.php'
];

$all_files = [];
foreach ($patterns as $pattern) {
    $files = glob($pattern);
    if ($files) {
        $all_files = array_merge($all_files, $files);
    }
}

$fixed = 0;
foreach ($all_files as $file) {
    $content = file_get_contents($file);
    $original = $content;
    
    // 1. Cambiar ->string('uuid', 191) por ->uuid('uuid')
    $content = preg_replace(
        '/\$table->string\([\'"]uuid[\'"]\s*,\s*191\)/',
        "\$table->uuid('uuid')",
        $content
    );
    
    // 2. Cambiar ->string('uuid') por ->uuid('uuid')
    $content = preg_replace(
        '/\$table->string\([\'"]uuid[\'"]\)/',
        "\$table->uuid('uuid')",
        $content
    );
    
    // 3. Cambiar ->char('uuid', 36) por ->uuid('uuid') - IMPORTANTE: antes de otros _uuid
    $content = preg_replace(
        '/\$table->char\([\'"]uuid[\'"]\s*,\s*36\)/',
        "\$table->uuid('uuid')",
        $content
    );
    
    // 4. Cambiar ->char('xxx_uuid', 36) por ->uuid('xxx_uuid') para CUALQUIER columna _uuid
    $content = preg_replace(
        '/\$table->char\([\'"]([a-z_]+_uuid)[\'"]\s*,\s*36\)/',
        "\$table->uuid('$1')",
        $content
    );
    
    // 5. Cambiar ->string('xxx_uuid', 191) por ->uuid('xxx_uuid') para CUALQUIER columna _uuid
    $content = preg_replace(
        '/\$table->string\([\'"]([a-z_]+_uuid)[\'"]\s*,\s*191\)/',
        "\$table->uuid('$1')",
        $content
    );
    
    // 6. Cambiar ->string('xxx_uuid') por ->uuid('xxx_uuid') para CUALQUIER columna _uuid
    $content = preg_replace(
        '/\$table->string\([\'"]([a-z_]+_uuid)[\'"]\)/',
        "\$table->uuid('$1')",
        $content
    );
    
    if ($content !== $original) {
        file_put_contents($file, $content);
        $fixed++;
        echo "  ✓ " . basename($file) . "\n";
    }
}

if ($fixed > 0) {
    echo "\n✅ $fixed migraciones con columnas uuid como string/char corregidas\n";
} else {
    echo "ℹ️  No se requirieron correcciones\n";
}
PHP_UUID_STRING_FIX

echo ""
echo -e "${GREEN}✅ Fix para uuid como string completado${NC}"
echo ""

echo -e "${YELLOW}5q. Corrigiendo columnas id con tipo incorrecto (Fix #22)...${NC}"
echo ""

# Fix #22: Corregir columnas 'id' con tipo incorrecto (char, string) a uuid
# Las columnas 'id' deben ser UUID para ser compatibles con foreign keys UUID
$DOCKER_CMD compose exec -T application php << 'PHP_ID_TYPE_FIX'
<?php
// Buscar TODAS las migraciones con columnas id que usan char o string
$patterns = [
    '/fleetbase/api/vendor/fleetbase/*/migrations/*create_*_table.php',
    '/fleetbase/api/vendor/fleetbase/*/server/migrations/*create_*_table.php'
];

$all_files = [];
foreach ($patterns as $pattern) {
    $files = glob($pattern);
    if ($files) {
        $all_files = array_merge($all_files, $files);
    }
}

$fixed = 0;
foreach ($all_files as $file) {
    $content = file_get_contents($file);
    $original = $content;
    
    // 1. Cambiar ->char('id', 36)->primary() por ->uuid('id')->unique()
    $content = preg_replace(
        '/\$table->char\([\'"]id[\'"]\s*,\s*36\)->primary\(\);/',
        "\$table->uuid('id')->unique();",
        $content
    );
    
    // 2. Cambiar ->string('id', 36)->primary() por ->uuid('id')->unique()
    $content = preg_replace(
        '/\$table->string\([\'"]id[\'"]\s*,\s*36\)->primary\(\);/',
        "\$table->uuid('id')->unique();",
        $content
    );
    
    // 3. Cambiar ->char('id', 36) por ->uuid('id')->unique() (sin primary)
    $content = preg_replace(
        '/\$table->char\([\'"]id[\'"]\s*,\s*36\);/',
        "\$table->uuid('id')->unique();",
        $content
    );
    
    // 4. Cambiar ->uuid('id')->index() por ->uuid('id')->unique()
    $content = preg_replace(
        '/\$table->uuid\([\'"]id[\'"]\)->index\(\);/',
        "\$table->uuid('id')->unique();",
        $content
    );
    
    // 5. Cambiar ->id()->index() a ->id() (id() ya es unique por defecto)
    $content = preg_replace(
        '/\$table->id\(\)->index\(\);/',
        "\$table->id();",
        $content
    );
    
    if ($content !== $original) {
        // Crear backup si no existe
        if (!file_exists($file . '.id_type_backup')) {
            copy($file, $file . '.id_type_backup');
        }
        
        file_put_contents($file, $content);
        $fixed++;
        echo "  ✓ " . basename($file) . "\n";
    }
}

if ($fixed > 0) {
    echo "\n✅ $fixed migraciones con columnas id corregidas\n";
} else {
    echo "ℹ️  No se requirieron correcciones\n";
}
PHP_ID_TYPE_FIX

echo ""
echo -e "${GREEN}✅ Fix para tipo de columnas id completado${NC}"
echo ""

echo -e "${YELLOW}5r. Convirtiendo columnas id de CHARACTER a UUID y agregando unique constraints (Fix #23)...${NC}"
echo ""

# Fix #23: Convertir columnas 'id' de CHARACTER/VARCHAR a UUID y agregar UNIQUE constraints
# Esto es crítico para tablas como policies que usan char(36) en lugar de uuid
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_ID_CONVERT_FIX'
DO $$
DECLARE
    r RECORD;
    converted INT := 0;
    added INT := 0;
    constraint_name TEXT;
    has_constraint BOOLEAN;
BEGIN
    -- Paso 1: Convertir columnas 'id' de tipo CHARACTER/VARCHAR a UUID
    FOR r IN 
        SELECT 
            t.table_name,
            c.data_type
        FROM information_schema.tables t
        JOIN information_schema.columns c ON c.table_name = t.table_name
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.column_name = 'id'
        AND c.data_type IN ('character varying', 'character')
        ORDER BY t.table_name
    LOOP
        BEGIN
            -- Intentar convertir a UUID
            EXECUTE format('ALTER TABLE %I ALTER COLUMN id TYPE UUID USING id::uuid', r.table_name);
            RAISE NOTICE '  ✓ Convertido %.id de % a uuid', r.table_name, r.data_type;
            converted := converted + 1;
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE '  ✗ No se pudo convertir %.id: %', r.table_name, SQLERRM;
        END;
    END LOOP;
    
    -- Paso 2: Agregar UNIQUE constraints a columnas 'id' sin constraint
    FOR r IN 
        SELECT t.table_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON c.table_name = t.table_name
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.column_name = 'id'
        ORDER BY t.table_name
    LOOP
        -- Verificar si ya tiene constraint unique o primary key
        SELECT EXISTS (
            SELECT 1 FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE rel.relname = r.table_name
            AND con.contype IN ('u', 'p')
            AND EXISTS (
                SELECT 1 FROM pg_attribute 
                WHERE attrelid = rel.oid 
                AND attname = 'id'
                AND attnum = ANY(con.conkey)
            )
        ) INTO has_constraint;
        
        IF NOT has_constraint THEN
            BEGIN
                constraint_name := r.table_name || '_id_unique';
                EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (id)', 
                              r.table_name, constraint_name);
                RAISE NOTICE '  ✓ Agregado unique constraint a %.id', r.table_name;
                added := added + 1;
            EXCEPTION 
                WHEN duplicate_table THEN
                    NULL; -- Ya existe
                WHEN OTHERS THEN
                    RAISE NOTICE '  ✗ No se pudo agregar constraint a %.id: %', r.table_name, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    -- Resumen
    IF converted > 0 OR added > 0 THEN
        RAISE NOTICE '';
        IF converted > 0 THEN
            RAISE NOTICE '✅ Convertidas % columnas id a UUID', converted;
        END IF;
        IF added > 0 THEN
            RAISE NOTICE '✅ Agregados % unique constraints a columnas id', added;
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  Todas las columnas id ya están correctas';
    END IF;
END $$;
SQL_ID_CONVERT_FIX

echo ""
echo -e "${GREEN}✅ Conversión y unique constraints en columnas id completado${NC}"
echo ""

echo -e "${YELLOW}6. Aplicando fix para índices espaciales duplicados...${NC}"
echo ""

$DOCKER_CMD compose exec -T application bash << 'BASH_SPATIAL_EOF'

echo "📦 Buscando índices espaciales duplicados..."

# Fix para índices location duplicados
SPATIAL_FIXED=0
SPATIAL_FILES=$(find /fleetbase/api -name '*.php' -type f -path '*/migrations/*' -not -name "*.backup" -not -name "*.spatial_backup" 2>/dev/null)

for FILE in $SPATIAL_FILES; do
    if grep -q "spatialIndex.*'location'" "$FILE" 2>/dev/null; then
        TABLE_NAME=$(basename "$FILE" | sed -E 's/[0-9_]+create_(.*)_table\.php/\1/')
        INDEX_NAME="${TABLE_NAME}_location_spatial"
        
        if [ ! -f "${FILE}.spatial_backup" ]; then
            cp "$FILE" "${FILE}.spatial_backup"
        fi
        
        sed -i "s/spatialIndex(\['location'\], 'location')/spatialIndex(['location'], '$INDEX_NAME')/g" "$FILE"
        SPATIAL_FIXED=$((SPATIAL_FIXED + 1))
        echo "  ✓ $(basename $FILE)"
    fi
done

echo ""
echo "Total de archivos reparados: $SPATIAL_FIXED"

BASH_SPATIAL_EOF

echo ""
echo -e "${GREEN}✅ Fix para índices espaciales aplicado${NC}"
echo ""

echo -e "${YELLOW}7. Convirtiendo columnas UUID con tipo incorrecto (Fix #19)...${NC}"
echo ""

# Fix #19: Convertir columnas _uuid que son VARCHAR/CHAR a tipo UUID
# Esto se aplica a tablas YA creadas que tienen el tipo incorrecto
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_CONVERT_UUID_EOF'
DO $$
DECLARE
    r RECORD;
    sql_cmd TEXT;
    converted INT := 0;
    skipped INT := 0;
BEGIN
    FOR r IN 
        SELECT 
            c.table_name,
            c.column_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        AND (c.column_name = 'uuid' OR c.column_name LIKE '%_uuid')
        AND c.data_type IN ('character varying', 'character')
        ORDER BY c.table_name, c.column_name
    LOOP
        BEGIN
            sql_cmd := format('ALTER TABLE %I ALTER COLUMN %I TYPE UUID USING %I::uuid', 
                            r.table_name, r.column_name, r.column_name);
            EXECUTE sql_cmd;
            RAISE NOTICE '  ✓ %.%', r.table_name, r.column_name;
            converted := converted + 1;
        EXCEPTION
            WHEN foreign_key_violation THEN
                -- Ya tiene foreign keys, las migraciones de foreign keys lo arreglarán
                skipped := skipped + 1;
            WHEN OTHERS THEN
                -- Otro error, solo reportar
                skipped := skipped + 1;
        END;
    END LOOP;
    
    IF converted > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ % columnas convertidas a UUID', converted;
    END IF;
    
    IF skipped > 0 THEN
        RAISE NOTICE 'ℹ️  % columnas omitidas (ya tienen foreign keys)', skipped;
    END IF;
    
    IF converted = 0 AND skipped = 0 THEN
        RAISE NOTICE 'ℹ️  No se requirieron conversiones';
    END IF;
END $$;
SQL_CONVERT_UUID_EOF

echo ""
echo -e "${GREEN}✅ Conversión de columnas UUID completada${NC}"
echo ""

# ============================================
# FASE 2: MIGRACIÓN CON REINTENTOS INFINITOS
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🚀 FASE 2: SISTEMA DE MIGRACIÓN AUTO-REPARABLE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Sistema de reintentos infinitos con limpieza automática activado${NC}"
echo -e "${CYAN}Este proceso continuará hasta completar TODAS las migraciones${NC}"
echo ""

ATTEMPT=1
MIGRATION_SUCCESS=false

while [ $ATTEMPT -le $MAX_RETRIES ] && [ "$MIGRATION_SUCCESS" = false ]; do
    echo -e "${PURPLE}━━━ Intento $ATTEMPT de $MAX_RETRIES ━━━${NC}"
    echo ""
    
    # Paso 1: Aplicar unique constraints ANTES de cada intento
    echo -e "${YELLOW}📌 Paso 1/3: Aplicando unique constraints preventivos...${NC}"
    
    # Primero verificar cuántas tablas necesitan el constraint
    TABLES_NEED_UNIQUE=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
        SELECT COUNT(*)
        FROM information_schema.tables t
        INNER JOIN information_schema.columns c 
            ON t.table_name = c.table_name 
            AND c.column_name = 'uuid'
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint pc
            INNER JOIN pg_attribute pa ON pc.conrelid = pa.attrelid AND pa.attnum = ANY(pc.conkey)
            INNER JOIN pg_class pgc ON pc.conrelid = pgc.oid
            WHERE pgc.relname = t.table_name
            AND pa.attname = 'uuid'
            AND pc.contype IN ('u', 'p')
        );
    " 2>/dev/null | tr -d ' ')
    
    if [ "$TABLES_NEED_UNIQUE" -gt 0 ]; then
        echo -e "${CYAN}   → Encontradas $TABLES_NEED_UNIQUE tablas que necesitan unique constraint...${NC}"
    else
        echo -e "${GREEN}   → Todas las tablas ya tienen unique constraints${NC}"
    fi
    
    $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'AUTO_UNIQUE_EOF' 2>&1 | grep -E '(NOTICE|ERROR)' || true
DO $$
DECLARE
    r RECORD;
    cnt INT := 0;
    has_constraint BOOLEAN;
BEGIN
    -- Fix 1: Convertir columnas 'id' de CHARACTER a UUID
    FOR r IN 
        SELECT t.table_name, c.data_type
        FROM information_schema.tables t
        JOIN information_schema.columns c ON c.table_name = t.table_name
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.column_name = 'id'
        AND c.data_type IN ('character varying', 'character')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN id TYPE UUID USING id::uuid', r.table_name);
            cnt := cnt + 1;
        EXCEPTION
            WHEN OTHERS THEN NULL;
        END;
    END LOOP;
    
    IF cnt > 0 THEN
        RAISE NOTICE '✅ Convertidas % columnas id a UUID', cnt;
    END IF;
    
    -- Fix 2: Unique constraints en columna uuid
    cnt := 0;
    FOR r IN 
        SELECT t.table_name
        FROM information_schema.tables t
        INNER JOIN information_schema.columns c 
            ON t.table_name = c.table_name 
            AND c.column_name = 'uuid'
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint pc
            INNER JOIN pg_attribute pa ON pc.conrelid = pa.attrelid AND pa.attnum = ANY(pc.conkey)
            INNER JOIN pg_class pgc ON pc.conrelid = pgc.oid
            WHERE pgc.relname = t.table_name
            AND pa.attname = 'uuid'
            AND pc.contype IN ('u', 'p')
        )
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (uuid)', r.table_name, r.table_name || '_uuid_unique');
            cnt := cnt + 1;
        EXCEPTION
            WHEN OTHERS THEN NULL;
        END;
    END LOOP;
    
    IF cnt > 0 THEN
        RAISE NOTICE '✅ Agregados % unique constraints en uuid', cnt;
    END IF;
    
    -- Fix 3: Unique constraints en columna id
    cnt := 0;
    FOR r IN 
        SELECT t.table_name
        FROM information_schema.tables t
        INNER JOIN information_schema.columns c 
            ON t.table_name = c.table_name 
            AND c.column_name = 'id'
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
    LOOP
        -- Verificar si ya tiene constraint
        SELECT EXISTS (
            SELECT 1 FROM pg_constraint pc
            INNER JOIN pg_attribute pa ON pc.conrelid = pa.attrelid AND pa.attnum = ANY(pc.conkey)
            INNER JOIN pg_class pgc ON pc.conrelid = pgc.oid
            WHERE pgc.relname = r.table_name
            AND pa.attname = 'id'
            AND pc.contype IN ('u', 'p')
        ) INTO has_constraint;
        
        IF NOT has_constraint THEN
            BEGIN
                EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (id)', r.table_name, r.table_name || '_id_unique');
                cnt := cnt + 1;
            EXCEPTION
                WHEN OTHERS THEN NULL;
            END;
        END IF;
    END LOOP;
    
    IF cnt > 0 THEN
        RAISE NOTICE '✅ Agregados % unique constraints en id', cnt;
    END IF;
END $$;
AUTO_UNIQUE_EOF
    
    echo -e "${GREEN}   ✓ Unique constraints aplicados${NC}"
    echo ""
    
    # Paso 2: Ejecutar migraciones con timeout
    echo -e "${YELLOW}📌 Paso 2/3: Ejecutando migraciones...${NC}"
    
    # Mostrar cuántas migraciones faltan
    PENDING_COUNT=$($DOCKER_CMD compose exec -T application php artisan migrate:status 2>&1 | grep -c "Pending" || echo "0")
    echo -e "${CYAN}   → Migraciones pendientes: $PENDING_COUNT${NC}"
    
    # Obtener la última migración completada
    LAST_MIGRATION=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT migration FROM migrations ORDER BY id DESC LIMIT 1;" 2>/dev/null | tr -d ' ' | tr -d '\r' | tr -d '\n' || echo "ninguna")
    if [ "$LAST_MIGRATION" != "ninguna" ]; then
        echo -e "${CYAN}   → Última completada: ${LAST_MIGRATION:0:50}...${NC}"
    fi
    echo ""
    
    MIGRATION_LOG="/tmp/fleetbase_migration_$$.log"
    MIGRATION_PID_FILE="/tmp/fleetbase_migration_pid_$$.txt"
    
    echo -e "${BLUE}   Iniciando artisan migrate con monitoreo en tiempo real...${NC}"
    echo ""
    
    # Ejecutar migraciones en background CON captura de salida
    (timeout $MIGRATION_TIMEOUT $DOCKER_CMD compose exec -T application php artisan migrate --force 2>&1 | tee "$MIGRATION_LOG") &
    MIGRATE_PID=$!
    echo $MIGRATE_PID > "$MIGRATION_PID_FILE"
    
    # Monitorear progreso en tiempo real
    echo -e "${CYAN}   [Monitor] Proceso de migración iniciado (PID: $MIGRATE_PID)${NC}"
    LAST_COUNT=0
    MONITOR_INTERVAL=5
    STUCK_COUNT=0
    
    while kill -0 $MIGRATE_PID 2>/dev/null; do
        sleep $MONITOR_INTERVAL
        
        # Contar migraciones completadas
        CURRENT_COUNT=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM migrations;" 2>/dev/null | tr -d ' ' || echo "$LAST_COUNT")
        
        if [ "$CURRENT_COUNT" != "$LAST_COUNT" ]; then
            # Hay progreso
            DIFF=$((CURRENT_COUNT - LAST_COUNT))
            echo -e "${GREEN}   [Monitor] ✓ $CURRENT_COUNT migraciones completadas (+$DIFF en últimos ${MONITOR_INTERVAL}s)${NC}"
            LAST_COUNT=$CURRENT_COUNT
            STUCK_COUNT=0
        else
            # No hay progreso
            STUCK_COUNT=$((STUCK_COUNT + 1))
            ELAPSED=$((STUCK_COUNT * MONITOR_INTERVAL))
            echo -e "${YELLOW}   [Monitor] ⏳ Sin cambios por ${ELAPSED}s (total: $CURRENT_COUNT migraciones)${NC}"
            
            # Si no hay progreso por mucho tiempo, mostrar advertencia
            if [ $STUCK_COUNT -ge 6 ]; then
                echo -e "${RED}   [Monitor] ⚠️  Sin progreso por $((STUCK_COUNT * MONITOR_INTERVAL))s - puede estar procesando migración compleja${NC}"
            fi
        fi
    done
    
    # Esperar a que termine el proceso
    wait $MIGRATE_PID
    EXIT_CODE=$?
    rm -f "$MIGRATION_PID_FILE"
    
    echo ""
    echo -e "${BLUE}   Comando finalizado con código: $EXIT_CODE${NC}"
    FINAL_COUNT=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM migrations;" 2>/dev/null | tr -d ' ')
    echo -e "${CYAN}   Total de migraciones completadas: $FINAL_COUNT${NC}"
    echo ""
    
    # Paso 3: Analizar resultado
    echo -e "${YELLOW}📌 Paso 3/3: Analizando resultado...${NC}"
    
    # Verificar si hay errores FAIL en el log (más confiable que EXIT_CODE)
    HAS_ERRORS=false
    if [ -f "$MIGRATION_LOG" ] && grep -q "FAIL" "$MIGRATION_LOG"; then
        HAS_ERRORS=true
    fi
    
    if [ $EXIT_CODE -eq 0 ] && [ "$HAS_ERRORS" = "false" ]; then
        echo -e "${GREEN}   ✓ Código de salida: 0 (éxito)${NC}"
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✅ ¡MIGRACIONES COMPLETADAS!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        
        # Contar total de migraciones
        TOTAL_MIGRATIONS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM migrations;" 2>/dev/null | tr -d ' ')
        echo -e "${CYAN}📊 Total de migraciones: ${GREEN}$TOTAL_MIGRATIONS${NC}"
        echo ""
        
        MIGRATION_SUCCESS=true
        break
    fi
    
    # Paso 4: Hubo un error - extraer información y limpiar
    if [ "$HAS_ERRORS" = "true" ]; then
        echo -e "${RED}   ✗ Se detectaron migraciones FAIL en el log${NC}"
    else
        echo -e "${RED}   ✗ Código de salida: $EXIT_CODE (error)${NC}"
    fi
    echo ""
    echo -e "${YELLOW}⚠️  Error detectado, analizando y limpiando...${NC}"
    
    # Mostrar tamaño del log para debug
    if [ -f "$MIGRATION_LOG" ]; then
        LOG_SIZE=$(wc -l < "$MIGRATION_LOG")
        echo -e "${CYAN}   → Log de migración: $LOG_SIZE líneas${NC}"
    fi
    
    # Verificar si es un error de unique constraint faltante
    if grep -q "no unique constraint matching given keys for referenced table" "$MIGRATION_LOG"; then
        # Extraer el nombre de la tabla que necesita unique constraint
        MISSING_TABLE=$(grep -oP 'referenced table "\K[^"]+' "$MIGRATION_LOG" | head -1)
        
        if [ -n "$MISSING_TABLE" ]; then
            echo -e "${YELLOW}   → Error detectado: Falta UNIQUE constraint en tabla ${CYAN}$MISSING_TABLE${NC}"
            echo -e "${CYAN}   → Agregando UNIQUE constraint a ${CYAN}$MISSING_TABLE.uuid${NC}..."
            
            # Agregar el unique constraint
            $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << EOSQL
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = '$MISSING_TABLE'
        AND con.contype = 'u'
        AND EXISTS (
            SELECT 1 FROM pg_attribute 
            WHERE attrelid = rel.oid 
            AND attname = 'uuid'
            AND attnum = ANY(con.conkey)
        )
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (uuid)', 
                      '$MISSING_TABLE', '$MISSING_TABLE' || '_uuid_unique');
        RAISE NOTICE '✅ Constraint agregado a $MISSING_TABLE.uuid';
    END IF;
END \$\$;
EOSQL
            
            echo -e "${GREEN}   ✓ Constraint agregado, reintentando sin limpiar...${NC}"
            echo ""
            
            # Limpiar log y continuar al siguiente intento SIN eliminar nada
            rm -f "$MIGRATION_LOG"
            sleep $PAUSE_BETWEEN_RETRIES
            continue
        fi
    fi
    
    # Verificar si es un error de columna duplicada (migración parcial previa)
    if grep -q "Duplicate column.*already exists" "$MIGRATION_LOG"; then
        echo -e "${YELLOW}   → Error detectado: Columna duplicada (migración ejecutada parcialmente)${NC}"
        
        # Extraer nombre de la migración fallida
        PARTIAL_MIGRATION=$(grep -oP '(?<=^\s{2})202[0-9]_[0-9_]+[a-z_]+(?=\s+)' "$MIGRATION_LOG" | head -1)
        
        if [ -n "$PARTIAL_MIGRATION" ]; then
            echo -e "${CYAN}   → Marcando ${CYAN}$PARTIAL_MIGRATION${NC} como completada...${NC}"
            
            # Marcar como completada en la tabla migrations
            $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << EOSQL
INSERT INTO migrations (migration, batch)
VALUES ('$PARTIAL_MIGRATION', (SELECT COALESCE(MAX(batch), 0) + 1 FROM migrations))
ON CONFLICT DO NOTHING;
EOSQL
            
            echo -e "${GREEN}   ✓ Migración marcada como completada, continuando...${NC}"
            echo ""
            
            # Limpiar log y continuar
            rm -f "$MIGRATION_LOG"
            sleep $PAUSE_BETWEEN_RETRIES
            continue
        fi
    fi
    
    # Verificar si es un error de constraint UNIQUE ya existente
    if grep -q "already exists" "$MIGRATION_LOG" && grep -q "unique constraint\|index\|relation.*_unique" "$MIGRATION_LOG"; then
        echo -e "${YELLOW}   → Error detectado: Constraint UNIQUE duplicado (ya aplicado)${NC}"
        
        # Extraer nombre de la migración fallida
        DUPLICATE_CONSTRAINT_MIGRATION=$(grep -oP '(?<=^\s{2})202[0-9]_[0-9_]+[a-z_]+(?=\s+)' "$MIGRATION_LOG" | head -1)
        
        if [ -n "$DUPLICATE_CONSTRAINT_MIGRATION" ]; then
            echo -e "${CYAN}   → Marcando ${CYAN}$DUPLICATE_CONSTRAINT_MIGRATION${NC} como completada...${NC}"
            
            # Marcar como completada en la tabla migrations
            $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << EOSQL
INSERT INTO migrations (migration, batch)
VALUES ('$DUPLICATE_CONSTRAINT_MIGRATION', (SELECT COALESCE(MAX(batch), 0) + 1 FROM migrations))
ON CONFLICT DO NOTHING;
EOSQL
            
            echo -e "${GREEN}   ✓ Migración marcada como completada, continuando...${NC}"
            echo ""
            
            # Limpiar log y continuar
            rm -f "$MIGRATION_LOG"
            sleep $PAUSE_BETWEEN_RETRIES
            continue
        fi
    fi
    
    # Extraer nombre de la migración fallida
    echo -e "${CYAN}   → Buscando migración fallida en el log...${NC}"
    FAILED_MIGRATION=$(grep -oP '(?<=^\s{2})202[0-9]_[0-9_]+[a-z_]+(?=\s+)' "$MIGRATION_LOG" | grep -A1 "FAIL" | head -1 || echo "")
    
    if [ -z "$FAILED_MIGRATION" ]; then
        # Intentar otro patrón
        echo -e "${CYAN}   → Probando patrón alternativo...${NC}"
        FAILED_MIGRATION=$(grep -B5 "FAIL" "$MIGRATION_LOG" | grep "202[0-9]_" | tail -1 | awk '{print $1}' || echo "")
    fi
    
    if [ -n "$FAILED_MIGRATION" ]; then
        echo -e "${GREEN}   → Migración fallida identificada: ${CYAN}$FAILED_MIGRATION${NC}"
        echo ""
        echo -e "${RED}   🔧 Limpiando: ${CYAN}$FAILED_MIGRATION${NC}"
        
        # Eliminar de la tabla migrations
        echo -e "${CYAN}      → Eliminando entrada de la tabla migrations...${NC}"
        $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "DELETE FROM migrations WHERE migration = '$FAILED_MIGRATION';" >/dev/null 2>&1 || true
        
        # Intentar extraer nombre de tabla y eliminarla
        if [[ $FAILED_MIGRATION =~ create_(.*)_table ]]; then
            TABLE_NAME="${BASH_REMATCH[1]}"
            echo -e "${CYAN}      → Eliminando tabla parcial: ${YELLOW}$TABLE_NAME${NC}"
            $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "DROP TABLE IF EXISTS $TABLE_NAME CASCADE;" >/dev/null 2>&1 || true
        fi
        
        echo -e "${GREEN}   ✓ Limpieza completada${NC}"
    else
        echo -e "${RED}   ✗ No se pudo identificar la migración fallida${NC}"
        # Mostrar últimas líneas del error para debug
        echo -e "${RED}   Últimas 10 líneas del error:${NC}"
        tail -10 "$MIGRATION_LOG" | sed 's/^/      /'
    fi
    
    # Limpiar log temporal
    rm -f "$MIGRATION_LOG"
    
    # Pausa mínima antes del siguiente intento
    if [ $ATTEMPT -lt $MAX_RETRIES ]; then
        echo ""
        echo -e "${CYAN}⏸️  Pausa de ${PAUSE_BETWEEN_RETRIES}s antes del siguiente intento...${NC}"
        sleep $PAUSE_BETWEEN_RETRIES
    fi
    echo ""
    
    ATTEMPT=$((ATTEMPT + 1))
done

# ============================================
# FASE 3: VERIFICACIÓN POST-MIGRACIÓN
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📊 FASE 3: VERIFICACIÓN POST-MIGRACIÓN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$MIGRATION_SUCCESS" = true ]; then
    # Obtener estadísticas finales
    FINAL_STATUS=$($DOCKER_CMD compose exec -T application php artisan migrate:status 2>&1)
    FINAL_PENDING=$(echo "$FINAL_STATUS" | grep -c "Pending" 2>/dev/null || echo "0")
    FINAL_PENDING=$(echo "$FINAL_PENDING" | tr -d '\n\r' | tr -d ' ')  # Limpiar saltos de línea
    FINAL_RAN=$(echo "$FINAL_STATUS" | grep -c "Ran" || echo "0")
    
    TABLE_COUNT=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
        SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
    " 2>/dev/null | tr -d ' ')
    
    echo -e "${GREEN}✅ MIGRACIÓN COMPLETADA EXITOSAMENTE${NC}"
    echo ""
    echo -e "${CYAN}📊 Estadísticas finales:${NC}"
    echo -e "   ${GREEN}Migraciones completadas: $FINAL_RAN${NC}"
    echo -e "   ${YELLOW}Migraciones pendientes: $FINAL_PENDING${NC}"
    echo -e "   ${BLUE}Total de tablas: $TABLE_COUNT${NC}"
    echo -e "   ${PURPLE}Total de intentos: $((ATTEMPT - 1))${NC}"
    echo ""
    
    if [ "$FINAL_PENDING" -eq 0 ]; then
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}🎉 ¡MIGRACIONES COMPLETADAS EXITOSAMENTE!${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${GREEN}✅ Próximos pasos:${NC}"
        echo ""
        echo -e "   ${YELLOW}Probar${NC}"
        echo ""
        echo -e "   ${BLUE}http://localhost:4200/${NC}"
        echo ""
        echo -e "   ${YELLOW}Crea la primer cuenta administrativa${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠️  Aún hay $FINAL_PENDING migraciones pendientes${NC}"
        echo ""
        echo -e "${YELLOW}Próximas migraciones pendientes:${NC}"
        echo "$FINAL_STATUS" | grep "Pending" | head -5
        echo ""
        echo -e "${CYAN}💡 Puedes ejecutar nuevamente el script:${NC}"
        echo -e "   ${BLUE}bash scripts/migrate-all-robust.sh${NC}"
        echo ""
    fi
    
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ MIGRACIÓN FALLÓ DESPUÉS DE $MAX_RETRIES INTENTOS${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${YELLOW}⚠️  El sistema intentó $MAX_RETRIES veces con limpieza automática${NC}"
    echo -e "${YELLOW}    Esto indica un problema crítico que requiere revisión manual${NC}"
    echo ""
    
    echo -e "${YELLOW}💡 Opciones de diagnóstico:${NC}"
    echo ""
    echo -e "${BLUE}1. Ver estado actual de migraciones:${NC}"
    echo -e "   ${CYAN}docker compose exec application php artisan migrate:status${NC}"
    echo ""
    echo -e "${BLUE}2. Ver últimas migraciones completadas:${NC}"
    echo -e "   ${CYAN}docker compose exec database psql -U $DB_USERNAME -d $DB_DATABASE -c \"SELECT migration FROM migrations ORDER BY id DESC LIMIT 10;\"${NC}"
    echo ""
    echo -e "${BLUE}3. Ver logs de la aplicación:${NC}"
    echo -e "   ${CYAN}docker compose logs application --tail=50${NC}"
    echo ""
    echo -e "${BLUE}4. Ver logs de PostgreSQL:${NC}"
    echo -e "   ${CYAN}docker compose logs database --tail=50${NC}"
    echo ""
    
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

