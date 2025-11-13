#!/bin/bash
# Script de Backup Completo de Fleetbase PostgreSQL
# Crea un backup completo incluyendo base de datos, archivos y configuración

set -e

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔒 BACKUP COMPLETO DE FLEETBASE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Directorio de backup
BACKUP_DIR="fleetbase-backup-$(date +%Y%m%d-%H%M%S)"
BACKUP_PATH="/mnt/g/Users/GAMEMAX/Documents/CREAI/backups/$BACKUP_DIR"

echo -e "${YELLOW}📁 Creando directorio de backup...${NC}"
mkdir -p "$BACKUP_PATH"
cd "$(dirname "$0")/.."

echo -e "${GREEN}✅ Directorio: $BACKUP_PATH${NC}"
echo ""

# 1. Backup de la base de datos PostgreSQL
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🗄️  1/6: Haciendo backup de PostgreSQL...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

sudo docker compose exec -T database pg_dump -U fleetbase -d fleetbase --format=custom --compress=9 > "$BACKUP_PATH/fleetbase_db.dump"

if [ -f "$BACKUP_PATH/fleetbase_db.dump" ]; then
    DB_SIZE=$(du -h "$BACKUP_PATH/fleetbase_db.dump" | cut -f1)
    echo -e "${GREEN}✅ Base de datos exportada: $DB_SIZE${NC}"
else
    echo -e "${RED}❌ Error al exportar la base de datos${NC}"
    exit 1
fi
echo ""

# 2. Backup de archivos de configuración
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚙️  2/7: Copiando archivos de configuración...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Crear directorios de configuración
mkdir -p "$BACKUP_PATH/config"
mkdir -p "$BACKUP_PATH/docker"

# Copiar archivos de configuración Docker
echo "  📦 Docker Compose..."
cp docker-compose.yml "$BACKUP_PATH/config/" 2>/dev/null || echo "  ⚠️  docker-compose.yml no encontrado"
cp docker-compose.override.yml "$BACKUP_PATH/config/" 2>/dev/null || echo "  ⚠️  docker-compose.override.yml no encontrado"

# Copiar Dockerfiles personalizados
echo "  🐳 Dockerfiles..."
cp docker/Dockerfile.pgsql "$BACKUP_PATH/docker/" 2>/dev/null || echo "  ⚠️  Dockerfile.pgsql no encontrado"
cp docker/Dockerfile "$BACKUP_PATH/docker/" 2>/dev/null || true
cp -r docker/httpd "$BACKUP_PATH/docker/" 2>/dev/null || true
cp docker/crontab "$BACKUP_PATH/docker/" 2>/dev/null || true

# Copiar scripts de inicialización de PostgreSQL
echo "  🗄️  Scripts de PostgreSQL..."
mkdir -p "$BACKUP_PATH/docker/database"
cp docker/database/01-enable-postgis.sql "$BACKUP_PATH/docker/database/" 2>/dev/null || echo "  ⚠️  PostGIS script no encontrado"

# Copiar configuración de la API
echo "  ⚙️  Configuración de API..."
cp api/.env "$BACKUP_PATH/config/api.env" 2>/dev/null || echo "  ⚠️  api/.env no encontrado"
mkdir -p "$BACKUP_PATH/config/api-config"
cp api/config/database.php "$BACKUP_PATH/config/api-config/" 2>/dev/null || echo "  ⚠️  database.php no encontrado"
cp api/config/storefront.php "$BACKUP_PATH/config/api-config/" 2>/dev/null || true

# Copiar configuración de consola
echo "  🖥️  Configuración de consola..."
cp console/fleetbase.config.json "$BACKUP_PATH/config/" 2>/dev/null || true

echo -e "${GREEN}✅ Configuración copiada${NC}"
echo ""

# 3. Backup de archivos de storage/uploads
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📦 3/7: Copiando archivos de storage...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -d "api/storage" ]; then
    mkdir -p "$BACKUP_PATH/storage"
    cp -r api/storage "$BACKUP_PATH/" 2>/dev/null || true
    STORAGE_SIZE=$(du -sh "$BACKUP_PATH/storage" 2>/dev/null | cut -f1 || echo "0")
    echo -e "${GREEN}✅ Storage copiado: $STORAGE_SIZE${NC}"
else
    echo -e "${YELLOW}⚠️  No hay directorio storage${NC}"
fi
echo ""

