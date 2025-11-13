#!/bin/bash
# Fix para la migración de policies en PostgreSQL
# Problema: mismatch de tipos entre uuid y character

echo "🔧 Buscando y corrigiendo migración de policies..."
echo ""

sudo docker compose exec -T application bash << 'BASH_EOF'

# Buscar el archivo de policies
FILE=$(find /fleetbase/api -name "*094311*policies*.php" -type f | grep -v "model_has_policies" | head -1)

if [ ! -f "$FILE" ]; then
    echo "❌ Archivo de policies no encontrado"
    exit 1
fi

echo "📄 Archivo encontrado: $FILE"
echo "💾 Creando respaldo..."
cp "$FILE" "${FILE}.mysql_backup"

echo "✏️  Aplicando fix..."

# El problema común es que la tabla policies puede tener:
# 1. $table->string('id') o $table->char('id')
# 2. Necesita ser $table->uuid('id')->primary()

# Fix 1: Cambiar string('id') a uuid('id')->primary()
sed -i "s/\$table->string('id')/\$table->uuid('id')->primary()/g" "$FILE"

# Fix 2: Cambiar char('id') a uuid('id')->primary() 
sed -i "s/\$table->char('id', [0-9]*)/\$table->uuid('id')->primary()/g" "$FILE"

# Fix 3: Si tiene uuid('id')->index(), cambiar a primary()
sed -i "s/->uuid('id')->index()/->uuid('id')->primary()/g" "$FILE"

# Fix 4: Asegurar que policy_id también sea uuid
sed -i "s/\$table->string('policy_id')/\$table->uuid('policy_id')/g" "$FILE"
sed -i "s/\$table->char('policy_id'/\$table->uuid('policy_id'/g" "$FILE"

echo "✅ Fix aplicado"
echo ""
echo "📝 Cambios realizados:"
echo "   - policies.id → uuid con primary key"
echo "   - policy_id → tipo uuid consistente"

BASH_EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Fix de policies aplicado"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🚀 Re-ejecutar migraciones:"
    echo "   sudo docker compose exec application php artisan migrate:fresh --force"
    echo ""
else
    echo "❌ Error al aplicar el fix"
    exit 1
fi

