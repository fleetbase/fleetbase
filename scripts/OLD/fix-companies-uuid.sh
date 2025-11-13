#!/bin/bash
# Script para corregir columnas uuid que están definidas como string

echo "🔍 Corrigiendo columnas uuid en tabla companies..."
echo ""

sudo docker compose exec -T application bash << 'BASH_EOF'

# Encontrar la migración de companies
FILE=$(find /fleetbase/api -name "*create_companies_table.php" -type f | head -1)

if [ ! -f "$FILE" ]; then
    echo "❌ Migración de companies no encontrada"
    exit 1
fi

echo "📄 Archivo: $FILE"
echo ""

# Crear respaldo
cp "$FILE" "${FILE}.backup" 2>/dev/null

# Ver contenido actual
echo "📋 Contenido actual (primeras 50 líneas):"
head -50 "$FILE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cambiar string('uuid') a uuid('uuid')->primary()
# Esto es necesario para que las foreign keys funcionen
sed -i "s/\$table->string('uuid', 191)/\$table->uuid('uuid')->primary()/g" "$FILE"
sed -i "s/\$table->string('uuid')/\$table->uuid('uuid')->primary()/g" "$FILE"

echo "✅ Fix aplicado en companies"

BASH_EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Companies table fixed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🚀 Re-ejecutando migraciones..."
    echo ""
    
    sudo docker compose exec application php artisan migrate:fresh --force
else
    echo "❌ Error"
    exit 1
fi

