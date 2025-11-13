#!/bin/bash
# Script para refactorizar migraciones de MySQL a PostgreSQL
# Ubicación: scripts/refactor-migrations-to-pgsql.sh

echo "🔄 Refactorizando migraciones de MySQL a PostgreSQL..."

# Directorio de migraciones dentro del contenedor
MIGRATIONS_DIR="/fleetbase/api/database/migrations"

# Crear respaldo
echo "📦 Creando respaldo de migraciones..."
docker compose exec application bash -c "cp -r $MIGRATIONS_DIR ${MIGRATIONS_DIR}_backup_mysql"

# Refactorizar cada migración
echo "✏️  Aplicando refactorizaciones..."

# 1. Eliminar CHARACTER SET y COLLATE
docker compose exec application bash -c "
find $MIGRATIONS_DIR -name '*.php' -type f -exec sed -i 's/CHARACTER SET [a-z0-9_]*//gI' {} \;
find $MIGRATIONS_DIR -name '*.php' -type f -exec sed -i 's/COLLATE [a-z0-9_]*//gI' {} \;
"

# 2. Eliminar ENGINE=InnoDB y variantes
docker compose exec application bash -c "
find $MIGRATIONS_DIR -name '*.php' -type f -exec sed -i 's/, *engine *= *[\"'\'']*InnoDB[\"'\'']*//gI' {} \;
find $MIGRATIONS_DIR -name '*.php' -type f -exec sed -i 's/engine *= *[\"'\'']*InnoDB[\"'\'']*//gI' {} \;
"

# 3. Reemplazar unsigned() por nada (PostgreSQL no tiene unsigned)
docker compose exec application bash -c "
find $MIGRATIONS_DIR -name '*.php' -type f -exec sed -i 's/->unsigned()//g' {} \;
"

# 4. Cambiar enum a string para PostgreSQL (enums funcionan diferente)
# Nota: Esto es una simplificación, revisar manualmente después
docker compose exec application bash -c "
find $MIGRATIONS_DIR -name '*.php' -type f -exec sed -i \"s/->enum(\([^)]*\))/->string(\1, 50)/g\" {} \;
"

# 5. Cambiar timestamp(0) a timestamp()
docker compose exec application bash -c "
find $MIGRATIONS_DIR -name '*.php' -type f -exec sed -i 's/->timestamp(0)/->timestamp()/g' {} \;
"

# 6. Eliminar opciones de charset en Schema
docker compose exec application bash -c "
find $MIGRATIONS_DIR -name '*.php' -type f -exec sed -i \"s/, 'charset' *=> *'[^']*'//g\" {} \;
find $MIGRATIONS_DIR -name '*.php' -type f -exec sed -i \"s/'charset' *=> *'[^']*', *//g\" {} \;
"

echo "✅ Refactorización completada!"
echo "📝 Nota: Revisa manualmente las migraciones en caso de problemas específicos"
echo ""
echo "🚀 Para ejecutar las migraciones:"
echo "   docker compose exec application php artisan migrate --force"

