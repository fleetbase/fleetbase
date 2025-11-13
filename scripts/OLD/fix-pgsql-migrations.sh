#!/bin/bash
# Script para solucionar el problema de foreign keys en PostgreSQL
# Ubicación: scripts/fix-pgsql-migrations.sh

echo "🔧 Solucionando problema de Foreign Keys en PostgreSQL"
echo ""

# Paso 1: Limpiar la base de datos
echo "🗑️  Paso 1: Limpiando base de datos..."
sudo docker compose exec application php artisan db:wipe --force
echo "✅ Base de datos limpiada"
echo ""

# Paso 2: Verificar conexión a PostgreSQL
echo "🔍 Paso 2: Verificando conexión..."
sudo docker compose exec application php artisan db:show
echo ""

# Paso 3: Ejecutar migraciones con verbose
echo "🚀 Paso 3: Ejecutando migraciones (modo verbose)..."
sudo docker compose exec application php artisan migrate --force -vvv 2>&1 | tee migration_log.txt

echo ""
echo "📝 Log guardado en migration_log.txt"
echo ""
echo "Si hay errores específicos, los ajustaremos manualmente."