# 4. Backup de scripts de migración personalizados
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔧 4/7: Copiando scripts personalizados...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mkdir -p "$BACKUP_PATH/scripts"
cp -r scripts/* "$BACKUP_PATH/scripts/" 2>/dev/null || true

echo -e "${GREEN}✅ Scripts copiados${NC}"
echo ""

# 5. Exportar información de Docker volumes
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🐳 5/7: Exportando información de Docker...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mkdir -p "$BACKUP_PATH/docker-info"

# Guardar lista de imágenes Docker
sudo docker compose images > "$BACKUP_PATH/docker-info/docker-images.txt"

# Guardar estado de contenedores
sudo docker compose ps > "$BACKUP_PATH/docker-info/docker-ps.txt"

# Guardar configuración de volúmenes
sudo docker volume ls | grep fleetbase > "$BACKUP_PATH/docker-info/volumes.txt" 2>/dev/null || true

echo -e "${GREEN}✅ Información de Docker guardada${NC}"
echo ""

# 6. Crear archivo README con instrucciones
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 6/7: Creando archivo de instrucciones...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat > "$BACKUP_PATH/README.md" << 'EOF'
# Backup de Fleetbase PostgreSQL

## Información del Backup

- **Fecha**: $(date +"%Y-%m-%d %H:%M:%S")
- **Sistema**: WSL2
- **Base de datos**: PostgreSQL 16 con PostGIS 3.4

## Contenido

```
fleetbase-backup-YYYYMMDD-HHMMSS/
├── fleetbase_db.dump          # Dump completo de PostgreSQL
├── config/                     # Archivos de configuración
│   ├── docker-compose.yml
│   ├── docker-compose.override.yml
│   ├── api.env
│   ├── api-config/
│   │   ├── database.php
│   │   └── storefront.php
│   └── fleetbase.config.json
├── docker/                     # Dockerfiles y configuración
│   ├── Dockerfile.pgsql
│   ├── httpd/
│   ├── crontab
│   └── database/
│       └── 01-enable-postgis.sql
├── storage/                    # Archivos subidos (opcional)
├── scripts/                    # Scripts de migración personalizados
├── docker-info/                # Información de Docker
└── README.md                   # Este archivo
```

## Restauración

### Opción 1: Restauración Automática

```bash
# Copia este backup a la nueva instancia de WSL
# Luego ejecuta:
bash restore-fleetbase.sh
```

### Opción 2: Restauración Manual

1. **Instalar Docker y Docker Compose**:
```bash
cd /path/to/backup
bash scripts/docker-install.sh
```

2. **Restaurar archivos de configuración**:
```bash
# Docker Compose
cp config/docker-compose.yml /path/to/fleetbase-repo/
cp config/docker-compose.override.yml /path/to/fleetbase-repo/

# API
cp config/api.env /path/to/fleetbase-repo/api/.env
cp -r config/api-config/* /path/to/fleetbase-repo/api/config/

# Docker
cp docker/Dockerfile.pgsql /path/to/fleetbase-repo/docker/
cp -r docker/httpd /path/to/fleetbase-repo/docker/
cp docker/crontab /path/to/fleetbase-repo/docker/
mkdir -p /path/to/fleetbase-repo/docker/database
cp docker/database/01-enable-postgis.sql /path/to/fleetbase-repo/docker/database/

# Consola
cp config/fleetbase.config.json /path/to/fleetbase-repo/console/
```

3. **Iniciar contenedores**:
```bash
cd /path/to/fleetbase-repo
sudo docker compose up -d database
# Esperar 30 segundos para que PostgreSQL inicie
sleep 30
```

4. **Restaurar base de datos**:
```bash
sudo docker compose exec -T database pg_restore -U fleetbase -d fleetbase -c < fleetbase_db.dump
```

5. **Restaurar storage (opcional)**:
```bash
cp -r storage/* /path/to/fleetbase-repo/api/storage/
```

6. **Iniciar todos los servicios**:
```bash
sudo docker compose up -d
```

## Verificación

```bash
# Ver logs
sudo docker compose logs -f

# Ver estado de migraciones
sudo docker compose exec application php artisan migrate:status

# Verificar conectividad a DB
sudo docker compose exec -T database psql -U fleetbase -d fleetbase -c "SELECT COUNT(*) FROM migrations;"
```

## Notas Importantes

- El dump usa formato custom con compresión 9 (máxima)
- Los volúmenes de Docker se crean automáticamente
- PostGIS se habilita automáticamente en la restauración
- Se recomienda tener al menos 2GB de espacio libre

## Soporte

Para problemas con la restauración, revisa los logs:
```bash
sudo docker compose logs database
sudo docker compose logs application
```

EOF

echo -e "${GREEN}✅ README creado${NC}"
echo ""

# 7. Crear script de restauración
echo -e "${YELLOW}🔄 Creando script de restauración...${NC}"

cat > "$BACKUP_PATH/restore-fleetbase.sh" << 'RESTORE_EOF'
#!/bin/bash
# Script de Restauración Automática de Fleetbase

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔄 RESTAURACIÓN DE FLEETBASE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Directorio de destino
read -p "📂 Ruta donde clonar Fleetbase [/mnt/g/fleetbase-repo]: " DEST_DIR
DEST_DIR=${DEST_DIR:-/mnt/g/fleetbase-repo}

BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${YELLOW}🔍 Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    echo -e "${YELLOW}¿Deseas instalarlo ahora? (s/n)${NC}"
    read -p "> " INSTALL_DOCKER
    if [ "$INSTALL_DOCKER" = "s" ]; then
        bash "$BACKUP_DIR/scripts/docker-install.sh"
    else
        exit 1
    fi
fi

echo -e "${GREEN}✅ Docker encontrado${NC}"
echo ""

echo -e "${YELLOW}📁 Creando directorio de destino...${NC}"
mkdir -p "$DEST_DIR"
cd "$DEST_DIR"

echo -e "${YELLOW}📦 Clonando repositorio de Fleetbase...${NC}"
if [ ! -d ".git" ]; then
    git clone https://github.com/fleetbase/fleetbase.git .
else
    echo -e "${YELLOW}⚠️  Repositorio ya existe, actualizando...${NC}"
    git pull
fi
echo ""

echo -e "${YELLOW}⚙️  Restaurando configuración...${NC}"
cp "$BACKUP_DIR/config/docker-compose.yml" . 2>/dev/null || true
cp "$BACKUP_DIR/config/docker-compose.override.yml" . 2>/dev/null || true
cp "$BACKUP_DIR/config/api.env" api/.env 2>/dev/null || true
mkdir -p api/config
cp -r "$BACKUP_DIR/config/api-config/"* api/config/ 2>/dev/null || true
mkdir -p docker/database
cp "$BACKUP_DIR/docker/Dockerfile.pgsql" docker/ 2>/dev/null || true
cp -r "$BACKUP_DIR/docker/httpd" docker/ 2>/dev/null || true
cp "$BACKUP_DIR/docker/crontab" docker/ 2>/dev/null || true
cp "$BACKUP_DIR/docker/database/01-enable-postgis.sql" docker/database/ 2>/dev/null || true
mkdir -p console
cp "$BACKUP_DIR/config/fleetbase.config.json" console/ 2>/dev/null || true

echo -e "${GREEN}✅ Configuración restaurada${NC}"
echo ""

echo -e "${YELLOW}🐳 Iniciando contenedor de PostgreSQL...${NC}"
sudo docker compose up -d database

echo -e "${YELLOW}⏳ Esperando a que PostgreSQL esté listo (30s)...${NC}"
sleep 30

echo -e "${GREEN}✅ PostgreSQL iniciado${NC}"
echo ""

echo -e "${YELLOW}🗄️  Restaurando base de datos...${NC}"
sudo docker compose exec -T database createdb -U fleetbase fleetbase 2>/dev/null || true
sudo docker compose exec -T database psql -U fleetbase -d fleetbase -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null || true

cat "$BACKUP_DIR/fleetbase_db.dump" | sudo docker compose exec -T database pg_restore -U fleetbase -d fleetbase -c --if-exists

echo -e "${GREEN}✅ Base de datos restaurada${NC}"
echo ""

echo -e "${YELLOW}📦 Restaurando storage...${NC}"
if [ -d "$BACKUP_DIR/storage" ]; then
    cp -r "$BACKUP_DIR/storage/"* api/storage/ 2>/dev/null || true
    echo -e "${GREEN}✅ Storage restaurado${NC}"
else
    echo -e "${YELLOW}⚠️  No hay archivos de storage para restaurar${NC}"
fi
echo ""

echo -e "${YELLOW}🔧 Restaurando scripts...${NC}"
mkdir -p scripts
cp -r "$BACKUP_DIR/scripts/"* scripts/ 2>/dev/null || true
chmod +x scripts/*.sh
echo -e "${GREEN}✅ Scripts restaurados${NC}"
echo ""

echo -e "${YELLOW}🚀 Iniciando todos los servicios...${NC}"
sudo docker compose up -d

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ ¡RESTAURACIÓN COMPLETADA!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📊 Verificación:${NC}"
sudo docker compose exec -T database psql -U fleetbase -d fleetbase -c "SELECT COUNT(*) as total_migraciones FROM migrations;"
echo ""
echo -e "${GREEN}🌐 Accede a Fleetbase en: http://localhost${NC}"
echo ""

RESTORE_EOF

chmod +x "$BACKUP_PATH/restore-fleetbase.sh"
echo -e "${GREEN}✅ Script de restauración creado${NC}"
echo ""

# 8. Crear archivo comprimido (opcional)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🗜️  7/7: ¿Deseas comprimir el backup? (s/n)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
read -p "> " COMPRESS

if [ "$COMPRESS" = "s" ]; then
    echo -e "${YELLOW}⏳ Comprimiendo backup...${NC}"
    cd "$(dirname "$BACKUP_PATH")"
    tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
    
    if [ -f "$BACKUP_DIR.tar.gz" ]; then
        COMPRESSED_SIZE=$(du -h "$BACKUP_DIR.tar.gz" | cut -f1)
        echo -e "${GREEN}✅ Backup comprimido: $COMPRESSED_SIZE${NC}"
        echo -e "${GREEN}📁 Archivo: $BACKUP_DIR.tar.gz${NC}"
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ ¡BACKUP COMPLETADO!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📁 Ubicación: $BACKUP_PATH${NC}"
echo ""
echo -e "${YELLOW}📋 Contenido del backup:${NC}"
ls -lh "$BACKUP_PATH" | tail -n +2
echo ""
echo -e "${YELLOW}💾 Para restaurar en otra instancia:${NC}"
echo -e "${GREEN}   1. Copia la carpeta $BACKUP_DIR${NC}"
echo -e "${GREEN}   2. Ejecuta: bash restore-fleetbase.sh${NC}"
echo ""

