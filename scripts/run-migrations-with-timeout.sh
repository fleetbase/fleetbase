#!/bin/bash
# Script para ejecutar migraciones con detección de timeouts
# Si una migración se queda atascada por más de 5 minutos, se detecta y se puede saltar
# Ejecutar: bash scripts/run-migrations-with-timeout.sh

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 EJECUTAR MIGRACIONES CON DETECCIÓN DE TIMEOUT${NC}"
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
if [ ! -f "api/.env" ]; then
    echo -e "${RED}❌ Error: No se encuentra api/.env${NC}"
    exit 1
fi

DB_USERNAME=$(grep "^DB_USERNAME=" api/.env | cut -d= -f2)
DB_DATABASE=$(grep "^DB_DATABASE=" api/.env | cut -d= -f2)

# Configuración de timeout (en segundos)
TIMEOUT_SECONDS=300  # 5 minutos por migración
CHECK_INTERVAL=10    # Verificar cada 10 segundos

echo -e "${YELLOW}⚙️  Configuración:${NC}"
echo -e "   Timeout por migración: ${BLUE}${TIMEOUT_SECONDS}s${NC} (5 minutos)"
echo -e "   Intervalo de verificación: ${BLUE}${CHECK_INTERVAL}s${NC}"
echo ""

echo -e "${BLUE}📋 Paso 1/3: Obteniendo migraciones pendientes...${NC}"

# Obtener lista de migraciones pendientes
PENDING_OUTPUT=$($DOCKER_CMD compose exec -T application php artisan migrate:status 2>&1 | grep -E "^\s*Pending" | awk '{print $3}' || echo "")

if [ -z "$PENDING_OUTPUT" ]; then
    echo -e "${GREEN}✅ No hay migraciones pendientes${NC}"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ TODAS LAS MIGRACIONES ESTÁN COMPLETAS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
fi

PENDING_COUNT=$(echo "$PENDING_OUTPUT" | wc -l)
echo -e "${YELLOW}⚠️  Migraciones pendientes: $PENDING_COUNT${NC}"
echo ""

echo -e "${BLUE}📋 Paso 2/3: Ejecutando migraciones con monitoreo...${NC}"
echo ""

# Crear archivo temporal para el PID del proceso de migración
MIGRATION_PID_FILE="/tmp/fleetbase_migration_pid_$$"
MIGRATION_LOG_FILE="/tmp/fleetbase_migration_log_$$"

# Función de limpieza
cleanup() {
    rm -f "$MIGRATION_PID_FILE" "$MIGRATION_LOG_FILE"
}
trap cleanup EXIT

echo -e "${YELLOW}Iniciando proceso de migración...${NC}"
echo -e "${YELLOW}(Se detendrá automáticamente si alguna migración tarda más de 5 minutos)${NC}"
echo ""

# Obtener la última migración antes de empezar
LAST_MIGRATION_BEFORE=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
    SELECT migration FROM migrations ORDER BY batch DESC, id DESC LIMIT 1;
" 2>/dev/null | tr -d ' ' | tr -d '\r' | tr -d '\n' || echo "")

echo -e "${BLUE}Última migración completada: ${YELLOW}${LAST_MIGRATION_BEFORE:-ninguna}${NC}"
echo ""

# Ejecutar migraciones en background
$DOCKER_CMD compose exec -T application php artisan migrate --force > "$MIGRATION_LOG_FILE" 2>&1 &
MIGRATION_PID=$!

echo "$MIGRATION_PID" > "$MIGRATION_PID_FILE"
echo -e "${BLUE}Proceso de migración iniciado (PID: $MIGRATION_PID)${NC}"
echo ""

# Monitorear el progreso
ELAPSED=0
LAST_MIGRATION_CHECK="$LAST_MIGRATION_BEFORE"
STUCK_COUNTER=0

