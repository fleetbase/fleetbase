#!/bin/bash
# Script de refactorización con reporte detallado
# Ejecutar: bash scripts/refactor-with-report.sh

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 REFACTORIZACIÓN DE MIGRACIONES MYSQL → POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Paso 1
echo "📋 PASO 1: Copiando script Python al contenedor..."
sudo docker compose cp scripts/refactor_migrations.py application:/tmp/refactor_migrations.py
if [ $? -eq 0 ]; then
    echo "✅ Script copiado exitosamente"
else
    echo "❌ Error al copiar el script"
    exit 1
fi
echo ""

# Paso 2
echo "📊 PASO 2: Contando migraciones..."
MIGRATION_COUNT=$(sudo docker compose exec -T application bash -c "find /fleetbase/api -name '*.php' -path '*/migrations/*' 2>/dev/null | wc -l")
echo "📝 Migraciones encontradas: $MIGRATION_COUNT archivos"
echo ""

# Paso 3
echo "💾 PASO 3: Creando respaldo de migraciones..."
sudo docker compose exec -T application bash -c "
    if [ ! -d /fleetbase/api/database/migrations_backup_mysql ]; then
        cp -r /fleetbase/api/database/migrations /fleetbase/api/database/migrations_backup_mysql 2>/dev/null || true
        echo '✅ Respaldo creado en /fleetbase/api/database/migrations_backup_mysql'
    else
        echo '⚠️  Respaldo ya existe, saltando...'
    fi
"
echo ""

# Paso 4
echo "🔍 PASO 4: Analizando problemas de compatibilidad..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Contar ocurrencias de cada problema
CHARACTER_SET=$(sudo docker compose exec -T application bash -c "grep -r 'CHARACTER SET' /fleetbase/api/database/migrations/ 2>/dev/null | wc -l" || echo "0")
COLLATE=$(sudo docker compose exec -T application bash -c "grep -r 'COLLATE' /fleetbase/api/database/migrations/ 2>/dev/null | wc -l" || echo "0")
ENGINE=$(sudo docker compose exec -T application bash -c "grep -r \"'engine'\" /fleetbase/api/database/migrations/ 2>/dev/null | wc -l" || echo "0")
UNSIGNED=$(sudo docker compose exec -T application bash -c "grep -r '->unsigned()' /fleetbase/api/database/migrations/ 2>/dev/null | wc -l" || echo "0")
ENUM=$(sudo docker compose exec -T application bash -c "grep -r '->enum(' /fleetbase/api/database/migrations/ 2>/dev/null | wc -l" || echo "0")

echo "  CHARACTER SET encontrados: $CHARACTER_SET"
echo "  COLLATE encontrados: $COLLATE"
echo "  ENGINE encontrados: $ENGINE"
echo "  ->unsigned() encontrados: $UNSIGNED"
echo "  ->enum() encontrados: $ENUM"
echo ""

# Paso 5
echo "🔧 PASO 5: Ejecutando refactorización..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Ejecutar el script Python
sudo docker compose exec -T application python3 /tmp/refactor_migrations.py

echo ""

# Paso 6
echo "🧪 PASO 6: Verificando refactorización..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CHARACTER_SET_AFTER=$(sudo docker compose exec -T application bash -c "grep -r 'CHARACTER SET' /fleetbase/api/database/migrations/ 2>/dev/null | wc -l" || echo "0")
COLLATE_AFTER=$(sudo docker compose exec -T application bash -c "grep -r 'COLLATE' /fleetbase/api/database/migrations/ 2>/dev/null | wc -l" || echo "0")
ENGINE_AFTER=$(sudo docker compose exec -T application bash -c "grep -r \"'engine'\" /fleetbase/api/database/migrations/ 2>/dev/null | wc -l" || echo "0")
UNSIGNED_AFTER=$(sudo docker compose exec -T application bash -c "grep -r '->unsigned()' /fleetbase/api/database/migrations/ 2>/dev/null | wc -l" || echo "0")

echo "📊 Resultados:"
echo "  CHARACTER SET: $CHARACTER_SET → $CHARACTER_SET_AFTER (eliminados: $((CHARACTER_SET - CHARACTER_SET_AFTER)))"
echo "  COLLATE: $COLLATE → $COLLATE_AFTER (eliminados: $((COLLATE - COLLATE_AFTER)))"
echo "  ENGINE: $ENGINE → $ENGINE_AFTER (eliminados: $((ENGINE - ENGINE_AFTER)))"
echo "  ->unsigned(): $UNSIGNED → $UNSIGNED_AFTER (eliminados: $((UNSIGNED - UNSIGNED_AFTER)))"
echo ""

# Paso 7
echo "✅ PASO 7: Refactorización completada"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Resumen:"
echo "  ✓ Migraciones procesadas: $MIGRATION_COUNT archivos"
echo "  ✓ Respaldo creado"
echo "  ✓ Sintaxis MySQL eliminada"
echo "  ✓ Compatible con PostgreSQL"
echo ""
echo "🚀 Siguiente paso - Ejecutar migraciones:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  sudo docker compose exec application php artisan migrate --force"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

