#!/bin/bash
# Fix para la migración de permissions en PostgreSQL
# Ejecutar: bash scripts/fix-permissions-migration.sh

echo "🔧 Aplicando fix para migración de permissions en PostgreSQL..."
echo ""

# Aplicar el parche directamente en el contenedor
sudo docker compose exec application bash << 'BASH_EOF'

# Encontrar el archivo
FILE=$(find /fleetbase/api -name '*094304*permissions*.php' -type f | head -1)

if [ -z "$FILE" ]; then
    echo "❌ No se encontró el archivo de migración"
    exit 1
fi

echo "📄 Archivo encontrado: $FILE"
echo "💾 Creando respaldo..."
cp "$FILE" "${FILE}.backup"

# Aplicar el fix: Asegurar que id sea primary key explícitamente
# y que las foreign keys usen la sintaxis correcta de PostgreSQL

# El problema es que la tabla permissions usa composite primary key en MySQL
# pero PostgreSQL necesita que sea explícito

# Primero, buscar y reemplazar la definición de primary key
sed -i "s/\$table->primary(\['model_type', 'model_id', 'permission_id'\]);/\$table->bigIncrements('id')->primary();/" "$FILE"

# Alternativa: asegurar que cada tabla tenga su id como primary explícitamente
sed -i "s/\$table->bigInteger('id');/\$table->bigIncrements('id')->primary();/" "$FILE"

# Agregar unique constraint donde sea necesario para foreign keys
sed -i "/\$table->foreign('permission_id')/i\            \$table->unique(['model_type', 'model_id', 'permission_id']);" "$FILE"

echo "✅ Fix aplicado"
echo "📝 Respaldo guardado en: ${FILE}.backup"

BASH_EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Parche aplicado exitosamente"
    echo ""
    echo "🚀 Ahora ejecuta:"
    echo "   sudo docker compose exec application php artisan migrate:fresh --force"
else
    echo "❌ Error al aplicar el parche"
fi

