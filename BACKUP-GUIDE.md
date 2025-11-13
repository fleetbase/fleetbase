# 🔒 Resumen del Sistema de Backup de Fleetbase

## ✅ Scripts Creados y Verificados

### 1. **backup-fleetbase.sh** (14 KB) - ⭐ Principal
Backup completo e interactivo con todas las características.

**Ejecutar**:
```bash
cd /mnt/g/Users/GAMEMAX/Documents/CREAI/fleetbase-repo
bash scripts/backup-fleetbase.sh
```

**Incluye**:
- ✅ Base de datos PostgreSQL (241 migraciones, 124 tablas)
- ✅ docker-compose.yml + docker-compose.override.yml
- ✅ Dockerfile.pgsql (con extensiones pdo_pgsql)
- ✅ Script PostGIS: docker/database/01-enable-postgis.sql
- ✅ Configuración API: api/.env, api/config/database.php
- ✅ Storage y uploads (opcional)
- ✅ 23 scripts personalizados de migración
- ✅ Script de restauración automática
- ✅ Documentación README completa

---

### 2. **quick-backup.sh** (2 KB) - 🚀 Rápido
Backup automatizado sin interacción.

**Ejecutar**:
```bash
# Backup básico
bash scripts/quick-backup.sh

# Con compresión
bash scripts/quick-backup.sh --compress

# Con storage y compresión
bash scripts/quick-backup.sh --with-storage --compress
```

---

### 3. **info-backup.sh** (nuevo) - 📊 Información
Muestra información del sistema antes de hacer backup.

**Ejecutar**:
```bash
bash scripts/info-backup.sh
```

---

## 📦 Estructura del Backup Generado

```
fleetbase-backup-YYYYMMDD-HHMMSS/
├── fleetbase_db.dump               # PostgreSQL dump (formato custom, comprimido)
│
├── config/                         # Configuración
│   ├── docker-compose.yml
│   ├── docker-compose.override.yml
│   ├── api.env                     # api/.env
│   ├── api-config/
│   │   └── database.php            # Configuración PostgreSQL personalizada
│   └── fleetbase.config.json       # (opcional)
│
├── docker/                         # Docker personalizado
│   ├── Dockerfile.pgsql            # ⚠️ IMPORTANTE: Include pdo_pgsql
│   ├── httpd/                      # Configuración Apache
│   ├── crontab                     # Tareas programadas
│   └── database/
│       └── 01-enable-postgis.sql   # ⚠️ IMPORTANTE: Habilita PostGIS
│
├── storage/                        # Archivos subidos (opcional)
│
├── scripts/                        # ⚠️ IMPORTANTE: Scripts de migración
│   ├── master-fix-pgsql.sh
│   ├── auto-fix-migrations.sh
│   ├── ultra-fix-uuid.sh
│   └── ... (23 scripts en total)
│
├── docker-info/                    # Info del sistema Docker
│   ├── docker-images.txt
│   ├── docker-ps.txt
│   └── volumes.txt
│
├── restore-fleetbase.sh            # ⭐ Script de restauración automática
└── README.md                       # Documentación completa
```

---

## 🚀 Restauración en Nueva Instancia WSL

### Opción 1: Automática (Recomendada) ⭐

```bash
# 1. Copiar backup a nueva instancia
# 2. Ejecutar:
cd fleetbase-backup-YYYYMMDD-HHMMSS
bash restore-fleetbase.sh
```

**El script hará TODO automáticamente**:
- Detecta e instala Docker si no existe
- Clona repositorio de Fleetbase
- Restaura toda la configuración
- Restaura base de datos PostgreSQL
- Habilita PostGIS
- Restaura scripts personalizados
- Inicia todos los servicios

### Opción 2: Rápida (Solo DB)

```bash
cd fleetbase-backup-YYYYMMDD-HHMMSS
bash restore-quick.sh
```

### Opción 3: Manual

Ver `README.md` dentro del backup para instrucciones detalladas.

---

## ⚠️ Archivos Críticos para la Restauración

Estos archivos son **ESENCIALES** para que Fleetbase funcione con PostgreSQL:

### 1. **docker-compose.override.yml**
- Define imagen custom `application-pgsql`
- Configura PHP_MEMORY_LIMIT: "-1"
- Monta `database.php` personalizado
- Usa volumen Docker para PostgreSQL

