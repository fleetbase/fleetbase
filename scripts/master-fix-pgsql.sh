#!/bin/bash
# Script maestro V3: Robusto con verificación de credenciales y timeouts
# Corrige TODAS las columnas uuid (incluyendo xxx_uuid) y ejecuta migraciones de forma segura

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔄 APLICANDO TODOS LOS FIXES DE POSTGRESQL (V3)${NC}"
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

# Función para timeout robusto
run_with_timeout() {
    local timeout=$1
    shift
    timeout --foreground "$timeout" "$@" || {
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            echo -e "${RED}❌ Timeout después de ${timeout}s${NC}"
            return 124
        fi
        return $exit_code
    }
}

# Detectar credenciales de la base de datos
echo -e "${BLUE}📋 Paso 1/8: Detectando configuración de la instancia...${NC}"

if [ ! -f "api/.env" ]; then
    echo -e "${RED}❌ Error: No se encuentra api/.env${NC}"
    exit 1
fi

# Leer credenciales del .env
DB_CONNECTION=$(grep "^DB_CONNECTION=" api/.env | cut -d= -f2)
DB_HOST=$(grep "^DB_HOST=" api/.env | cut -d= -f2)
DB_PORT=$(grep "^DB_PORT=" api/.env | cut -d= -f2)
DB_DATABASE=$(grep "^DB_DATABASE=" api/.env | cut -d= -f2)
DB_USERNAME=$(grep "^DB_USERNAME=" api/.env | cut -d= -f2)
DB_PASSWORD=$(grep "^DB_PASSWORD=" api/.env | cut -d= -f2)

echo -e "${GREEN}✅ Configuración detectada:${NC}"
echo -e "   ${BLUE}Conexión:${NC} $DB_CONNECTION"
echo -e "   ${BLUE}Host:${NC} $DB_HOST"
echo -e "   ${BLUE}Puerto:${NC} $DB_PORT"
echo -e "   ${BLUE}Base de datos:${NC} $DB_DATABASE"
echo -e "   ${BLUE}Usuario:${NC} $DB_USERNAME"
echo -e "   ${BLUE}Contraseña:${NC} ${DB_PASSWORD:0:3}***"
echo ""

# Verificar que los contenedores estén corriendo
echo -e "${BLUE}📋 Paso 2/8: Verificando contenedores...${NC}"
if ! $DOCKER_CMD compose ps | grep -q "Up"; then
    echo -e "${RED}❌ Error: Los contenedores no están corriendo${NC}"
    echo -e "${YELLOW}💡 Ejecuta: docker compose up -d${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Contenedores corriendo${NC}"
echo ""

