#!/bin/bash
# Script de Verificación y Comparación con Backup Exitoso
# Compara la configuración actual con el backup que funcionó

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_DIR="$(cd "$(dirname "$0")/fleetbase-backup-20251111-061102" && pwd)"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔍 VERIFICACIÓN DE CONFIGURACIÓN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Función para comparar archivos
compare_file() {
    local backup_file="$1"
    local repo_file="$2"
    local file_name="$3"
    
    echo -e "${YELLOW}📄 Verificando: $file_name${NC}"
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}   ❌ Archivo no existe en backup${NC}"
        return 1
    fi
    
    if [ ! -f "$repo_file" ]; then
        echo -e "${RED}   ❌ Archivo no existe en repositorio actual${NC}"
        echo -e "${YELLOW}   💡 Sugerencia: cp $backup_file $repo_file${NC}"
        return 1
    fi
    
    if diff -q "$backup_file" "$repo_file" > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ Archivos idénticos${NC}"
        return 0
    else
        echo -e "${YELLOW}   ⚠️  Archivos diferentes${NC}"
        echo -e "${YELLOW}   📊 Diferencias encontradas:${NC}"
        diff -u "$backup_file" "$repo_file" | head -20 || true
        echo ""
        return 2
    fi
}

# Verificar existencia del backup
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Directorio de backup no encontrado: $BACKUP_DIR${NC}"
    echo -e "${YELLOW}💡 Por favor extrae el archivo fleetbase-backup-20251111-061102.tar.gz${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backup encontrado: $BACKUP_DIR${NC}"
echo -e "${GREEN}✅ Repositorio: $REPO_ROOT${NC}"
echo ""

# Contadores
IDENTICAL=0
DIFFERENT=0
MISSING=0

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}1. ARCHIVOS DOCKER COMPOSE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# docker-compose.yml
compare_file \
    "$BACKUP_DIR/config/docker-compose.yml" \
    "$REPO_ROOT/docker-compose.yml" \
    "docker-compose.yml"
result=$?
[ $result -eq 0 ] && ((IDENTICAL++)) || [ $result -eq 2 ] && ((DIFFERENT++)) || ((MISSING++))
echo ""

# docker-compose.override.yml
compare_file \
    "$BACKUP_DIR/config/docker-compose.override.yml" \
    "$REPO_ROOT/docker-compose.override.yml" \
    "docker-compose.override.yml (⭐ CRÍTICO)"
