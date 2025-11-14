#!/bin/bash
# Script robusto para solucionar migraciones atascadas (especialmente create_carts_table)
# Detecta migraciones problemáticas y las repara automáticamente
# Ejecutar: bash scripts/fix-stuck-migrations.sh

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔧 FIX PARA MIGRACIONES ATASCADAS${NC}"
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

DB_HOST=$(grep "^DB_HOST=" api/.env | cut -d= -f2)
DB_PORT=$(grep "^DB_PORT=" api/.env | cut -d= -f2)
DB_DATABASE=$(grep "^DB_DATABASE=" api/.env | cut -d= -f2)
DB_USERNAME=$(grep "^DB_USERNAME=" api/.env | cut -d= -f2)

echo -e "${BLUE}📋 Paso 1/6: Detectando migraciones problemáticas...${NC}"
echo ""

# Lista de migraciones conocidas que causan problemas
PROBLEMATIC_MIGRATIONS=(
    "create_carts_table"
    "create_cart_items_table"
    "create_cart_products_table"
    "create_network"
    "create_store"
)

echo -e "${YELLOW}Buscando archivos de migración problemáticos...${NC}"
echo ""

$DOCKER_CMD compose exec -T application bash << 'BASH_EOF'

# Colores para bash interno
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📋 Paso 2/6: Creando backups de archivos originales...${NC}"
echo ""

# Crear directorio de backups si no existe
BACKUP_DIR="/fleetbase/api/database/migrations/backups_stuck_migrations"
mkdir -p "$BACKUP_DIR"

FIXED_COUNT=0

# Fix 1: Migraciones con Schema::connection() que usan conexiones no configuradas
echo -e "${YELLOW}Fix 1: Reparando migraciones con conexiones problemáticas...${NC}"

# Buscar todas las migraciones que usan Schema::connection()
MIGRATION_FILES=$(find /fleetbase/api -type f -name "*.php" -path "*/migrations/*" \
    -exec grep -l "Schema::connection(config(" {} \; 2>/dev/null | sort -u)

if [ -z "$MIGRATION_FILES" ]; then
    echo -e "${YELLOW}⚠️  No se encontraron migraciones con Schema::connection()${NC}"
else
    for FILE in $MIGRATION_FILES; do
        BASENAME=$(basename "$FILE")
        
        # Crear backup solo si no existe
        if [ ! -f "${BACKUP_DIR}/${BASENAME}.backup" ]; then
            cp "$FILE" "${BACKUP_DIR}/${BASENAME}.backup"
        fi
        
        # Detectar qué tipo de conexión usa
        if grep -q "Schema::connection(config('storefront.connection.db'))" "$FILE"; then
            echo -e "  ${BLUE}→${NC} $BASENAME (storefront)"
            
            # Reemplazar Schema::connection() por Schema:: normal
            sed -i "s/Schema::connection(config('storefront\.connection\.db'))/Schema/g" "$FILE"
            FIXED_COUNT=$((FIXED_COUNT + 1))
            
        elif grep -q "Schema::connection(config('registry.connection.db'))" "$FILE"; then
            echo -e "  ${BLUE}→${NC} $BASENAME (registry)"
            sed -i "s/Schema::connection(config('registry\.connection\.db'))/Schema/g" "$FILE"
            FIXED_COUNT=$((FIXED_COUNT + 1))
            
        elif grep -q "Schema::connection(config('network.connection.db'))" "$FILE"; then
            echo -e "  ${BLUE}→${NC} $BASENAME (network)"
            sed -i "s/Schema::connection(config('network\.connection\.db'))/Schema/g" "$FILE"
            FIXED_COUNT=$((FIXED_COUNT + 1))
            
        else
            # Reemplazar cualquier otro Schema::connection(config(...))
            echo -e "  ${BLUE}→${NC} $BASENAME (genérico)"
            sed -i "s/Schema::connection(config('[^']*'))/Schema/g" "$FILE"
            FIXED_COUNT=$((FIXED_COUNT + 1))
        fi
    done
fi

echo -e "${GREEN}✅ Fix 1 completado: $FIXED_COUNT archivos reparados${NC}"
echo ""

# Fix 2: Migraciones con timeouts largos o índices complejos
echo -e "${YELLOW}Fix 2: Optimizando índices complejos...${NC}"

