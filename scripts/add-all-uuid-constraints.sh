#!/bin/bash
# Script para agregar UNIQUE constraints a todas las columnas uuid que los necesiten

echo "🔧 Agregando UNIQUE constraints faltantes..."

sudo docker compose exec -T database psql -U fleetbase -d fleetbase << 'SQL_EOF'
-- Agregar UNIQUE constraint a todas las tablas que tienen columna uuid pero no tienen el constraint

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'uuid'
        AND table_name NOT IN (
            SELECT table_name 
            FROM information_schema.table_constraints 
            WHERE constraint_type = 'UNIQUE' 
            AND table_schema = 'public'
            AND constraint_name LIKE '%uuid_unique'
        )
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (uuid)', r.table_name, r.table_name || '_uuid_unique');
            RAISE NOTICE 'Added UNIQUE constraint to %.uuid', r.table_name;
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Could not add UNIQUE to % (may already exist): %', r.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

SQL_EOF

echo "✅ UNIQUE constraints agregados"
echo ""
echo "🚀 Continuando con migraciones..."
sudo docker compose exec application php artisan migrate --force

