#!/bin/bash
# Script para saltar migraciones que se quedan atascadas
# Registra la migración sin ejecutarla (útil cuando artisan se cuelga)

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}⏭️  SALTANDO MIGRACIÓN ATASCADA${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Detectar si necesita sudo
DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1; then
    if sudo docker ps >/dev/null 2>&1; then
        DOCKER_CMD="sudo docker"
    fi
fi

# Leer credenciales
if [ -f "api/.env" ]; then
    DB_DATABASE=$(grep "^DB_DATABASE=" api/.env | cut -d'=' -f2)
    DB_USERNAME=$(grep "^DB_USERNAME=" api/.env | cut -d'=' -f2)
else
    echo -e "${RED}❌ Error: No se encuentra api/.env${NC}"
    exit 1
fi

# Nombre de la migración atascada
MIGRATION_NAME="2023_05_03_025307_create_carts_table"

echo -e "${YELLOW}📋 Migración a saltar: ${BLUE}$MIGRATION_NAME${NC}"
echo ""

echo -e "${BLUE}📋 Paso 1: Verificando si la tabla 'carts' existe...${NC}"

TABLE_EXISTS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'carts'
        AND table_schema = 'public'
    );
" | tr -d ' ')

if [ "$TABLE_EXISTS" = "t" ]; then
    echo -e "${GREEN}✅ La tabla 'carts' ya existe${NC}"
    echo -e "${YELLOW}   Voy a registrar la migración sin ejecutarla${NC}"
else
    echo -e "${YELLOW}⚠️  La tabla 'carts' NO existe${NC}"
    echo -e "${YELLOW}   Voy a crear la tabla manualmente${NC}"
    echo ""
    
    echo -e "${BLUE}📋 Paso 2: Creando tabla 'carts' manualmente...${NC}"
    
    $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << 'SQL_EOF'
-- Crear tabla carts
CREATE TABLE IF NOT EXISTS carts (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    public_id VARCHAR(191) UNIQUE,
    company_uuid UUID,
    customer_uuid UUID,
    customer_type VARCHAR(255),
    checkout_uuid UUID,
    service_quote_uuid UUID,
    payload_uuid UUID,
    subtotal INTEGER DEFAULT 0,
    delivery_tip INTEGER DEFAULT 0,
    tax INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    is_checked_out BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP,
    meta JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS carts_company_uuid_idx ON carts(company_uuid);
CREATE INDEX IF NOT EXISTS carts_customer_uuid_idx ON carts(customer_uuid);
CREATE INDEX IF NOT EXISTS carts_payload_uuid_idx ON carts(payload_uuid);

SQL_EOF
    
    echo -e "${GREEN}✅ Tabla 'carts' creada${NC}"
fi

echo ""
echo -e "${BLUE}📋 Paso 3: Registrando migración en la base de datos...${NC}"

# Obtener el último batch
LAST_BATCH=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT COALESCE(MAX(batch), 0) FROM migrations;
" | tr -d ' ')

CURRENT_BATCH=$((LAST_BATCH + 1))

# Registrar la migración
$DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << SQL_EOF
INSERT INTO migrations (migration, batch) 
VALUES ('$MIGRATION_NAME', $CURRENT_BATCH)
ON CONFLICT DO NOTHING;
SQL_EOF

echo -e "${GREEN}✅ Migración registrada en batch $CURRENT_BATCH${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ MIGRACIÓN SALTADA EXITOSAMENTE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📋 Próximo paso: Continuar con las migraciones${NC}"
echo -e "   ${BLUE}docker compose exec application php artisan migrate --force${NC}"
echo ""

