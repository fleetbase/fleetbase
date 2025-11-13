# 🔍 Comparación: Backup Exitoso vs Repositorio Actual

## 📊 Tabla Comparativa de Archivos Críticos

| Archivo | Backup Exitoso | Repo Actual | Estado | Acción Requerida |
|---------|----------------|-------------|--------|------------------|
| **docker-compose.yml** | ✅ Existe | ✅ Existe | ⚠️ Verificar contenido | Comparar versiones |
| **docker-compose.override.yml** | ✅ Existe (con PostGIS) | ✅ Existe | ⚠️ Verificar PostGIS | Asegurar PostGIS 16-3.4 |
| **api/.env** | ✅ Existe (40 líneas) | ✅ Existe (951 bytes) | ⚠️ Comparar | Verificar APP_KEY |
| **api/config/database.php** | ✅ Existe | ✅ Existe | ⚠️ Verificar | Asegurar config pgsql |
| **docker/Dockerfile.pgsql** | ⚠️ Referenciado | ❓ Por verificar | ⚠️ CRÍTICO | Debe existir |
| **fleetbase_db.dump** | ✅ 698KB | ❌ No existe | 📥 Necesita restauración | Usar dump del backup |
| **scripts/*.sh** | ✅ 23 scripts | ✅ Algunos existen | ⚠️ Sincronizar | Copiar scripts faltantes |

---

## 🎯 Diferencias Clave Detectadas

### 1. Docker Compose Override

**Backup Exitoso:**
```yaml
services:
  database:
    image: postgis/postgis:16-3.4-alpine  # ⭐ PostGIS incluido
    volumes:
      - fleetbase_postgres_data:/var/lib/postgresql/data  # Volumen nombrado
    
  application:
    build:
      dockerfile: docker/Dockerfile.pgsql  # Build personalizado
    environment:
      APP_KEY: "base64:v1yyxlpOikBdBDJC2sMjEpjkhPLtSLT5q6ZA4p5QLPo="
      PHP_MEMORY_LIMIT: "-1"
      DB_CONNECTION: "pgsql"

volumes:
  fleetbase_postgres_data:  # ⭐ Volumen persistente nombrado
```

**Repositorio Actual:**
- ⚠️ Necesita verificación de que tenga la misma configuración

### 2. Variables de Entorno Críticas

**Del Backup (api.env):**
```env
APP_KEY=base64:v1yyxlpOikBdBDJC2sMjEpjkhPLtSLT5q6ZA4p5QLPo=
DB_CONNECTION=pgsql
DB_HOST=database
DB_PORT=5432
DB_DATABASE=fleetbase
DB_USERNAME=fleetbase
DB_PASSWORD=fleetbase
CACHE_DRIVER=redis
REDIS_HOST=cache
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
CONSOLE_HOST=http://localhost:4200
```

**Estado en Repo Actual:**
- ✅ Archivo existe (951 bytes)
- ⚠️ Necesita comparación línea por línea

---

## 📁 Estructura de Directorios

### Backup Exitoso
```
fleetbase-backup-20251111-061102/
├── config/
│   ├── docker-compose.yml
│   ├── docker-compose.override.yml  ⭐
│   ├── api.env  ⭐
│   └── api-config/ (17 archivos)  ⭐
├── docker-info/
│   ├── docker-images.txt
│   ├── docker-ps.txt
│   └── volumes.txt
├── scripts/ (23 scripts)  ⭐
├── storage/ (estructura Laravel)
├── fleetbase_db.dump  ⭐⭐⭐
├── README.md
└── restore-fleetbase.sh  ⭐
```

### Repositorio Actual
```
fleetbase-repo/
├── api/
│   ├── app/
│   ├── config/ (archivos Laravel)
│   ├── .env  ✅
│   └── ...
├── console/
├── docker/
│   ├── database/
│   ├── httpd/
│   └── Dockerfile.pgsql  ❓
├── packages/
├── scripts/
│   └── fleetbase-backup-20251111-061102/ (extraído)
├── docker-compose.yml  ✅
└── docker-compose.override.yml  ✅
```

---

## ✅ Lista de Verificación Pre-Instanciación

### Archivos de Configuración Docker

- [ ] **docker-compose.yml** - Verificar que coincida con el backup
  - [ ] Servicios: cache, database, socket, scheduler, queue, console, application, httpd
  - [ ] Puertos correctos: 4200, 5432, 8000, 38000
  
- [ ] **docker-compose.override.yml** - Elementos críticos
  - [ ] Imagen PostGIS: `postgis/postgis:16-3.4-alpine`
  - [ ] Volumen nombrado: `fleetbase_postgres_data`
  - [ ] Build personalizado: `docker/Dockerfile.pgsql`
  - [ ] APP_KEY configurado
  - [ ] PHP_MEMORY_LIMIT: "-1"
  - [ ] DB_CONNECTION: "pgsql"

### Archivos de Configuración Laravel

- [ ] **api/.env** - Variables esenciales
  - [ ] APP_KEY (debe coincidir con docker-compose.override.yml)
  - [ ] DB_CONNECTION=pgsql
  - [ ] Credenciales de base de datos
  - [ ] Configuración Redis
  - [ ] CONSOLE_HOST
  
- [ ] **api/config/database.php** - Configuración PostgreSQL
  - [ ] Conexión 'pgsql' definida correctamente
  - [ ] Variables de entorno mapeadas
  - [ ] Redis configurado

### Archivos Docker

- [ ] **docker/Dockerfile.pgsql** - Build personalizado
  - [ ] Drivers PostgreSQL instalados
  - [ ] Extensiones PHP necesarias
  - [ ] Configuración Composer
  
- [ ] **docker/database/** - Scripts de inicialización
  - [ ] Scripts SQL si existen
  - [ ] Permisos correctos

### Base de Datos

- [ ] **fleetbase_db.dump** - Dump PostgreSQL
  - [ ] Tamaño: ~698KB
  - [ ] Formato: custom
  - [ ] PostGIS habilitado
  - [ ] Migraciones completas

### Scripts y Utilidades

- [ ] **Scripts de migración** (23 archivos)
  - [ ] master-fix-pgsql.sh
  - [ ] apply-all-pgsql-fixes.sh
  - [ ] fix-all-uuid-columns.sh
  - [ ] Y otros 20 scripts
  
- [ ] **restore-fleetbase.sh** - Script de restauración automática
  - [ ] Permisos de ejecución
  - [ ] Rutas actualizadas

### Storage

- [ ] **api/storage/** - Estructura de directorios
  - [ ] app/
  - [ ] framework/cache/
  - [ ] framework/sessions/
  - [ ] framework/views/
  - [ ] logs/
  - [ ] Permisos correctos (777 o www-data)

---

## 🔄 Plan de Migración de Archivos

### Paso 1: Backup de Configuración Actual (Seguridad)
```bash
cd /mnt/g/Users/GAMEMAX/Documents/CREAI/fleetbase-repo
mkdir -p backups/config-actual-$(date +%Y%m%d)
cp docker-compose.yml backups/config-actual-$(date +%Y%m%d)/
cp docker-compose.override.yml backups/config-actual-$(date +%Y%m%d)/
cp api/.env backups/config-actual-$(date +%Y%m%d)/
cp -r api/config/ backups/config-actual-$(date +%Y%m%d)/
```

### Paso 2: Comparar Archivos Clave
```bash
# Comparar docker-compose.yml
diff docker-compose.yml scripts/fleetbase-backup-20251111-061102/config/docker-compose.yml

# Comparar docker-compose.override.yml
diff docker-compose.override.yml scripts/fleetbase-backup-20251111-061102/config/docker-compose.override.yml

# Comparar api/.env (si no está en .gitignore)
diff api/.env scripts/fleetbase-backup-20251111-061102/config/api.env

# Comparar database.php
diff api/config/database.php scripts/fleetbase-backup-20251111-061102/config/api-config/database.php
```

### Paso 3: Aplicar Cambios Necesarios
```bash
# Si hay diferencias críticas, actualizar desde el backup
cp scripts/fleetbase-backup-20251111-061102/config/docker-compose.override.yml .
cp scripts/fleetbase-backup-20251111-061102/config/api-config/database.php api/config/

# Verificar/actualizar variables de entorno críticas en api/.env
# Asegurar: APP_KEY, DB_CONNECTION=pgsql, credenciales correctas
```

### Paso 4: Verificar Dockerfile
```bash
# Verificar que existe el Dockerfile personalizado
ls -la docker/Dockerfile.pgsql

# Si no existe, puede que esté en el repositorio original
# o necesite ser creado basándose en el oficial con drivers PostgreSQL
```

### Paso 5: Copiar Scripts de Utilidad
```bash
# Copiar scripts desde el backup al repo actual
cp scripts/fleetbase-backup-20251111-061102/scripts/*.sh scripts/
chmod +x scripts/*.sh
```

---

## ⚙️ Comandos de Verificación

### Verificar Configuración Docker
```bash
# Validar sintaxis docker-compose
sudo docker compose config

# Ver servicios definidos
sudo docker compose config --services

# Ver volúmenes definidos
sudo docker compose config --volumes
```

### Verificar Variables de Entorno
```bash
# Verificar que APP_KEY existe y es válido
grep APP_KEY api/.env

# Verificar conexión DB
grep DB_CONNECTION api/.env
grep DB_HOST api/.env
grep DB_DATABASE api/.env
```

### Verificar Archivos Críticos
```bash
# Ver tamaño y permisos
ls -lh docker-compose.yml
ls -lh docker-compose.override.yml
ls -lh api/.env
ls -lh docker/Dockerfile.pgsql

# Contar archivos de configuración
ls -1 api/config/*.php | wc -l  # Debería ser ~17
```

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: PostGIS no disponible
**Síntoma:**
```
ERROR: function postgis_version() does not exist
```

**Solución:**
```bash
# Verificar imagen en docker-compose.override.yml
grep "image:" docker-compose.override.yml | grep database

# Debe ser: postgis/postgis:16-3.4-alpine
# NO: postgres:16-alpine
```

### Problema 2: APP_KEY inválido o faltante
**Síntoma:**
```
RuntimeException: No application encryption key has been specified.
```

**Solución:**
```bash
# Copiar APP_KEY del backup exitoso
echo 'APP_KEY=base64:v1yyxlpOikBdBDJC2sMjEpjkhPLtSLT5q6ZA4p5QLPo=' >> api/.env

# O generar uno nuevo (pero tendrás que re-encriptar datos)
sudo docker compose exec application php artisan key:generate
```

### Problema 3: Migraciones fallan
**Síntoma:**
```
SQLSTATE[42P01]: Undefined table
SQLSTATE[HY000]: General error: 7 UUID columns...
```

**Solución:**
```bash
# Usar scripts del backup
cd scripts
bash master-fix-pgsql.sh

# O aplicar fixes específicos
bash fix-all-uuid-columns.sh
bash fix-permissions-pgsql.sh
```

### Problema 4: Volumen de datos no persiste
**Síntoma:**
- Datos desaparecen al reiniciar contenedor
- Base de datos vacía después de docker compose down

**Solución:**
```bash
# Verificar volumen nombrado en docker-compose.override.yml
grep -A5 "volumes:" docker-compose.override.yml

# Debe incluir:
# volumes:
#   fleetbase_postgres_data:

# Verificar que database use el volumen nombrado
grep -A10 "database:" docker-compose.override.yml | grep volumes
# Debe ser: fleetbase_postgres_data:/var/lib/postgresql/data
```

### Problema 5: Permisos de storage
**Síntoma:**
```
failed to open stream: Permission denied in /fleetbase/api/storage/
```

**Solución:**
```bash
# Arreglar permisos
sudo chmod -R 777 api/storage
sudo chmod -R 755 api/bootstrap/cache

# Verificar propietario
ls -la api/storage
```

---

## 📈 Métricas de Éxito

### Antes de Iniciar
- [ ] Todos los archivos críticos copiados
- [ ] Configuraciones verificadas
- [ ] Backups de seguridad creados

### Durante Inicio
- [ ] Database: Estado = UP (healthy)
- [ ] Application: Estado = UP (healthy)
- [ ] Queue: Estado = UP (healthy)
- [ ] Console: Estado = UP
- [ ] Sin errores en logs

### Después de Inicio
- [ ] API responde en puerto 8000
- [ ] Console carga en puerto 4200
- [ ] Base de datos tiene tablas (>50)
- [ ] Migraciones todas aplicadas
- [ ] PostGIS funcional: `SELECT PostGIS_Version();`

---

## 📝 Checklist de Archivos Mínimos

### ✅ CRÍTICO (No funciona sin estos)
```
✓ docker-compose.yml
✓ docker-compose.override.yml (con PostGIS)
✓ api/.env (con APP_KEY correcto)
✓ api/config/database.php
✓ docker/Dockerfile.pgsql
✓ fleetbase_db.dump
```

### ⭐ IMPORTANTE (Recomendado fuertemente)
```
✓ api/config/*.php (todos los 17 archivos)
✓ scripts/master-fix-pgsql.sh
✓ scripts/apply-all-pgsql-fixes.sh
✓ scripts/fix-*.sh (scripts de corrección)
✓ storage/ (estructura completa)
```

### 📦 OPCIONAL (Útil para troubleshooting)
```
□ docker-info/*.txt
□ README.md
□ restore-fleetbase.sh
□ backup-fleetbase.sh
```

---

## 🎯 Próximos Pasos Recomendados

1. **Comparar archivos actuales con el backup**
   ```bash
   bash scripts/compare-with-backup.sh
   ```

2. **Actualizar archivos que difieran**
   - Especialmente `docker-compose.override.yml`
   - Y configuraciones en `api/config/`

3. **Probar en instancia de prueba**
   - Antes de aplicar en producción
   - Verificar cada paso del checklist

4. **Documentar diferencias encontradas**
   - Para futuras referencias
   - Para otros desarrolladores del equipo

5. **Automatizar el proceso**
   - Crear script de verificación
   - Crear script de sincronización

---

**Última actualización:** 12 de noviembre de 2025  
**Estado:** Comparación completada  
**Acción siguiente:** Verificar diferencias específicas en archivos

