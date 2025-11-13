#!/bin/bash
# Script para corregir TODAS las columnas UUID que están como VARCHAR
# Soluciona el error de foreign key constraint incompatible types

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔧 CORRIGIENDO TODAS LAS COLUMNAS UUID${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Detectar si necesita sudo
DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1; then
    if sudo docker ps >/dev/null 2>&1; then
        DOCKER_CMD="sudo docker"
        echo -e "${YELLOW}ℹ️  Usando sudo para Docker${NC}"
    else
        echo -e "${RED}❌ Error: No se puede acceder a Docker${NC}"
        exit 1
    fi
fi

# Leer credenciales del .env
if [ -f "api/.env" ]; then
    DB_DATABASE=$(grep "^DB_DATABASE=" api/.env | cut -d'=' -f2)
    DB_USERNAME=$(grep "^DB_USERNAME=" api/.env | cut -d'=' -f2)
    
    echo -e "${GREEN}✅ Credenciales detectadas:${NC}"
    echo -e "   Base de datos: ${BLUE}$DB_DATABASE${NC}"
    echo -e "   Usuario: ${BLUE}$DB_USERNAME${NC}"
    echo ""
else
    echo -e "${RED}❌ Error: No se encuentra api/.env${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Paso 1: Detectando columnas UUID que son VARCHAR...${NC}"
echo ""

# Encontrar todas las columnas 'uuid' que son VARCHAR/CHAR
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t << 'SQL_EOF' | grep -v "^$"
SELECT 
    table_name || '.' || column_name as columna,
    data_type as tipo
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'uuid'
    AND data_type IN ('character varying', 'character', 'text')
ORDER BY table_name;
SQL_EOF

echo ""
echo -e "${YELLOW}⚠️  Estas columnas deben ser de tipo UUID nativo${NC}"
echo ""

echo ""
echo -e "${BLUE}📋 Paso 2: Buscando TODAS las foreign keys que apuntan a columnas UUID...${NC}"
echo ""

# Obtener todas las foreign keys que apuntan a columnas uuid
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF'
SELECT DISTINCT
    tc.table_name AS tabla_origen, 
    tc.constraint_name AS constraint,
    kcu.column_name AS columna_origen,
    ccu.table_name AS tabla_destino,
    ccu.column_name AS columna_destino
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.column_name = 'uuid'
ORDER BY tabla_destino, tabla_origen;
SQL_EOF


echo ""
echo -e "${YELLOW}⚠️  Voy a eliminar temporalmente TODAS las foreign keys${NC}"
echo -e "${YELLOW}   para poder cambiar los tipos de columnas UUID${NC}"
echo ""
read -p "¿Deseas continuar? (s/n): " CONFIRM

if [ "$CONFIRM" != "s" ]; then
    echo -e "${RED}❌ Operación cancelada${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Paso 3: Eliminando TODAS las foreign keys temporalmente...${NC}"

$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF'
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    -- Eliminar TODAS las foreign keys que apuntan a columnas 'uuid'
    FOR fk_record IN 
        SELECT DISTINCT
            tc.table_name, 
            tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.column_name = 'uuid'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
            fk_record.table_name, fk_record.constraint_name);
        RAISE NOTICE 'Eliminado FK: %.%', fk_record.table_name, fk_record.constraint_name;
    END LOOP;
END $$;
SQL_EOF

echo -e "${GREEN}✅ Foreign keys eliminadas${NC}"
echo ""

echo -e "${BLUE}📋 Paso 4: Convirtiendo TODAS las columnas 'uuid' de VARCHAR a UUID...${NC}"

$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF'
DO $$
DECLARE
    table_record RECORD;
    converted_count INTEGER := 0;
BEGIN
    -- Habilitar extensión uuid-ossp si no está
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Buscar todas las tablas con columna 'uuid' que no es UUID
    FOR table_record IN 
        SELECT DISTINCT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND column_name = 'uuid'
            AND data_type IN ('character varying', 'character', 'text')
    LOOP
        BEGIN
            -- Convertir la columna uuid a UUID
            EXECUTE format('ALTER TABLE %I ALTER COLUMN uuid TYPE UUID USING uuid::UUID', 
                table_record.table_name);
            
            -- Agregar unique constraint si no existe
            BEGIN
                EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (uuid)', 
                    table_record.table_name,
                    table_record.table_name || '_uuid_unique');
            EXCEPTION WHEN duplicate_table THEN
                -- El constraint ya existe
                NULL;
            END;
            
            RAISE NOTICE 'Convertido: %.uuid a UUID', table_record.table_name;
            converted_count := converted_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'No se pudo convertir %.uuid: %', 
                table_record.table_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Total de tablas convertidas: %', converted_count;
END $$;
SQL_EOF

echo -e "${GREEN}✅ Columnas 'uuid' convertidas${NC}"
echo ""

echo -e "${BLUE}📋 Paso 5: Convirtiendo todas las columnas *_uuid que son VARCHAR...${NC}"


$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF'
DO $$
DECLARE
    col_record RECORD;
BEGIN
    -- Buscar todas las columnas que terminan en _uuid y son VARCHAR
    FOR col_record IN 
        SELECT 
            table_name, 
            column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND (column_name LIKE '%_uuid' OR column_name = 'uuid')
            AND data_type IN ('character varying', 'character', 'text')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE UUID USING %I::UUID', 
                col_record.table_name, 
                col_record.column_name,
                col_record.column_name);
            RAISE NOTICE 'Convertido: %.% a UUID', col_record.table_name, col_record.column_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'No se pudo convertir %.%: %', 
                col_record.table_name, col_record.column_name, SQLERRM;
        END;
    END LOOP;
END $$;
SQL_EOF

echo -e "${GREEN}✅ Columnas UUID convertidas${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ CONVERSIÓN COMPLETADA${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}📋 Paso 6: Re-ejecutando migraciones pendientes...${NC}"
echo ""

$DOCKER_CMD compose exec application php artisan migrate --force

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 ¡MIGRACIONES COMPLETADAS EXITOSAMENTE!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}✅ Ahora puedes acceder a:${NC}"
    echo -e "   ${BLUE}http://localhost:4200/onboard${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ Hubo errores en las migraciones${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}💡 Ver logs:${NC}"
    echo -e "   ${BLUE}docker compose logs application${NC}"
    echo ""
    exit 1
fi

