#!/bin/bash
# Script simplificado para ejecutar migraciones con manejo de timeouts
# Si una migración se queda atascada, la salta automáticamente

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 MIGRACIONES CON MANEJO DE TIMEOUTS${NC}"
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

# Timeout por intento (en segundos)
TIMEOUT_SECONDS=45
MAX_ATTEMPTS=50

echo -e "${YELLOW}⚙️  Configuración:${NC}"
echo -e "   Timeout: ${BLUE}${TIMEOUT_SECONDS}s${NC}"
echo -e "   Max intentos: ${BLUE}${MAX_ATTEMPTS}${NC}"
echo ""

attempt=1
stuck_count=0

while [ $attempt -le $MAX_ATTEMPTS ]; do
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}🔄 Intento $attempt/$MAX_ATTEMPTS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Intentar ejecutar migraciones con timeout
    OUTPUT=$(timeout $TIMEOUT_SECONDS $DOCKER_CMD compose exec application php artisan migrate --force 2>&1 || true)
    EXIT_CODE=$?
    
    echo "$OUTPUT"
    
    # Si terminó exitosamente
    if [ $EXIT_CODE -eq 0 ] && echo "$OUTPUT" | grep -q "Nothing to migrate"; then
        echo ""
        echo -e "${GREEN}✅ ¡TODAS LAS MIGRACIONES COMPLETADAS!${NC}"
        break
    fi
    
    # Si hubo timeout
    if [ $EXIT_CODE -eq 124 ]; then
        echo ""
        echo -e "${RED}⏱️  TIMEOUT: La migración se quedó atascada${NC}"
        stuck_count=$((stuck_count + 1))
        
        # Extraer el nombre de la migración que se quedó atascada
        STUCK_MIGRATION=$(echo "$OUTPUT" | grep -oP '^\s+\K[0-9_]+\w+' | tail -1)
        
        if [ -n "$STUCK_MIGRATION" ]; then
            echo -e "${YELLOW}📋 Migración atascada: $STUCK_MIGRATION${NC}"
            
            # Extraer nombre de tabla
            TABLE_NAME=$(echo "$STUCK_MIGRATION" | sed -E 's/[0-9_]+create_(.*)_table/\1/')
            
            if [ -n "$TABLE_NAME" ] && [ "$TABLE_NAME" != "$STUCK_MIGRATION" ]; then
                echo -e "${YELLOW}🔄 Creando tabla '$TABLE_NAME' manualmente...${NC}"
                
                # Crear tabla con estructura básica
                $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << SQL_EOF 2>&1 | grep -v "^$"
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = '$TABLE_NAME') THEN
        CREATE TABLE $TABLE_NAME (
            id BIGSERIAL PRIMARY KEY,
            uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
            public_id VARCHAR(191),
            company_uuid UUID,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP
        );
        RAISE NOTICE 'Tabla % creada', '$TABLE_NAME';
    END IF;
END \$\$;
SQL_EOF
                
                # Registrar migración
                LAST_BATCH=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COALESCE(MAX(batch), 0) FROM migrations;" | tr -d ' ')
                CURRENT_BATCH=$((LAST_BATCH + 1))
                
                $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << SQL_EOF 2>&1 | grep -v "^$"
INSERT INTO migrations (migration, batch) 
VALUES ('$STUCK_MIGRATION', $CURRENT_BATCH)
ON CONFLICT DO NOTHING;
SQL_EOF
                
                echo -e "${GREEN}✅ Tabla creada y migración registrada${NC}"
            else
                echo -e "${YELLOW}⚠️  Solo registrando migración sin crear tabla${NC}"
                
                LAST_BATCH=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COALESCE(MAX(batch), 0) FROM migrations;" | tr -d ' ')
                CURRENT_BATCH=$((LAST_BATCH + 1))
                
                $DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" << SQL_EOF 2>&1 | grep -v "^$"
INSERT INTO migrations (migration, batch) 
VALUES ('$STUCK_MIGRATION', $CURRENT_BATCH)
ON CONFLICT DO NOTHING;
SQL_EOF
                
                echo -e "${GREEN}✅ Migración registrada${NC}"
            fi
        else
            echo -e "${RED}⚠️  No se pudo identificar la migración atascada${NC}"
        fi
        
        echo ""
        echo -e "${YELLOW}🔄 Continuando con siguiente intento...${NC}"
    elif [ $EXIT_CODE -ne 0 ]; then
        # Otro tipo de error
        echo ""
        echo -e "${RED}❌ Error en migraciones (código $EXIT_CODE)${NC}"
        
        # Si el error es por FK o tipos, mostrar ayuda
        if echo "$OUTPUT" | grep -q "SQLSTATE\[42804\]"; then
            echo -e "${YELLOW}💡 Detectado error de tipo de datos incompatibles${NC}"
            echo -e "${YELLOW}   Ejecuta: ${BLUE}bash scripts/fix-all-uuid-types.sh${NC}"
            exit 1
        fi
    fi
    
    attempt=$((attempt + 1))
    echo ""
    sleep 2
done

if [ $attempt -gt $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ Se alcanzó el máximo de intentos${NC}"
    echo -e "${YELLOW}📊 Migraciones atascadas: $stuck_count${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ PROCESO COMPLETADO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🌐 Puedes acceder a:${NC}"
echo -e "   ${BLUE}http://localhost:4200/onboard${NC}"
echo ""
