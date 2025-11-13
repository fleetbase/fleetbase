#!/bin/bash
# Script Simplificado de Verificación
# Versión simple y robusta

BACKUP_DIR="$(dirname "$0")/fleetbase-backup-20251111-061102"
REPO_ROOT="$(dirname "$0")/.."

echo "════════════════════════════════════════════"
echo "  VERIFICACIÓN DE CONFIGURACIÓN FLEETBASE"
echo "════════════════════════════════════════════"
echo ""

cd "$REPO_ROOT" || exit 1

echo "📂 Directorio de trabajo: $(pwd)"
echo "📦 Directorio de backup: $BACKUP_DIR"
echo ""

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ ERROR: Backup no encontrado"
    exit 1
fi

echo "✅ Backup encontrado"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. DOCKER COMPOSE FILES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# docker-compose.yml
echo "📄 docker-compose.yml"
if [ -f "docker-compose.yml" ]; then
    if diff -q "$BACKUP_DIR/config/docker-compose.yml" "docker-compose.yml" >/dev/null 2>&1; then
        echo "   ✅ Idéntico al backup"
    else
        echo "   ⚠️  Diferente del backup"
    fi
else
    echo "   ❌ No existe"
fi

# docker-compose.override.yml
echo "📄 docker-compose.override.yml (⭐ CRÍTICO)"
if [ -f "docker-compose.override.yml" ]; then
    if diff -q "$BACKUP_DIR/config/docker-compose.override.yml" "docker-compose.override.yml" >/dev/null 2>&1; then
        echo "   ✅ Idéntico al backup"
    else
        echo "   ⚠️  Diferente del backup"
    fi
    
    # Verificar PostGIS
    if grep -q "postgis/postgis:16-3.4-alpine" "docker-compose.override.yml"; then
        echo "   ✅ PostGIS 16-3.4 configurado"
    else
        echo "   ❌ PostGIS no configurado correctamente"
    fi
    
    # Verificar volumen nombrado
    if grep -q "fleetbase_postgres_data:" "docker-compose.override.yml"; then
        echo "   ✅ Volumen nombrado configurado"
    else
        echo "   ❌ Volumen nombrado faltante"
    fi
else
    echo "   ❌ No existe"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. CONFIGURACIÓN API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# api/.env
echo "📄 api/.env (⭐ CRÍTICO)"
if [ -f "api/.env" ]; then
    echo "   ✅ Archivo existe"
    
    if grep -q "^APP_KEY=" "api/.env"; then
        echo "   ✅ APP_KEY definido"
    else
        echo "   ❌ APP_KEY faltante"
    fi
    
    if grep -q "^DB_CONNECTION=pgsql" "api/.env"; then
        echo "   ✅ DB_CONNECTION=pgsql"
    else
        echo "   ❌ DB_CONNECTION no es pgsql"
    fi
    
    if grep -q "^REDIS_HOST=cache" "api/.env"; then
        echo "   ✅ REDIS_HOST=cache"
    else
        echo "   ⚠️  REDIS_HOST no es 'cache'"
    fi
else
    echo "   ❌ No existe"
fi

# api/config/database.php
echo "📄 api/config/database.php"
if [ -f "api/config/database.php" ]; then
    if diff -q "$BACKUP_DIR/config/api-config/database.php" "api/config/database.php" >/dev/null 2>&1; then
        echo "   ✅ Idéntico al backup"
    else
        echo "   ⚠️  Diferente del backup"
    fi
else
    echo "   ❌ No existe"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. ARCHIVOS DOCKER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "📄 docker/Dockerfile.pgsql"
if [ -f "docker/Dockerfile.pgsql" ]; then
    echo "   ✅ Existe"
else
    echo "   ❌ No existe (⚠️  CRÍTICO)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. BASE DE DATOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "📄 fleetbase_db.dump"
if [ -f "$BACKUP_DIR/fleetbase_db.dump" ]; then
    size=$(du -h "$BACKUP_DIR/fleetbase_db.dump" | cut -f1)
    echo "   ✅ Disponible ($size)"
else
    echo "   ❌ No encontrado"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. SCRIPTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

backup_scripts=$(ls -1 "$BACKUP_DIR/scripts/"*.sh 2>/dev/null | wc -l)
repo_scripts=$(ls -1 "scripts/"*.sh 2>/dev/null | wc -l)

echo "🔧 Scripts disponibles:"
echo "   Backup: $backup_scripts scripts"
echo "   Repo:   $repo_scripts scripts"

if [ $repo_scripts -ge 10 ]; then
    echo "   ✅ Suficientes scripts disponibles"
else
    echo "   ⚠️  Considera copiar más scripts"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. ARCHIVOS DE CONFIGURACIÓN LARAVEL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

backup_configs=$(ls -1 "$BACKUP_DIR/config/api-config/"*.php 2>/dev/null | wc -l)
repo_configs=$(ls -1 "api/config/"*.php 2>/dev/null | wc -l)

echo "📦 Archivos PHP de configuración:"
echo "   Backup: $backup_configs archivos"
echo "   Repo:   $repo_configs archivos"

if [ $repo_configs -ge $backup_configs ]; then
    echo "   ✅ Todos los archivos presentes"
else
    echo "   ⚠️  Faltan $((backup_configs - repo_configs)) archivos"
fi

echo ""
echo "════════════════════════════════════════════"
echo "  ✅ VERIFICACIÓN COMPLETADA"
echo "════════════════════════════════════════════"
echo ""
echo "💡 Para ver diferencias detalladas:"
echo "   diff docker-compose.override.yml $BACKUP_DIR/config/docker-compose.override.yml"
echo ""
echo "💡 Para copiar archivos del backup:"
echo "   cp $BACKUP_DIR/config/docker-compose.override.yml ."
echo "   cp $BACKUP_DIR/config/api.env api/.env"
echo "   cp -r $BACKUP_DIR/config/api-config/* api/config/"
echo ""