result=$?
[ $result -eq 0 ] && ((IDENTICAL++)) || [ $result -eq 2 ] && ((DIFFERENT++)) || ((MISSING++))
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}2. CONFIGURACIÓN API${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# api/.env
echo -e "${YELLOW}📄 Verificando: api/.env (⭐ CRÍTICO)${NC}"
if [ -f "$REPO_ROOT/api/.env" ]; then
    echo -e "${GREEN}   ✅ Archivo existe${NC}"
    
    # Verificar variables críticas
    echo -e "${YELLOW}   🔍 Verificando variables críticas:${NC}"
    
    if grep -q "^APP_KEY=" "$REPO_ROOT/api/.env"; then
        echo -e "${GREEN}      ✅ APP_KEY definido${NC}"
    else
        echo -e "${RED}      ❌ APP_KEY no definido${NC}"
        ((MISSING++))
    fi
    
    if grep -q "^DB_CONNECTION=pgsql" "$REPO_ROOT/api/.env"; then
        echo -e "${GREEN}      ✅ DB_CONNECTION=pgsql${NC}"
    else
        echo -e "${RED}      ❌ DB_CONNECTION no es pgsql${NC}"
        ((DIFFERENT++))
    fi
    
    if grep -q "^CACHE_DRIVER=redis" "$REPO_ROOT/api/.env"; then
        echo -e "${GREEN}      ✅ CACHE_DRIVER=redis${NC}"
    else
        echo -e "${YELLOW}      ⚠️  CACHE_DRIVER no es redis${NC}"
    fi
    
    if grep -q "^REDIS_HOST=cache" "$REPO_ROOT/api/.env"; then
        echo -e "${GREEN}      ✅ REDIS_HOST=cache${NC}"
    else
        echo -e "${YELLOW}      ⚠️  REDIS_HOST no es 'cache'${NC}"
    fi
else
    echo -e "${RED}   ❌ Archivo api/.env no existe${NC}"
    echo -e "${YELLOW}   💡 Sugerencia: cp $BACKUP_DIR/config/api.env $REPO_ROOT/api/.env${NC}"
    ((MISSING++))
fi
echo ""

# database.php
compare_file \
    "$BACKUP_DIR/config/api-config/database.php" \
    "$REPO_ROOT/api/config/database.php" \
    "api/config/database.php (⭐ CRÍTICO)"
result=$?
[ $result -eq 0 ] && ((IDENTICAL++)) || [ $result -eq 2 ] && ((DIFFERENT++)) || ((MISSING++))
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}3. OTROS ARCHIVOS DE CONFIGURACIÓN${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Contar archivos de configuración
config_count=$(ls -1 "$REPO_ROOT/api/config/"*.php 2>/dev/null | wc -l)
backup_config_count=$(ls -1 "$BACKUP_DIR/config/api-config/"*.php 2>/dev/null | wc -l)

echo -e "${YELLOW}📦 Archivos de configuración Laravel:${NC}"
echo -e "   Backup: $backup_config_count archivos"
echo -e "   Actual: $config_count archivos"

if [ $config_count -eq $backup_config_count ]; then
    echo -e "${GREEN}   ✅ Mismo número de archivos${NC}"
    ((IDENTICAL++))
elif [ $config_count -lt $backup_config_count ]; then
    echo -e "${RED}   ❌ Faltan archivos en el repositorio actual${NC}"
    ((MISSING++))
else
    echo -e "${YELLOW}   ⚠️  Más archivos en repositorio actual${NC}"
fi
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}4. DOCKER Y BASE DE DATOS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Verificar Dockerfile.pgsql
echo -e "${YELLOW}📄 Verificando: docker/Dockerfile.pgsql${NC}"
if [ -f "$REPO_ROOT/docker/Dockerfile.pgsql" ]; then
    echo -e "${GREEN}   ✅ Dockerfile.pgsql existe${NC}"
    ((IDENTICAL++))
else
    echo -e "${RED}   ❌ Dockerfile.pgsql NO EXISTE${NC}"
    echo -e "${RED}   ⚠️  CRÍTICO: Este archivo es necesario para PostgreSQL${NC}"
    ((MISSING++))
fi
echo ""

# Verificar dump
echo -e "${YELLOW}📄 Verificando: fleetbase_db.dump${NC}"
if [ -f "$BACKUP_DIR/fleetbase_db.dump" ]; then
    size=$(du -h "$BACKUP_DIR/fleetbase_db.dump" | cut -f1)
    echo -e "${GREEN}   ✅ Dump disponible: $size${NC}"
    echo -e "${YELLOW}   💡 Listo para restaurar${NC}"
else
    echo -e "${RED}   ❌ Dump no encontrado${NC}"
    ((MISSING++))
fi
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}5. SCRIPTS Y UTILIDADES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Contar scripts
backup_scripts=$(ls -1 "$BACKUP_DIR/scripts/"*.sh 2>/dev/null | wc -l)
repo_scripts=$(ls -1 "$REPO_ROOT/scripts/"*.sh 2>/dev/null | wc -l)

echo -e "${YELLOW}🔧 Scripts de migración:${NC}"
echo -e "   Backup: $backup_scripts scripts"
echo -e "   Actual: $repo_scripts scripts"

if [ $repo_scripts -ge 10 ]; then
    echo -e "${GREEN}   ✅ Scripts disponibles${NC}"
    ((IDENTICAL++))
else
    echo -e "${YELLOW}   ⚠️  Pocos scripts, considera copiar más desde backup${NC}"
    ((DIFFERENT++))
