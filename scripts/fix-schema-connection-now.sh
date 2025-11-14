#!/bin/bash
# Fix inmediato para Schema::connection en archivos de vendor
# Ejecutar AHORA: bash scripts/fix-schema-connection-now.sh

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}🔧 FIX INMEDIATO PARA Schema::connection${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Detectar si necesita sudo
DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1; then
    if sudo docker ps >/dev/null 2>&1; then
        DOCKER_CMD="sudo docker"
    fi
fi

echo -e "${YELLOW}Aplicando fix a archivos en vendor...${NC}"
echo ""

$DOCKER_CMD compose exec -T application bash << 'FIX_EOF'

echo "🔍 Buscando archivos con Schema::connection..."
echo ""

# Buscar TODOS los archivos PHP en vendor/fleetbase con Schema::connection
FIXED=0

find /fleetbase/api/vendor/fleetbase -type f -name "*.php" 2>/dev/null | while read FILE; do
    if grep -q "Schema::connection(config(" "$FILE" 2>/dev/null; then
        BASENAME=$(basename "$FILE")
        DIR=$(dirname "$FILE")
        
        # Crear backup
        if [ ! -f "${FILE}.original_backup" ]; then
            cp "$FILE" "${FILE}.original_backup"
            echo "💾 Backup: $BASENAME"
        fi
        
        # Aplicar el fix CORRECTO (incluyendo el ->)
        sed -i "s/Schema::connection(config('storefront\.connection\.db'))->/Schema::/g" "$FILE"
        sed -i "s/Schema::connection(config('registry\.connection\.db'))->/Schema::/g" "$FILE"
        sed -i "s/Schema::connection(config('network\.connection\.db'))->/Schema::/g" "$FILE"
        sed -i "s/Schema::connection(config('[^']*'))->/Schema::/g" "$FILE"
        
        echo "✅ Reparado: $BASENAME"
        FIXED=$((FIXED + 1))
    fi
done

echo ""
echo "📊 Total de archivos reparados: $FIXED"

FIX_EOF

echo ""
echo -e "${GREEN}✅ Fix aplicado${NC}"
echo ""
echo -e "${YELLOW}Ahora ejecuta las migraciones:${NC}"
echo -e "${BLUE}docker compose exec application php artisan migrate --force${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

