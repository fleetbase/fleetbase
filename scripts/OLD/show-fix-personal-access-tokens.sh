#!/bin/bash
# Script para mostrar y corregir fix_personal_access_tokens

echo "🔍 Mostrando migración problemática..."
echo ""

sudo docker compose exec -T application bash << 'BASH_EOF'
FILE=$(find /fleetbase/api -name "*fix_personal_access_tokens*.php" -type f | head -1)
if [ -n "$FILE" ]; then
    echo "📄 Archivo: $FILE"
    echo ""
    cat "$FILE"
fi
BASH_EOF