fi
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}6. VERIFICACIÓN AVANZADA${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Verificar PostGIS en docker-compose.override.yml
echo -e "${YELLOW}🔍 Verificando imagen PostGIS en override:${NC}"
if grep -q "postgis/postgis:16-3.4-alpine" "$REPO_ROOT/docker-compose.override.yml" 2>/dev/null; then
    echo -e "${GREEN}   ✅ PostGIS 16-3.4-alpine configurado${NC}"
    ((IDENTICAL++))
elif grep -q "postgres:16-alpine" "$REPO_ROOT/docker-compose.override.yml" 2>/dev/null; then
    echo -e "${RED}   ❌ Usando postgres simple, necesita PostGIS${NC}"
    echo -e "${YELLOW}   💡 Cambia a: postgis/postgis:16-3.4-alpine${NC}"
    ((DIFFERENT++))
else
    echo -e "${RED}   ❌ No se pudo verificar imagen de base de datos${NC}"
    ((MISSING++))
fi
echo ""

# Verificar volumen nombrado
echo -e "${YELLOW}🔍 Verificando volumen nombrado:${NC}"
if grep -q "fleetbase_postgres_data:" "$REPO_ROOT/docker-compose.override.yml" 2>/dev/null; then
    echo -e "${GREEN}   ✅ Volumen nombrado configurado${NC}"
    ((IDENTICAL++))
else
    echo -e "${RED}   ❌ Volumen nombrado no encontrado${NC}"
    echo -e "${YELLOW}   💡 Agrega en volumes: fleetbase_postgres_data:${NC}"
    ((MISSING++))
fi
echo ""

# Verificar PHP_MEMORY_LIMIT
echo -e "${YELLOW}🔍 Verificando PHP_MEMORY_LIMIT en override:${NC}"
if grep -q 'PHP_MEMORY_LIMIT.*"-1"' "$REPO_ROOT/docker-compose.override.yml" 2>/dev/null; then
    echo -e "${GREEN}   ✅ PHP sin límite de memoria${NC}"
    ((IDENTICAL++))
else
    echo -e "${YELLOW}   ⚠️  PHP_MEMORY_LIMIT no configurado como -1${NC}"
    echo -e "${YELLOW}   💡 Recomendado para migraciones grandes${NC}"
    ((DIFFERENT++))
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📊 RESUMEN DE VERIFICACIÓN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}✅ Archivos idénticos:    $IDENTICAL${NC}"
echo -e "${YELLOW}⚠️  Archivos diferentes:   $DIFFERENT${NC}"
echo -e "${RED}❌ Archivos faltantes:    $MISSING${NC}"
echo ""

# Determinar estado general
TOTAL=$((IDENTICAL + DIFFERENT + MISSING))
SCORE=$((IDENTICAL * 100 / TOTAL))

echo -e "${BLUE}📈 Puntuación de compatibilidad: ${SCORE}%${NC}"
echo ""

if [ $SCORE -ge 90 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 EXCELENTE: La configuración está muy bien alineada${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
elif [ $SCORE -ge 70 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  ACEPTABLE: Algunas diferencias encontradas${NC}"
    echo -e "${YELLOW}   Revisa los archivos marcados como diferentes${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}🚨 ATENCIÓN: Muchas diferencias detectadas${NC}"
    echo -e "${RED}   Se recomienda actualizar archivos desde el backup${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi
echo ""

# Recomendaciones
if [ $DIFFERENT -gt 0 ] || [ $MISSING -gt 0 ]; then
    echo -e "${YELLOW}💡 RECOMENDACIONES:${NC}"
    echo ""
    
    if [ $MISSING -gt 0 ]; then
        echo -e "${YELLOW}   1. Copiar archivos faltantes desde el backup:${NC}"
        echo -e "      cd $REPO_ROOT"
        echo -e "      cp $BACKUP_DIR/config/docker-compose.override.yml ."
        echo -e "      cp $BACKUP_DIR/config/api.env api/.env"
        echo -e "      cp -r $BACKUP_DIR/config/api-config/* api/config/"
        echo ""
    fi
    
    if [ $DIFFERENT -gt 0 ]; then
        echo -e "${YELLOW}   2. Revisar diferencias en archivos marcados${NC}"
        echo -e "      Usa: diff archivo_backup archivo_actual"
        echo ""
    fi
    
    echo -e "${YELLOW}   3. Hacer backup antes de cambios:${NC}"
    echo -e "      mkdir -p backups/pre-sync-\$(date +%Y%m%d)"
    echo -e "      cp docker-compose.* backups/pre-sync-\$(date +%Y%m%d)/"
    echo ""
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Verificación completada${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

