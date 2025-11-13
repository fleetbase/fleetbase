# 🐘 Fleetbase con PostgreSQL - Guía de Instalación

Este documento describe los cambios realizados para configurar Fleetbase con PostgreSQL en lugar de MySQL.

## 📋 Cambios Realizados

### 1. Docker Compose (`docker-compose.yml`)

**Base de datos PostgreSQL:**
- ✅ Imagen cambiada de `mysql:8.0-oracle` a `postgres:16-alpine`
- ✅ Puerto cambiado de `3306` a `5432`
- ✅ Variables de entorno actualizadas:
  - `POSTGRES_USER: fleetbase`
  - `POSTGRES_PASSWORD: fleetbase`
  - `POSTGRES_DB: fleetbase`
- ✅ Healthcheck actualizado para PostgreSQL: `pg_isready -U fleetbase`
- ✅ Volumen de datos: `./docker/database/postgres`

**Servicios actualizados:**
- ✅ `scheduler`: DATABASE_URL → `pgsql://fleetbase:fleetbase@database/fleetbase`
- ✅ `queue`: DATABASE_URL → `pgsql://fleetbase:fleetbase@database/fleetbase`
- ✅ `application`: DATABASE_URL → `pgsql://fleetbase:fleetbase@database/fleetbase`

### 2. Dockerfile (`docker/Dockerfile`)

**Paquetes del sistema:**
- ✅ `mycli` reemplazado por `postgresql-client`

**Extensiones PHP:**
- ✅ `pdo_mysql` reemplazado por `pdo_pgsql`
- ✅ Añadida extensión `pgsql`

### 3. Script de Instalación (`scripts/docker-install.sh`)

**Healthcheck de base de datos:**
- ✅ Comando `mysqladmin ping` reemplazado por `pg_isready -U fleetbase`

### 4. Configuración de Laravel

**`api/config/database.php`:**
- ✅ Conexión predeterminada cambiada de `mysql` a `pgsql`

**`api/config/queue.php`:**
- ✅ Driver de cola fallida cambiado de `mysql` a `pgsql`

## 🚀 Instrucciones de Instalación

### Requisitos Previos

1. **Docker Desktop para Windows** (con WSL2 habilitado)
   - Descarga: https://www.docker.com/products/docker-desktop/
   - Habilita integración con WSL2 en Settings → Resources → WSL Integration

2. **WSL2** con Ubuntu (ya configurado en tu sistema)

### Paso 1: Verificar Docker

```bash
docker --version
docker compose version
```

### Paso 2: Instalar Fleetbase

```bash
cd /mnt/g/Users/GAMEMAX/Documents/CREAI/fleetbase-repo
./scripts/docker-install.sh
```

El script te preguntará:
- **Host**: Presiona Enter para usar `localhost`
- **Environment**: Escribe `development` y presiona Enter

### Paso 3: Esperar la Instalación

La instalación puede tardar varios minutos mientras:
- Descarga las imágenes Docker
- Inicia los servicios
- Espera que PostgreSQL esté listo
- Ejecuta migraciones de base de datos

### Paso 4: Acceder a Fleetbase

Una vez completada la instalación:

- **Console (Frontend)**: http://localhost:4200
- **API (Backend)**: http://localhost:8000

## 🔧 Servicios Desplegados

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| PostgreSQL | 5432 | Base de datos |
| Redis | 6379 | Cache y colas |
| SocketCluster | 38000 | WebSockets en tiempo real |
| API (Laravel) | 8000 | Backend PHP |
| Console (Ember.js) | 4200 | Frontend |

## 📊 Versión de PostgreSQL

**PostgreSQL 16 Alpine** - Versión compatible y optimizada:
- ✅ Última versión estable de PostgreSQL
- ✅ Compatible con Laravel/PHP 8.2
- ✅ Imagen Alpine ligera y segura
- ✅ Soporte completo para características modernas

## 🛠️ Comandos Útiles

### Ver logs de servicios

```bash
# Todos los servicios
docker compose logs -f

# Solo PostgreSQL
docker compose logs -f database

# Solo la aplicación
docker compose logs -f application
```

### Conectarse a PostgreSQL

```bash
# Desde el host
docker compose exec database psql -U fleetbase -d fleetbase

# Desde línea de comandos
psql -h localhost -p 5432 -U fleetbase -d fleetbase
```

### Reiniciar servicios

```bash
# Reiniciar todo
docker compose restart

# Reiniciar solo la aplicación
docker compose restart application

# Reiniciar solo la base de datos
docker compose restart database
```

