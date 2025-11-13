#!/bin/bash
# Fix específico para fuel_reports - índice duplicado

echo "🔍 Buscando y corrigiendo fuel_reports migration..."
echo ""

sudo docker compose exec -T application bash << 'BASH_EOF'

FILE=$(find /fleetbase/api -name "*fuel_reports*.php" -type f 2>/dev/null | head -1)

if [ -z "$FILE" ]; then
    echo "❌ No se encontró la migración de fuel_reports"
    exit 1
fi

echo "📄 Archivo: $FILE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Contenido actual:"
cat "$FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "💾 Creando respaldo..."
cp "$FILE" "${FILE}.mysql_backup"

# Fix: cambiar el nombre del índice location a uno único
# Esto evita conflicto con la columna location
sed -i 's/spatialIndex(\x27location\x27)/spatialIndex(\x27location\x27, \x27fuel_reports_location_spatial\x27)/g' "$FILE"

echo "✅ Fix aplicado"

BASH_EOF

