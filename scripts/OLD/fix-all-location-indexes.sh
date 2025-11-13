#!/bin/bash
# Script para corregir TODOS los índices location duplicados en migraciones

echo "🔍 Buscando migraciones con índices 'location' problemáticos..."
echo ""

sudo docker compose exec -T application bash << 'BASH_EOF'

# Buscar todos los archivos que tienen spatialIndex con nombre 'location'
FILES=$(grep -r "spatialIndex.*'location'" /fleetbase/api --include="*.php" | grep migrations | cut -d: -f1 | sort -u)

if [ -z "$FILES" ]; then
    echo "✅ No se encontraron archivos con índices location problemáticos"
    exit 0
fi

echo "📋 Archivos encontrados:"
echo "$FILES"
echo ""

# Para cada archivo encontrado
for FILE in $FILES; do
    # Extraer el nombre de la tabla del archivo
    TABLE_NAME=$(basename "$FILE" | sed 's/.*create_\(.*\)_table.php/\1/')
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 Archivo: $(basename $FILE)"
    echo "🏷️  Tabla: $TABLE_NAME"
    
    # Crear respaldo
    cp "$FILE" "${FILE}.backup" 2>/dev/null
    
    # Reemplazar el índice location con un nombre único
    # Buscar: spatialIndex(['location'], 'location')
    # Cambiar a: spatialIndex(['location'], '${TABLE_NAME}_location_spatial')
    
    sed -i "s/spatialIndex(\['location'\], 'location')/spatialIndex(['location'], '${TABLE_NAME}_location_spatial')/g" "$FILE"
    
    # Verificar si se aplicó el cambio
    if grep -q "${TABLE_NAME}_location_spatial" "$FILE"; then
        echo "✅ Fix aplicado: índice renombrado a ${TABLE_NAME}_location_spatial"
    else
        echo "⚠️  No se pudo aplicar el fix automáticamente"
    fi
    echo ""
done

BASH_EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Todos los fixes aplicados"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🚀 Ejecutando migraciones..."
    echo ""
    
    sudo docker compose exec application php artisan migrate:fresh --force
else
    echo "❌ Error al aplicar los fixes"
    exit 1
fi