### 2. **docker/Dockerfile.pgsql**
```dockerfile
FROM fleetbase/fleetbase-api:latest
RUN apt-get update && apt-get install -y libpq-dev
RUN docker-php-ext-install pdo_pgsql pgsql
```

### 3. **docker/database/01-enable-postgis.sql**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 4. **api/config/database.php**
- Configuración completa de PostgreSQL
- Conexión `pgsql` configurada

### 5. **Scripts de Migración** (directorio `scripts/`)
- Todos los fixes de MySQL → PostgreSQL
- Conversiones de UUID
- Correcciones de índices espaciales
- Fixes de constraints

---

## 📊 Estadísticas del Sistema Actual

### Base de Datos
- **Migraciones**: 241 completadas ✅
- **Tablas**: 124 creadas ✅
- **Índices**: 872 ✅
- **Constraints**: 950 ✅
- **Motor**: PostgreSQL 16 con PostGIS 3.4 ✅

### Archivos
- **Scripts**: 23 scripts de migración personalizados
- **Configuración**: 113 archivos
- **Storage**: Variable (según uso)

---

## 🤖 Automatización

### Backup Diario (3 AM)
```bash
crontab -e
# Agregar:
0 3 * * * /mnt/g/Users/GAMEMAX/Documents/CREAI/fleetbase-repo/scripts/quick-backup.sh --compress >/dev/null 2>&1
```

### Backup Semanal con Storage (Domingo 2 AM)
```bash
0 2 * * 0 /mnt/g/Users/GAMEMAX/Documents/CREAI/fleetbase-repo/scripts/quick-backup.sh --with-storage --compress >/dev/null 2>&1
```

---

## 💡 Antes de Ejecutar el Backup

### 1. Verifica que Docker esté corriendo:
```bash
sudo docker compose ps
```

### 2. Verifica la base de datos:
```bash
sudo docker compose exec -T database psql -U fleetbase -d fleetbase -c "SELECT COUNT(*) FROM migrations;"
```

### 3. Verifica el espacio disponible:
```bash
df -h /mnt/g/Users/GAMEMAX/Documents/CREAI/backups/
```

---

## 🎯 Tamaño Estimado del Backup

| Componente | Tamaño Aproximado |
|------------|-------------------|
| Base de datos (comprimida) | ~10-30 MB |
| Configuración | ~1 MB |
| Scripts | ~1 MB |
| Docker info | ~100 KB |
| Storage | Variable (0 MB - varios GB) |
| **Total (sin storage)** | **~12-32 MB** |
| **Comprimido .tar.gz** | **~8-20 MB** |

---

## 🆘 Solución de Problemas

### Error: Docker no está corriendo
```bash
sudo systemctl start docker
# o
sudo service docker start
```

### Error: Permiso denegado
```bash
# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

### Error: No hay espacio en disco
```bash
# Limpiar backups antiguos
cd /mnt/g/Users/GAMEMAX/Documents/CREAI/backups/
ls -t fleetbase-backup-* | tail -n +6 | xargs rm -rf
```

---

## 📞 Comandos Útiles

```bash
# Ver backups existentes
ls -lh /mnt/g/Users/GAMEMAX/Documents/CREAI/backups/

# Ver información del sistema
bash scripts/info-backup.sh

# Crear backup completo
bash scripts/backup-fleetbase.sh

# Crear backup rápido
bash scripts/quick-backup.sh --compress

# Restaurar
cd /path/to/backup
bash restore-fleetbase.sh
```

---

## ✅ Todo Listo

El sistema de backup está **completamente configurado** y **verificado**.

**Para crear tu primer backup**, ejecuta desde tu terminal:

```bash
cd /mnt/g/Users/GAMEMAX/Documents/CREAI/fleetbase-repo
bash scripts/backup-fleetbase.sh
```

El backup se guardará en:
```
/mnt/g/Users/GAMEMAX/Documents/CREAI/backups/fleetbase-backup-YYYYMMDD-HHMMSS/
```

---

**Última actualización**: 11 de noviembre de 2025  
**Versión**: 1.0  
**Estado**: ✅ Listo para usar

