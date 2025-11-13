#!/bin/bash
# Ultra fix: Convierte TODAS las columnas *uuid a tipo uuid nativo

echo "🔧 Aplicando ULTRA FIX para todas las columnas uuid..."
echo ""

sudo docker compose exec -T application bash << 'BASH_EOF'

find /fleetbase/api -type f -name "*.php" -path "*/migrations/*" -not -name "*.backup" -not -name "*.pre_ultra_fix" | while read file; do
    # Backup
    cp "$file" "${file}.pre_ultra_fix" 2>/dev/null
    
    # Usar perl para regex más potente
    # Captura: ->char('xxx_uuid', 36) o ->string('xxx_uuid', 191) o ->string('xxx_uuid')
    # Reemplaza con: ->uuid('xxx_uuid')
    perl -i -pe "s/->(?:char|string)\('([^']*uuid[^']*?)'(?:,\s*\d+)?\)/->uuid('\$1')/g" "$file"
done

echo "✅ Ultra fix aplicado"

BASH_EOF

echo ""
echo "🚀 Re-ejecutando migraciones..."
echo ""

sudo docker compose exec application php artisan migrate:fresh --force

