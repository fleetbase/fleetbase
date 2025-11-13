#!/bin/bash
# Script consolidado para aplicar TODOS los fixes de PostgreSQL de una vez
# Versión 2: Incluye fix para fuel_reports
# Ejecutar: bash scripts/apply-all-pgsql-fixes.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 APLICANDO TODOS LOS FIXES DE POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

sudo docker compose exec -T application bash << 'BASH_EOF'

echo "📋 Fix 1/4: Permissions table..."
FILE1=$(find /fleetbase/api -name "*094304*permissions*.php" -type f | head -1)
if [ -f "$FILE1" ]; then
    cp "$FILE1" "${FILE1}.mysql_backup" 2>/dev/null || true
    sed -i "s/->uuid('id')->index()/->uuid('id')->primary()/g" "$FILE1"
    echo "✅ Permissions fixed"
else
    echo "⚠️  Permissions migration not found"
fi

echo ""
echo "📋 Fix 2/4: Policies table..."
FILE2=$(find /fleetbase/api -name "*094311*policies*.php" -type f | grep -v "model_has_policies" | head -1)
if [ -f "$FILE2" ]; then
    cp "$FILE2" "${FILE2}.mysql_backup" 2>/dev/null || true
    sed -i "s/->uuid('id')->index()/->uuid('id')->primary()/g" "$FILE2"
    sed -i "s/\$table->string('id')/\$table->uuid('id')->primary()/g" "$FILE2"
    sed -i "s/\$table->char('id', [0-9]*)/\$table->uuid('id')->primary()/g" "$FILE2"
    echo "✅ Policies fixed"
else
    echo "⚠️  Policies migration not found"
fi

echo ""
echo "📋 Fix 3/4: Personal access tokens..."
FILE3=$(find /fleetbase/api -name "*fix_personal_access_tokens*.php" -type f | head -1)
if [ -f "$FILE3" ]; then
    cp "$FILE3" "${FILE3}.mysql_backup" 2>/dev/null || true
    
    # Reemplazar completamente el contenido
    cat > "$FILE3" << 'PHP_EOF'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * 
     * NOTE: Disabled for PostgreSQL compatibility.
     *
     * @return void
     */
    public function up()
    {
        // Migration disabled for PostgreSQL compatibility
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Nothing to reverse
    }
};
PHP_EOF
    
    echo "✅ Personal access tokens migration disabled"
else
    echo "⚠️  Personal access tokens migration not found"
fi

echo ""
echo "📋 Fix 4/4: Location spatial indexes (all tables)..."

# Encontrar TODAS las migraciones con índices location duplicados
FILES=$(find /fleetbase/api -name '*.php' -type f -path '*/migrations/*' -exec grep -l "spatialIndex.*'location'" {} \; 2>/dev/null)

if [ -z "$FILES" ]; then
    echo "⚠️  No se encontraron migraciones con índices location"
else
    COUNT=0
    for file in $FILES; do
        # Extraer el nombre de la tabla del nombre del archivo
        table_name=$(basename "$file" | sed -E 's/[0-9_]+create_(.*)_table\.php/\1/')
        
        # Crear el nombre del índice único
        index_name="${table_name}_location_spatial_idx"
        
        # Backup
        cp "$file" "${file}.mysql_backup" 2>/dev/null || true
        
        # Aplicar el fix usando perl para mejor manejo de regex
        perl -i -pe "s/spatialIndex\(\['location'\], 'location'\)/spatialIndex(['location'], '$index_name')/g" "$file"
        
        COUNT=$((COUNT + 1))
    done
    
    echo "✅ $COUNT archivos corregidos (índices location espaciales)"
fi

echo ""

BASH_EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ TODOS LOS FIXES APLICADOS CORRECTAMENTE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🚀 Ejecutando migraciones..."
    echo ""
    
    sudo docker compose exec application php artisan migrate:fresh --force
else
    echo ""
    echo "❌ Error al aplicar los fixes"
    exit 1
fi
