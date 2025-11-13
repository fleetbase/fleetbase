#!/bin/bash
# Quick Backup - Versión rápida sin interacción
# Crea un backup silencioso para automatización

set -e

BACKUP_DIR="fleetbase-backup-$(date +%Y%m%d-%H%M%S)"
BACKUP_PATH="/mnt/g/Users/GAMEMAX/Documents/CREAI/backups/$BACKUP_DIR"

echo "🔒 Creando backup en $BACKUP_PATH..."
mkdir -p "$BACKUP_PATH"
cd "$(dirname "$0")/.."

# Backup DB
echo "📦 Exportando base de datos..."
sudo docker compose exec -T database pg_dump -U fleetbase -d fleetbase --format=custom --compress=9 > "$BACKUP_PATH/fleetbase_db.dump"

# Config
echo "⚙️  Copiando configuración..."
mkdir -p "$BACKUP_PATH/config"
cp docker-compose.yml "$BACKUP_PATH/config/" 2>/dev/null || true
cp docker-compose.override.yml "$BACKUP_PATH/config/" 2>/dev/null || true
cp api/.env "$BACKUP_PATH/config/api.env" 2>/dev/null || true
cp -r api/config "$BACKUP_PATH/config/api-config" 2>/dev/null || true

# Scripts
echo "🔧 Copiando scripts..."
mkdir -p "$BACKUP_PATH/scripts"
cp -r scripts/* "$BACKUP_PATH/scripts/" 2>/dev/null || true

# Storage (opcional, puede ser grande)
if [ "$1" = "--with-storage" ]; then
    echo "📁 Copiando storage..."
    cp -r api/storage "$BACKUP_PATH/" 2>/dev/null || true
fi

# Crear script de restauración
cat > "$BACKUP_PATH/restore-quick.sh" << 'EOF'
#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "🔄 Restaurando base de datos..."
cat fleetbase_db.dump | sudo docker compose -f config/docker-compose.yml -f config/docker-compose.override.yml exec -T database pg_restore -U fleetbase -d fleetbase -c --if-exists 2>/dev/null || true
echo "✅ ¡Restauración completada!"
EOF

chmod +x "$BACKUP_PATH/restore-quick.sh"

# Comprimir si se solicita
if [ "$1" = "--compress" ] || [ "$2" = "--compress" ]; then
    echo "🗜️  Comprimiendo..."
    cd "$(dirname "$BACKUP_PATH")"
    tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
    echo "✅ Backup comprimido: $BACKUP_DIR.tar.gz"
else
    echo "✅ Backup completado: $BACKUP_PATH"
fi

du -sh "$BACKUP_PATH"

