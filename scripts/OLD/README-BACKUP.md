# 🔒 Scripts de Backup y Restauración

## Scripts Disponibles

### 1. `backup-fleetbase.sh` - Backup Completo Interactivo
**Uso recomendado**: Backups manuales completos

```bash
bash scripts/backup-fleetbase.sh
```

**Características**:
- ✅ Backup completo de PostgreSQL (comprimido)
- ✅ Configuración (docker-compose, .env, config/)
- ✅ Storage y uploads
- ✅ Scripts personalizados
- ✅ Genera script de restauración automática
- ✅ Genera documentación README
- ✅ Opción de comprimir en .tar.gz
- ✅ Interfaz interactiva con colores

**Contenido del backup**:
```
fleetbase-backup-YYYYMMDD-HHMMSS/
├── fleetbase_db.dump           # Base de datos (formato custom)
├── config/                      # Configuración
│   ├── docker-compose.yml
│   ├── docker-compose.override.yml
│   ├── api.env
│   └── api-config/
├── storage/                     # Archivos subidos
├── scripts/                     # Scripts personalizados
├── docker-info/                 # Info de Docker
├── restore-fleetbase.sh         # Script de restauración
└── README.md                    # Documentación
```

---

### 2. `quick-backup.sh` - Backup Rápido Automatizado
**Uso recomendado**: Automatización, cronjobs, scripts

```bash
# Backup básico (sin storage)
bash scripts/quick-backup.sh

# Con storage
bash scripts/quick-backup.sh --with-storage

# Comprimido
bash scripts/quick-backup.sh --compress

# Con storage y comprimido
bash scripts/quick-backup.sh --with-storage --compress
```

**Características**:
- ✅ Backup rápido y silencioso
- ✅ Sin interacción del usuario
- ✅ Ideal para automatización
- ✅ Opción de incluir/excluir storage
- ✅ Opción de comprimir automáticamente

---

## �� Guía de Uso

### Crear un Backup

```bash
# Backup completo (recomendado para primera vez)
bash scripts/backup-fleetbase.sh

# Backup rápido (para backups frecuentes)
bash scripts/quick-backup.sh --compress
```

### Restaurar en Nueva Instancia de WSL

#### Opción 1: Restauración Automática (recomendada)

1. Copia la carpeta del backup a la nueva instancia
2. Ejecuta:
```bash
cd fleetbase-backup-YYYYMMDD-HHMMSS
bash restore-fleetbase.sh
```

3. El script hará todo automáticamente:
   - Instalar Docker (si no está)
   - Clonar repositorio
   - Restaurar configuración
   - Restaurar base de datos
   - Iniciar servicios

#### Opción 2: Restauración Rápida (solo DB)

```bash
cd fleetbase-backup-YYYYMMDD-HHMMSS
bash restore-quick.sh
```

#### Opción 3: Restauración Manual

```bash
# 1. Copiar configuración
cp config/docker-compose.yml /path/to/fleetbase/
cp config/docker-compose.override.yml /path/to/fleetbase/
cp config/api.env /path/to/fleetbase/api/.env

# 2. Iniciar PostgreSQL
cd /path/to/fleetbase
sudo docker compose up -d database
sleep 30

# 3. Restaurar DB
cat /path/to/backup/fleetbase_db.dump | \
  sudo docker compose exec -T database pg_restore \
  -U fleetbase -d fleetbase -c --if-exists

# 4. Iniciar servicios
sudo docker compose up -d
```

---

## 🤖 Automatización con Cron

### Backup diario a las 3 AM

```bash
# Editar crontab
crontab -e

# Agregar línea:
0 3 * * * /mnt/g/.../fleetbase-repo/scripts/quick-backup.sh --compress >/dev/null 2>&1
```

### Backup semanal con storage

```bash
# Cada domingo a las 2 AM
0 2 * * 0 /mnt/g/.../fleetbase-repo/scripts/quick-backup.sh --with-storage --compress
```

---

## 📊 Tamaños Aproximados

| Componente | Tamaño Aproximado |
|------------|-------------------|
| Base de datos (comprimida) | ~5-50 MB |
| Configuración | ~100 KB |
| Scripts | ~200 KB |
| Storage (variable) | 0 MB - varios GB |
| **Total sin storage** | **~5-50 MB** |
| **Total con storage** | **Variable** |

---

## 🔐 Seguridad

### Buenas Prácticas

1. **Backups regulares**:
   - Diarios: Solo DB (`quick-backup.sh`)
   - Semanales: Completos con storage (`backup-fleetbase.sh`)

2. **Almacenamiento**:
   - Guarda backups en ubicación segura
   - Considera almacenamiento externo o en la nube

3. **Verificación**:
   - Prueba la restauración periódicamente
   - Verifica la integridad del dump

4. **Rotación**:
   - Mantén los últimos 7 backups diarios
   - Mantén los últimos 4 backups semanales
   - Mantén 1 backup mensual

### Script de Rotación

```bash
#!/bin/bash
# Mantener solo últimos 7 backups
BACKUP_DIR="/mnt/g/Users/GAMEMAX/Documents/CREAI/backups"
cd "$BACKUP_DIR"
ls -t fleetbase-backup-* | tail -n +8 | xargs rm -rf
```

---

## ⚠️ Notas Importantes

1. **Espacio en disco**: Verifica tener suficiente espacio antes de hacer backup
2. **Permisos**: Los scripts requieren sudo para acceder a Docker
3. **Tiempo**: Un backup completo puede tomar 1-5 minutos
4. **WSL2**: Los backups funcionan específicamente para WSL2
5. **PostgreSQL**: Requiere PostgreSQL 16 con PostGIS

---

## 🆘 Solución de Problemas

### Error: "No se puede conectar a Docker"
```bash
sudo systemctl start docker
# o
sudo service docker start
```

### Error: "Base de datos no existe"
```bash
sudo docker compose exec database createdb -U fleetbase fleetbase
sudo docker compose exec database psql -U fleetbase -d fleetbase -c "CREATE EXTENSION postgis;"
```

### Error: "Permiso denegado"
```bash
# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

---

## 📞 Soporte

Para problemas o preguntas:
1. Revisa los logs: `sudo docker compose logs`
2. Verifica el estado: `sudo docker compose ps`
3. Revisa este README

---

**Última actualización**: Noviembre 2025
**Versión de scripts**: 1.0
