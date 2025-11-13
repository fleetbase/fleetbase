#!/bin/bash
# Script para auto-fix de migraciones agregando constraints cuando fallan

echo "🔄 Ejecutando migraciones con auto-fix de constraints..."
echo ""

MAX_ATTEMPTS=50
attempt=1

while [ $attempt -le $MAX_ATTEMPTS ]; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 Intento $attempt/$MAX_ATTEMPTS"
    
    # Ejecutar migraciones y capturar salida
    OUTPUT=$(sudo docker compose exec application php artisan migrate --force 2>&1)
    EXIT_CODE=$?
    
    echo "$OUTPUT"
    
    # Si tuvo éxito, terminar
    if [ $EXIT_CODE -eq 0 ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ TODAS LAS MIGRACIONES COMPLETADAS!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        break
    fi
    
    # Extraer el nombre de la tabla del error
    TABLE_NAME=$(echo "$OUTPUT" | grep -oP 'referenced table "\K[^"]+' | head -1)
    
    if [ -z "$TABLE_NAME" ]; then
        echo "❌ No se pudo extraer el nombre de la tabla del error"
        echo "Salida completa:"
        echo "$OUTPUT"
        break
    fi
    
    echo "🔧 Agregando UNIQUE constraint a $TABLE_NAME.uuid..."
    
    sudo docker compose exec -T database psql -U fleetbase -d fleetbase -c \
        "ALTER TABLE $TABLE_NAME ADD CONSTRAINT ${TABLE_NAME}_uuid_unique UNIQUE (uuid);" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Constraint agregado a $TABLE_NAME"
    else
        echo "⚠️  No se pudo agregar constraint a $TABLE_NAME (puede ya existir)"
    fi
    
    attempt=$((attempt + 1))
    echo ""
done

if [ $attempt -gt $MAX_ATTEMPTS ]; then
    echo "❌ Se alcanzó el máximo de intentos"
fi