### Detener Fleetbase

```bash
docker compose down
```

### Detener y eliminar volúmenes (⚠️ ESTO BORRARÁ LOS DATOS)

```bash
docker compose down -v
```

## 🔍 Verificación de la Configuración

### 1. Verificar que PostgreSQL esté corriendo

```bash
docker compose ps database
```

Deberías ver el estado como `healthy`.

### 2. Verificar conexión desde la aplicación

```bash
docker compose exec application php artisan tinker
```

Luego ejecuta:
```php
DB::connection()->getPdo();
echo "Conexión exitosa a: " . DB::connection()->getDatabaseName();
```

### 3. Verificar extensiones PHP

```bash
docker compose exec application php -m | grep pgsql
```

Deberías ver:
```
pdo_pgsql
pgsql
```

## 🐛 Solución de Problemas

### Error: "No se puede conectar a PostgreSQL"

1. Verifica que el contenedor esté corriendo:
   ```bash
   docker compose ps database
   ```

2. Revisa los logs:
   ```bash
   docker compose logs database
   ```

3. Verifica el healthcheck:
   ```bash
   docker compose exec database pg_isready -U fleetbase
   ```

### Error: "permission denied" en volúmenes

```bash
sudo chown -R $USER:$USER ./docker/database/postgres
```

### Error: "Port already in use"

Si el puerto 5432 está en uso:

```bash
# Ver qué está usando el puerto
sudo lsof -i :5432

# Detener el servicio (ejemplo con PostgreSQL local)
sudo systemctl stop postgresql
```

O modifica el puerto en `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Usar puerto 5433 en el host
```

### Reconstruir la imagen con PostgreSQL

Si estás usando imágenes personalizadas:

```bash
docker compose build --no-cache application
docker compose up -d
```

## 📝 Notas Importantes

1. **Credenciales de PostgreSQL:**
   - Usuario: `fleetbase`
   - Contraseña: `fleetbase`
   - Base de datos: `fleetbase`

2. **Volúmenes persistentes:**
   - Los datos se almacenan en `./docker/database/postgres`
   - Hacer backup regularmente en producción

3. **Migraciones:**
   - Laravel maneja automáticamente las diferencias entre MySQL y PostgreSQL
   - Las migraciones se ejecutan automáticamente en el primer inicio

4. **Rendimiento:**
   - PostgreSQL puede tener mejor rendimiento en consultas complejas
   - Ajusta `shared_buffers` y `work_mem` en producción según sea necesario

## 🔐 Configuraciones Adicionales (Opcional)

### Configurar variables de entorno adicionales

Crea o edita `docker-compose.override.yml`:

```yaml
version: "3.8"
services:
  application:
    environment:
      CONSOLE_HOST: http://localhost:4200
      MAIL_MAILER: smtp
      OSRM_HOST: https://router.project-osrm.org
      IPINFO_API_KEY: tu_api_key
      GOOGLE_MAPS_API_KEY: tu_api_key
      GOOGLE_MAPS_LOCALE: us
      TWILIO_SID: tu_sid
      TWILIO_TOKEN: tu_token
      TWILIO_FROM: tu_numero
```

### Configurar PostgreSQL para producción

Edita `docker-compose.yml` y añade bajo el servicio `database`:

```yaml
command: 
  - "postgres"
  - "-c"
  - "max_connections=200"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "effective_cache_size=1GB"
  - "-c"
  - "maintenance_work_mem=64MB"
  - "-c"
  - "checkpoint_completion_target=0.9"
  - "-c"
  - "wal_buffers=16MB"
  - "-c"
  - "default_statistics_target=100"
```

## 🎯 Próximos Pasos

1. ✅ Instala Docker Desktop
2. ✅ Ejecuta `./scripts/docker-install.sh`
3. ✅ Accede a http://localhost:4200
4. ✅ Configura tu instancia de Fleetbase
5. ✅ Explora la documentación oficial: https://docs.fleetbase.io

## 📚 Recursos Adicionales

- **Documentación de Fleetbase**: https://docs.fleetbase.io
- **Documentación de PostgreSQL**: https://www.postgresql.org/docs/16/
- **Laravel Database**: https://laravel.com/docs/database
- **Docker Compose**: https://docs.docker.com/compose/

---

¿Necesitas ayuda? Consulta los logs con `docker compose logs -f` o revisa la sección de solución de problemas arriba.