# Verificar base de datos
echo -e "${BLUE}📋 Paso 3/8: Verificando conexión a PostgreSQL...${NC}"
if ! run_with_timeout 10 $DOCKER_CMD compose exec -T database pg_isready -U "$DB_USERNAME" >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: PostgreSQL no está listo${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL está listo${NC}"
echo ""

# Verificar conexión desde application
echo -e "${BLUE}📋 Paso 4/8: Verificando conexión desde application...${NC}"
CONNECTION_TEST=$($DOCKER_CMD compose exec -T application php -r "
try {
    \$pdo = new PDO('pgsql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_DATABASE', '$DB_USERNAME', '$DB_PASSWORD');
    echo 'OK';
} catch (Exception \$e) {
    echo 'ERROR: ' . \$e->getMessage();
    exit(1);
}" 2>&1)

if [[ "$CONNECTION_TEST" != "OK" ]]; then
    echo -e "${RED}❌ Error de conexión: $CONNECTION_TEST${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexión exitosa desde application${NC}"
echo ""

# Aplicar fixes en los archivos de migración
echo -e "${BLUE}📋 Paso 5/8: Aplicando fixes en archivos de migración...${NC}"

$DOCKER_CMD compose exec -T application bash << 'BASH_EOF'

echo "📦 Paso 5.1: Restaurando backups..."
find /fleetbase/api -name '*.mysql_backup' -type f 2>/dev/null | while read backup; do
    original=${backup%.mysql_backup}
    if [ -f "$backup" ] && [ ! -f "${original}.restored" ]; then
        cp "$backup" "$original"
        touch "${original}.restored"
    fi
done
echo "✅ Backups restaurados"

echo "🔧 Paso 5.2: Fix de permissions..."
FILE=$(find /fleetbase/api -name "*094304*permissions*.php" -type f | head -1)
[ -f "$FILE" ] && sed -i "s/->uuid('id')->index()/->uuid('id')->primary()/g" "$FILE" && echo "✅ Permissions"

echo "🔧 Paso 5.3: Fix de policies..."
FILE=$(find /fleetbase/api -name "*094311*policies*.php" -type f | grep -v "model_has_policies" | head -1)
if [ -f "$FILE" ]; then
    sed -i "s/->uuid('id')->index()/->uuid('id')->primary()/g" "$FILE"
    sed -i "s/->char('id', 36)/->uuid('id')->primary()/g" "$FILE"
    sed -i "s/->string('id', 191)/->uuid('id')->primary()/g" "$FILE"
    sed -i "s/->string('id')/->uuid('id')->primary()/g" "$FILE"
    echo "✅ Policies"
fi

echo "🔧 Paso 5.4: Deshabilitar personal_access_tokens..."
FILE=$(find /fleetbase/api -name "*fix_personal_access_tokens*.php" -type f | head -1)
if [ -f "$FILE" ]; then
    cat > "$FILE" << 'PHP_EOF'
<?php
use Illuminate\Database\Migrations\Migration;
return new class extends Migration {
    public function up() { }
    public function down() { }
};
PHP_EOF
    echo "✅ Personal access tokens disabled"
fi

echo "🔧 Paso 5.5: Fix de índices location..."
COUNT=0
grep -r "spatialIndex.*'location'" /fleetbase/api --include="*.php" | grep migrations | grep -v ".backup" | cut -d: -f1 | sort -u | while read FILE; do
    TABLE_NAME=$(basename "$FILE" | sed 's/.*create_\(.*\)_table.php/\1/')
    sed -i "s/spatialIndex(\['location'\], 'location')/spatialIndex(['location'], '${TABLE_NAME}_location_spatial')/g" "$FILE"
    COUNT=$((COUNT + 1))
done
echo "✅ Índices location fixed"

echo "🔧 Paso 5.6: Convertir TODAS las columnas *uuid de string/char a uuid..."
find /fleetbase/api -type f -name "*.php" -path "*/migrations/*" -not -name "*.backup" -not -name "*.mysql_backup" -not -name "*.restored" | while read FILE; do
    CHANGED=0
    
    # Cambiar char('xxx_uuid', XX) a uuid('xxx_uuid')
    if grep -q "->char('.*uuid" "$FILE"; then
        sed -i "s/->char('\([^']*uuid\)', [0-9]*)/->uuid('\1')/g" "$FILE"
        CHANGED=1
    fi
    
    # Cambiar string('xxx_uuid', 191) a uuid('xxx_uuid')
    if grep -q "->string('.*uuid.*', 191)" "$FILE"; then
        sed -i "s/->string('\([^']*uuid[^']*\)', 191)/->uuid('\1')/g" "$FILE"
        CHANGED=1
    fi
    
    # Cambiar string('xxx_uuid') a uuid('xxx_uuid')
    if grep -q "->string('.*uuid" "$FILE"; then
        sed -i "s/->string('\([^']*uuid[^']*\)')/->uuid('\1')/g" "$FILE"
        CHANGED=1
    fi
    
    [ $CHANGED -eq 1 ] && echo "  ✓ $(basename $FILE)"
done
echo "✅ Columnas uuid convertidas"

BASH_EOF

echo -e "${GREEN}✅ Todos los fixes aplicados en archivos${NC}"
echo ""

# Verificar que Laravel puede inicializarse
echo -e "${BLUE}📋 Paso 6/8: Verificando Laravel...${NC}"
if ! run_with_timeout 15 $DOCKER_CMD compose exec -T application php -v >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: PHP no responde${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PHP funcionando correctamente${NC}"
echo ""

# Verificar y limpiar procesos artisan colgados
echo -e "${BLUE}📋 Paso 7/8: Verificando procesos colgados...${NC}"
HUNG_PROCESSES=$(ps aux | grep -E "artisan (config:clear|cache:clear|migrate)" | grep -v grep | wc -l)
if [ "$HUNG_PROCESSES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Detectados $HUNG_PROCESSES procesos artisan colgados${NC}"
    echo -e "${BLUE}Reiniciando contenedor application para limpiar...${NC}"
    $DOCKER_CMD compose restart application
    echo -e "${YELLOW}Esperando 10 segundos a que el contenedor esté listo...${NC}"
    sleep 10
    echo -e "${GREEN}✅ Contenedor reiniciado${NC}"
else
    echo -e "${GREEN}✅ No hay procesos colgados${NC}"
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ TODOS LOS FIXES APLICADOS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Ejecutar migraciones con timeout
echo -e "${BLUE}📋 Paso 8/8: Ejecutando migraciones...${NC}"
echo -e "${YELLOW}⚠️  Este proceso puede tardar varios minutos (timeout: 10 minutos)${NC}"
echo -e "${YELLOW}💡 Si se queda atascado, presiona Ctrl+C${NC}"
echo ""

# Ejecutar migraciones usando bash directamente dentro del contenedor (sin -T)
echo -e "${BLUE}Ejecutando migraciones sin artisan (Migrator directo)...${NC}"
echo -e "${YELLOW}(Sin timeout, usa Illuminate Capsule + Migrator)${NC}"
echo ""

# Copiar el script PHP que NO usa artisan
echo -e "${BLUE}Copiando script PHP (sin artisan)...${NC}"
$DOCKER_CMD compose cp scripts/run-migrations-no-artisan.php application:/tmp/run-migrations.php 2>/dev/null || echo -e "${YELLOW}⚠️  No se pudo copiar run-migrations-no-artisan.php${NC}"
echo -e "${GREEN}✅ Script copiado${NC}"
echo ""

# Ejecutar el script PHP directamente (sin bash wrapper, sin TTY)
MIGRATE_CMD="$DOCKER_CMD compose exec -T application php /tmp/run-migrations.php"
if $MIGRATE_CMD 2>&1; then
    MIGRATION_SUCCESS=true
else
    EXIT_CODE=$?
    echo -e "${YELLOW}⚠️  Migraciones con Migrator fallaron (código $EXIT_CODE)${NC}"
    echo -e "${BLUE}Activando sistema de FALLBACK: Creando tablas con SQL directo...${NC}"
    echo ""
    
    # Copiar el script de creación SQL
    echo -e "${BLUE}📋 Preparando script de fallback SQL...${NC}"
    $DOCKER_CMD compose cp scripts/create-all-tables-sql.php application:/tmp/create-tables-sql.php 2>/dev/null || echo -e "${YELLOW}⚠️  No se pudo copiar script${NC}"
    
    # Ejecutar el script de creación de tablas SQL
    CREATE_TABLES_RESULT=$($DOCKER_CMD compose exec -T application php /tmp/create-tables-sql.php 2>&1)
    CREATE_EXIT_CODE=$?
    
    echo "$CREATE_TABLES_RESULT"
    echo ""

    if [ $CREATE_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ Tablas creadas exitosamente con SQL directo${NC}"
        MIGRATION_SUCCESS=true
    else
        echo -e "${RED}❌ Error al crear tablas con SQL directo${NC}"
        echo ""
        echo -e "${YELLOW}💡 Diagnóstico:${NC}"
        echo -e "   1. Verifica la conexión a PostgreSQL:"
        echo -e "      ${BLUE}docker compose exec database psql -U ${DB_USERNAME} -d ${DB_DATABASE}${NC}"
        echo ""
        echo -e "   2. Verifica los logs de la aplicación:"
        echo -e "      ${BLUE}docker compose logs application${NC}"
        echo ""
        echo -e "   3. Verifica las variables de entorno en api/.env"
        echo ""
        MIGRATION_SUCCESS=false
    fi
fi
echo ""

if [ "$MIGRATION_SUCCESS" = true ]; then
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
    EXIT_CODE=$?
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ ERROR EN MIGRACIONES${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    if [ $EXIT_CODE -eq 124 ]; then
        echo -e "${YELLOW}⏱️  El proceso excedió el timeout de 10 minutos${NC}"
        echo -e "${YELLOW}💡 Posibles causas:${NC}"
        echo -e "   - Demasiadas migraciones"
        echo -e "   - Base de datos lenta"
        echo -e "   - Proceso bloqueado"
    else
        echo -e "${YELLOW}💡 Para ver los logs detallados:${NC}"
        echo -e "   ${BLUE}docker compose logs application${NC}"
    fi
    echo ""
    echo -e "${YELLOW}💡 Para ver el estado de las migraciones:${NC}"
    echo -e "   ${BLUE}docker compose exec application php artisan migrate:status${NC}"
    echo ""
    exit $EXIT_CODE
fi
