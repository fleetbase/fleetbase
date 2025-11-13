#!/bin/bash
# Fix correcto para la migración de permissions en PostgreSQL
# El problema: uuid('id')->index() no es suficiente para PostgreSQL
# Solución: cambiar a uuid('id')->primary() o uuid('id')->unique()

echo "🔧 Aplicando fix correcto para permissions en PostgreSQL..."
echo ""

sudo docker compose exec -T application bash << 'BASH_EOF'

FILE="/fleetbase/api/vendor/fleetbase/core-api/migrations/2023_04_25_094304_create_permissions_table.php"

if [ ! -f "$FILE" ]; then
    echo "❌ Archivo no encontrado: $FILE"
    exit 1
fi

echo "📄 Archivo: $FILE"
echo "💾 Creando respaldo..."
cp "$FILE" "${FILE}.mysql_backup"

echo "✏️  Aplicando cambios..."

# Fix 1: Cambiar uuid('id')->index() a uuid('id')->primary() en tabla permissions
sed -i "s/\$table->uuid('id')->index();/\$table->uuid('id')->primary();/g" "$FILE"

# Fix 2: Lo mismo para roles
# (ya está cubierto por el sed anterior)

# Verificar cambios
if grep -q "uuid('id')->primary()" "$FILE"; then
    echo "✅ Fix aplicado correctamente"
    echo ""
    echo "📝 Cambios realizados:"
    echo "   - permissions.id: index() → primary()"
    echo "   - roles.id: index() → primary()"
    echo ""
    echo "💾 Respaldo guardado en: ${FILE}.mysql_backup"
else
    echo "⚠️  Advertencia: No se detectaron los cambios esperados"
fi

BASH_EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Parche aplicado exitosamente"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🚀 Siguiente paso - Ejecutar migraciones:"
    echo ""
    echo "   sudo docker compose exec application php artisan migrate:fresh --force"
    echo ""
else
    echo ""
    echo "❌ Error al aplicar el parche"
    exit 1
fi

