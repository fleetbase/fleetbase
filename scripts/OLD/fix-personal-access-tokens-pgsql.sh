#!/bin/bash
# Fix para fix_personal_access_tokens en PostgreSQL
# Problema: ALTER COLUMN de string a uuid requiere USING

echo "🔧 Corrigiendo migración fix_personal_access_tokens..."
echo ""

sudo docker compose exec -T application bash << 'BASH_EOF'

# Buscar el archivo
FILE=$(find /fleetbase/api -name "*fix_personal_access_tokens*.php" -type f | head -1)

if [ ! -f "$FILE" ]; then
    echo "❌ Archivo no encontrado"
    exit 1
fi

echo "📄 Archivo: $FILE"
echo "💾 Creando respaldo..."
cp "$FILE" "${FILE}.mysql_backup"

echo "✏️  Aplicando fix..."

# Ver el contenido primero para entender el problema
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 Contenido de la migración:"
cat "$FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# El problema típico es algo como:
# $table->uuid('tokenable_id')->change();
# En PostgreSQL necesita: $table->uuid('tokenable_id')->change()->using('tokenable_id::uuid');

# Pero Laravel no soporta ->using() directamente, necesitamos usar DB::statement

# Solución: Comentar el ->change() que falla y usar DB::statement con USING
sed -i "s/\$table->uuid('tokenable_id')->change()/\/\/ \$table->uuid('tokenable_id')->change(); \/\/ Fixed for PostgreSQL/g" "$FILE"

# Agregar el DB::statement correcto después del Schema::table
# Buscar Schema::table y agregar después del opening brace
sed -i "/Schema::table.*personal_access_tokens.*function.*{/a\            DB::statement('ALTER TABLE personal_access_tokens ALTER COLUMN tokenable_id TYPE UUID USING tokenable_id::uuid');" "$FILE"

# Si no funciona el sed anterior, intentar un enfoque diferente
# Buscar cualquier ->change() que involucre uuid y comentarlo
sed -i "s/->change();/->change(); \/\/ May need manual fix for PostgreSQL/g" "$FILE"

echo "✅ Fix aplicado"

BASH_EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Fix aplicado"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🚀 Re-ejecutar migraciones:"
    echo "   sudo docker compose exec application php artisan migrate:fresh --force"
    echo ""
else
    echo "❌ Error"
    exit 1
fi