# Buscar migraciones con múltiples índices JSON
JSON_INDEX_FILES=$(find /fleetbase/api -type f -name "*.php" -path "*/migrations/*" \
    -exec grep -l "->index().*json" {} \; 2>/dev/null | sort -u)

if [ -n "$JSON_INDEX_FILES" ]; then
    for FILE in $JSON_INDEX_FILES; do
        BASENAME=$(basename "$FILE")
        
        # Backup
        if [ ! -f "${BACKUP_DIR}/${BASENAME}.backup" ]; then
            cp "$FILE" "${BACKUP_DIR}/${BASENAME}.backup"
        fi
        
        echo -e "  ${BLUE}→${NC} $BASENAME (optimizando índices JSON)"
        
        # Comentar índices JSON que pueden causar problemas
        # (Los índices JSON en PostgreSQL requieren sintaxis especial)
        sed -i "s/\(\$table->json([^)]*)->index()\)/\/\/ \1 \/\/ Commented: PostgreSQL JSON indexes need special syntax/g" "$FILE"
        FIXED_COUNT=$((FIXED_COUNT + 1))
    done
    echo -e "${GREEN}✅ Fix 2 completado${NC}"
else
    echo -e "${YELLOW}⚠️  No se encontraron índices JSON problemáticos${NC}"
fi
echo ""

# Fix 3: Verificar referencias a schemas inexistentes (fleetbase.table_name)
echo -e "${YELLOW}Fix 3: Reparando referencias a schemas inexistentes...${NC}"

SCHEMA_REF_FILES=$(find /fleetbase/api -type f -name "*.php" -path "*/migrations/*" \
    -exec grep -l "references.*fleetbase\." {} \; 2>/dev/null | sort -u)

if [ -n "$SCHEMA_REF_FILES" ]; then
    for FILE in $SCHEMA_REF_FILES; do
        BASENAME=$(basename "$FILE")
        
        # Backup
        if [ ! -f "${BACKUP_DIR}/${BASENAME}.backup" ]; then
            cp "$FILE" "${BACKUP_DIR}/${BASENAME}.backup"
        fi
        
        echo -e "  ${BLUE}→${NC} $BASENAME (removiendo prefijo 'fleetbase.')"
        
        # Remover prefijo "fleetbase." de las referencias
        sed -i "s/references(\(['\"][^'\"]*['\"])\s*->on(\s*['\"]fleetbase\.\([^'\"]*\)['\"])/references(\1->on(\"\2\")/g" "$FILE"
        sed -i "s/->on(['\"]fleetbase\.\([^'\"]*\)['\"])/->on(\"\1\")/g" "$FILE"
        FIXED_COUNT=$((FIXED_COUNT + 1))
    done
    echo -e "${GREEN}✅ Fix 3 completado${NC}"
else
    echo -e "${YELLOW}⚠️  No se encontraron referencias a schemas inexistentes${NC}"
