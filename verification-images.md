# Verificación de Imágenes Docker - Script Create-New-Instance

## Contenedores Actuales vs Script Generator

| Servicio | Imagen Actual | En docker-compose.yml Base | En Script create-new-instance.sh | ✅ Status |
|----------|---------------|---------------------------|----------------------------------|----------|
| **httpd** | `fleetbase-repo-httpd` | ✅ Sí (build local) | ✅ Sí (línea 187-190) | ✅ |
| **application** | `fleetbase/fleetbase-api:latest` | ✅ Sí | ✅ Sí (línea 172-185) | ✅ |
| **scheduler** | `fleetbase/fleetbase-api:latest` | ✅ Sí | ✅ Sí (línea 149-156) | ✅ |
| **queue** | `fleetbase/fleetbase-api:latest` | ✅ Sí | ✅ Sí (línea 158-165) | ✅ |
| **cache** | `redis:4-alpine` | ✅ Sí | ✅ Sí (línea 125-126) | ✅ |
| **console** | `fleetbase/fleetbase-console:latest` | ✅ Sí | ✅ Sí (línea 167-170) | ✅ |
| **socket** | `socketcluster/socketcluster:v17.4.0` | ✅ Sí | ✅ Sí (línea 146-147) | ✅ |
| **database** | `postgis/postgis:16-3.4-alpine` | ❌ No (usa postgres:16-alpine) | ✅ Sí (línea 128-144) | ✅ |

## Resumen

### ✅ TODAS LAS IMÁGENES ESTÁN INCLUIDAS

El script `create-new-instance.sh` incluye **TODOS** los 8 servicios necesarios:

1. ✅ **httpd** - Servidor web (puerto 8000)
2. ✅ **application** - API principal de Fleetbase
3. ✅ **scheduler** - Tareas programadas (cron)
4. ✅ **queue** - Procesador de colas
5. ✅ **cache** - Redis para caché
6. ✅ **console** - Consola frontend (puerto 4200)
7. ✅ **socket** - SocketCluster para WebSockets (puerto 38000)
8. ✅ **database** - PostgreSQL con PostGIS

### Diferencias Clave

El script `create-new-instance.sh` mejora la configuración base:

1. **Database**: Usa `postgis/postgis:16-3.4-alpine` (mejor que postgres:16-alpine)
   - ✅ Incluye extensión PostGIS para datos geoespaciales
   - ✅ Healthcheck configurado
   - ✅ Puerto configurable

2. **Application/Scheduler/Queue**: Construye imagen personalizada
   - ✅ Usa `Dockerfile.pgsql` con soporte completo PostgreSQL
   - ✅ Imagen customizada: `${INSTANCE_NAME}-fleetbase-application-pgsql:latest`
   - ✅ PHP_MEMORY_LIMIT configurado

3. **Httpd**: Mantiene build local
   - ✅ Puerto configurable (línea 189-190)

4. **Console**: Puerto configurable
   - ✅ Socket.io port variable (línea 169-170)

5. **Socket**: Mantiene configuración estándar
   - ✅ SocketCluster v17.4.0

6. **Cache**: Mantiene Redis 4
   - ✅ redis:4-alpine con restart policy

## Archivo de Referencia

```yaml
# Líneas 123-195 del script create-new-instance.sh
services:
  cache:              # ✅ Redis
  database:           # ✅ PostGIS
  socket:             # ✅ SocketCluster
  scheduler:          # ✅ Fleetbase API (cron)
  queue:              # ✅ Fleetbase API (queue)
  console:            # ✅ Frontend
  application:        # ✅ API principal
  httpd:              # ✅ Servidor web

volumes:
  ${INSTANCE_NAME}_postgres_data:  # ✅ Volumen de datos PostgreSQL
```

## Conclusión

✅ **El script `create-new-instance.sh` está COMPLETO y CORRECTO**

Incluye todas las imágenes Docker necesarias para una instancia funcional de Fleetbase con PostgreSQL.