while kill -0 $MIGRATION_PID 2>/dev/null; do
    sleep $CHECK_INTERVAL
    ELAPSED=$((ELAPSED + CHECK_INTERVAL))
    
    # Verificar la última migración completada
    CURRENT_MIGRATION=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
        SELECT migration FROM migrations ORDER BY batch DESC, id DESC LIMIT 1;
    " 2>/dev/null | tr -d ' ' | tr -d '\r' | tr -d '\n' || echo "")
    
    if [ "$CURRENT_MIGRATION" != "$LAST_MIGRATION_CHECK" ]; then
        # Hubo progreso, resetear contadores
        echo -e "${GREEN}✓${NC} Completada: ${BLUE}$CURRENT_MIGRATION${NC}"
        LAST_MIGRATION_CHECK="$CURRENT_MIGRATION"
        STUCK_COUNTER=0
    else
        # No hay progreso
        STUCK_COUNTER=$((STUCK_COUNTER + CHECK_INTERVAL))
        
        if [ $STUCK_COUNTER -ge $TIMEOUT_SECONDS ]; then
            echo ""
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${RED}⏱️  TIMEOUT: Migración atascada por más de 5 minutos${NC}"
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            
            # Matar el proceso
            kill -9 $MIGRATION_PID 2>/dev/null || true
            
            # Mostrar últimos logs
            echo -e "${YELLOW}📋 Últimas líneas del log:${NC}"
            tail -20 "$MIGRATION_LOG_FILE" | sed 's/^/   /'
            echo ""
            
            # Detectar qué migración estaba corriendo
            PENDING_MIGRATIONS=$($DOCKER_CMD compose exec -T application php artisan migrate:status 2>&1 | grep -E "^\s*Pending" | head -5)
            
            if [ -n "$PENDING_MIGRATIONS" ]; then
                echo -e "${YELLOW}📋 Próximas migraciones pendientes:${NC}"
                echo "$PENDING_MIGRATIONS" | sed 's/^/   /'
                echo ""
                
                STUCK_MIGRATION=$(echo "$PENDING_MIGRATIONS" | head -1 | awk '{print $3}')
                
                echo -e "${RED}⚠️  Migración probablemente atascada:${NC}"
                echo -e "   ${YELLOW}$STUCK_MIGRATION${NC}"
                echo ""
                
                echo -e "${YELLOW}💡 Recomendaciones:${NC}"
                echo -e "   ${BLUE}1.${NC} Ejecutar el fix de migraciones atascadas:"
                echo -e "      ${GREEN}bash scripts/fix-stuck-migrations.sh${NC}"
                echo ""
                echo -e "   ${BLUE}2.${NC} Investigar el archivo de migración:"
                echo -e "      ${GREEN}find api -name '*${STUCK_MIGRATION}*' -exec cat {} \\;${NC}"
                echo ""
                echo -e "   ${BLUE}3.${NC} Ver logs de PostgreSQL:"
                echo -e "      ${GREEN}docker compose logs database | tail -50${NC}"
                echo ""
                echo -e "   ${BLUE}4.${NC} Verificar procesos en PostgreSQL:"
                echo -e "      ${GREEN}docker compose exec database psql -U $DB_USERNAME -d $DB_DATABASE -c \"SELECT pid, usename, state, query FROM pg_stat_activity WHERE state != 'idle';\"${NC}"
                echo ""
            fi
            
            exit 1
        fi
        
        # Mostrar progreso
        echo -e "${YELLOW}⏳${NC} Esperando... (${STUCK_COUNTER}s sin progreso)"
    fi
done

# Proceso terminó normalmente
wait $MIGRATION_PID
MIGRATION_EXIT_CODE=$?

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ MIGRACIONES COMPLETADAS EXITOSAMENTE${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Mostrar estadísticas
    TOTAL_MIGRATIONS=$($DOCKER_CMD compose exec -T database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "
        SELECT COUNT(*) FROM migrations;
    " 2>/dev/null | tr -d ' ')
    
    echo -e "${GREEN}📊 Estadísticas:${NC}"
    echo -e "   Total de migraciones: ${BLUE}$TOTAL_MIGRATIONS${NC}"
    echo -e "   Tiempo total: ${BLUE}${ELAPSED}s${NC}"
    echo ""
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 ¡MIGRACIONES COMPLETADAS EXITOSAMENTE!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}✅ Próximos pasos:${NC}"
    echo ""
    echo -e "   ${YELLOW}Probar${NC}"
    echo ""
    echo -e "   ${BLUE}http://localhost:4200/${NC}"
    echo ""
    echo -e "   ${YELLOW}Crea la primer cuenta administrativa${NC}"
    echo ""
else
    echo -e "${RED}❌ ERROR EN MIGRACIONES (código: $MIGRATION_EXIT_CODE)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${YELLOW}📋 Log completo:${NC}"
    cat "$MIGRATION_LOG_FILE" | sed 's/^/   /'
    echo ""
    
    echo -e "${YELLOW}💡 Sugerencias:${NC}"
    echo -e "   ${BLUE}1.${NC} Ejecutar el fix de migraciones:"
    echo -e "      ${GREEN}bash scripts/fix-stuck-migrations.sh${NC}"
    echo ""
    echo -e "   ${BLUE}2.${NC} Ver el estado de migraciones:"
    echo -e "      ${GREEN}docker compose exec application php artisan migrate:status${NC}"
    echo ""
    
    exit $MIGRATION_EXIT_CODE
fi