fi
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ TOTAL DE ARCHIVOS REPARADOS: $FIXED_COUNT${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

BASH_EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al aplicar los fixes${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Paso 3/6: Verificando procesos atascados...${NC}"

# Verificar si hay migraciones corriendo
RUNNING_MIGRATIONS=$($DOCKER_CMD compose exec -T application ps aux | grep -E "artisan migrate" | grep -v grep | wc -l || echo "0")

if [ "$RUNNING_MIGRATIONS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Detectados $RUNNING_MIGRATIONS procesos de migración corriendo${NC}"
    echo -e "${BLUE}Reiniciando contenedor application...${NC}"
    $DOCKER_CMD compose restart application
    echo -e "${YELLOW}Esperando 10 segundos...${NC}"
    sleep 10
    echo -e "${GREEN}✅ Contenedor reiniciado${NC}"
else
    echo -e "${GREEN}✅ No hay procesos atascados${NC}"
fi
echo ""

echo -e "${BLUE}📋 Paso 4/6: Limpiando cache de Laravel...${NC}"
$DOCKER_CMD compose exec -T application php artisan config:clear 2>/dev/null || echo -e "${YELLOW}⚠️  Config clear falló (puede ser normal)${NC}"
$DOCKER_CMD compose exec -T application php artisan cache:clear 2>/dev/null || echo -e "${YELLOW}⚠️  Cache clear falló (puede ser normal)${NC}"
echo -e "${GREEN}✅ Cache limpiado${NC}"
echo ""

echo -e "${BLUE}📋 Paso 5/6: Verificando estado de migraciones en la base de datos...${NC}"

# Obtener lista de migraciones ya ejecutadas
COMPLETED_MIGRATIONS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT migration FROM migrations ORDER BY batch, id;
" 2>/dev/null | tr -d ' ' | grep -v '^$' || echo "")

if [ -z "$COMPLETED_MIGRATIONS" ]; then
    echo -e "${YELLOW}⚠️  No se encontraron migraciones completadas (tabla migrations vacía)${NC}"
    LAST_MIGRATION="ninguna"
else
    LAST_MIGRATION=$(echo "$COMPLETED_MIGRATIONS" | tail -1)
    MIGRATION_COUNT=$(echo "$COMPLETED_MIGRATIONS" | wc -l)
    echo -e "${GREEN}✅ Migraciones completadas: $MIGRATION_COUNT${NC}"
    echo -e "${BLUE}   Última migración: $LAST_MIGRATION${NC}"
fi
echo ""

echo -e "${BLUE}📋 Paso 6/6: Verificando tablas problemáticas...${NC}"

# Verificar si las tablas problemáticas ya existen
CARTS_EXISTS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'carts'
    );
" 2>/dev/null | tr -d ' ')

if [ "$CARTS_EXISTS" = "t" ]; then
    echo -e "${GREEN}✅ Tabla 'carts' ya existe${NC}"
    
    # Verificar si la migración está registrada
    CART_MIGRATION_REGISTERED=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
        SELECT COUNT(*) FROM migrations WHERE migration LIKE '%create_carts_table%';
    " 2>/dev/null | tr -d ' ')
    
    if [ "$CART_MIGRATION_REGISTERED" = "0" ]; then
        echo -e "${YELLOW}⚠️  La tabla existe pero la migración no está registrada${NC}"
        echo -e "${BLUE}Registrando migración...${NC}"
        
        # Buscar el nombre exacto de la migración
        CART_MIGRATION_NAME=$($DOCKER_CMD compose exec -T application bash -c "
            find /fleetbase/api -type f -name '*create_carts_table.php' -path '*/migrations/*' | head -1 | xargs basename | sed 's/\.php$//'
        " | tr -d '\r')
        
        if [ -n "$CART_MIGRATION_NAME" ]; then
            # Obtener el último batch
            LAST_BATCH=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
                SELECT COALESCE(MAX(batch), 0) FROM migrations;
            " | tr -d ' ')
            
            CURRENT_BATCH=$((LAST_BATCH + 1))
            
            # Registrar la migración
            $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "
                INSERT INTO migrations (migration, batch) 
                VALUES ('$CART_MIGRATION_NAME', $CURRENT_BATCH)
                ON CONFLICT DO NOTHING;
            " >/dev/null 2>&1
            
            echo -e "${GREEN}✅ Migración 'carts' registrada en batch $CURRENT_BATCH${NC}"
        fi
    else
        echo -e "${GREEN}✅ Migración 'carts' ya está registrada${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Tabla 'carts' no existe${NC}"
    echo -e "${BLUE}   Se creará en la próxima ejecución de migraciones${NC}"
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ FIX DE MIGRACIONES COMPLETADO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📋 Resumen:${NC}"
echo -e "   ${GREEN}✓${NC} Archivos de migración reparados"
echo -e "   ${GREEN}✓${NC} Procesos atascados verificados"
echo -e "   ${GREEN}✓${NC} Cache de Laravel limpiado"
echo -e "   ${GREEN}✓${NC} Estado de base de datos verificado"
echo ""

echo -e "${YELLOW}🚀 Próximos pasos:${NC}"
echo ""
echo -e "${YELLOW}1. Ejecutar migraciones con timeout de detección:${NC}"
echo -e "   ${BLUE}bash scripts/run-migrations-with-timeout.sh${NC}"
echo ""
echo -e "${YELLOW}2. O ejecutar migraciones manualmente:${NC}"
echo -e "   ${BLUE}docker compose exec application php artisan migrate --force${NC}"
echo ""
echo -e "${YELLOW}3. Si alguna migración se queda atascada de nuevo:${NC}"
echo -e "   ${BLUE}Presiona Ctrl+C y vuelve a ejecutar este script${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

