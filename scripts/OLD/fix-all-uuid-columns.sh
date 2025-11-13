#!/bin/bash
# Script inteligente para corregir columnas uuid
# Versión 2: Detecta si ya existe unique constraint

echo "🔍 Corrigiendo columnas uuid de forma inteligente..."
echo ""

sudo docker compose exec -T application bash << 'BASH_EOF'

# Buscar todas las migraciones que tienen string('uuid')
FILES=$(grep -r "\$table->string('uuid" /fleetbase/api --include="*.php" | grep migrations | grep -v ".backup" | cut -d: -f1 | sort -u)

if [ -z "$FILES" ]; then
    echo "✅ No se encontraron archivos para corregir"
    exit 0
fi

COUNT=0
for FILE in $FILES; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 $(basename $FILE)"
    
    # Crear respaldo
    cp "$FILE" "${FILE}.backup" 2>/dev/null || true
    
    # Verificar si ya tiene $table->unique(['uuid']) o $table->unique('uuid')
    if grep -q "\$table->unique(\['uuid'\])" "$FILE" || grep -q "\$table->unique('uuid')" "$FILE"; then
        echo "ℹ️  Ya tiene unique constraint explícito, no agregando ->unique()"
        
        # Solo cambiar string a uuid, sin agregar ->unique()
        sed -i "s/->string('uuid', 191)/->uuid('uuid')/g" "$FILE"
        sed -i "s/->string('uuid')/->uuid('uuid')/g" "$FILE"
    else
        echo "ℹ️  No tiene unique constraint, agregando ->unique()"
        
        # Cambiar string a uuid y agregar ->unique()
        sed -i "s/->string('uuid', 191)->nullable()->index()/->uuid('uuid')->nullable()->unique()/g" "$FILE"
        sed -i "s/->string('uuid', 191)->nullable()/->uuid('uuid')->nullable()->unique()/g" "$FILE"
        sed -i "s/->string('uuid', 191)/->uuid('uuid')->unique()/g" "$FILE"
        sed -i "s/->string('uuid')->nullable()->index()/->uuid('uuid')->nullable()->unique()/g" "$FILE"
        sed -i "s/->string('uuid')->nullable()/->uuid('uuid')->nullable()->unique()/g" "$FILE"
        sed -i "s/->string('uuid')/->uuid('uuid')->unique()/g" "$FILE"
    fi
    
    echo "✅ Corregido"
    COUNT=$((COUNT + 1))
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Total archivos corregidos: $COUNT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BASH_EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "🚀 Re-ejecutando migraciones..."
    echo ""
    
    sudo docker compose exec application php artisan migrate:fresh --force
else
    echo "❌ Error"
    exit 1
fi
