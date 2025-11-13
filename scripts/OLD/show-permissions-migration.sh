#!/bin/bash
# Script para extraer y mostrar la migración problemática
# Ejecutar: bash scripts/show-permissions-migration.sh

echo "🔍 Buscando migración de permissions..."

sudo docker compose exec application bash -c "
    FILE=\$(find /fleetbase/api -name '*094304*permissions*.php' -type f | head -1)
    if [ -n \"\$FILE\" ]; then
        echo \"📄 Archivo encontrado: \$FILE\"
        echo \"\"
        echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\"
        cat \"\$FILE\"
        echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\"
    else
        echo \"❌ No se encontró el archivo\"
    fi
"

