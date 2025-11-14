# 📚 Scripts de Migración y Reparación - Fleetbase PostgreSQL

Colección completa de scripts para gestionar migraciones, diagnosticar problemas y reparar la base de datos de Fleetbase en PostgreSQL.

---

## 📋 Índice de Scripts

### 🚀 Scripts de Migración

| Script | Descripción | Cuándo Usar |
|--------|-------------|-------------|
| **migrate-all-robust.sh** | 🏆 **Script principal de migración** | Para ejecutar todas las migraciones pendientes |
| **master-fix-pgsql.sh** | Ejecuta migraciones con fixes automáticos | Primer setup inicial |
| **run-migrations-with-timeout.sh** | Ejecuta migraciones con monitoreo en tiempo real | Cuando quieres ver progreso detallado |

### 🔧 Scripts de Reparación

| Script | Descripción | Cuándo Usar |
|--------|-------------|-------------|
| **deep-fix-onboarding.sh** | Reparación profunda de todas las tablas | Cuando hay errores persistentes |
| **fix-stuck-migrations.sh** | Repara migraciones atascadas | Cuando una migración se congela |
| **fix-missing-columns.sh** | Agrega columnas faltantes | Error "column does not exist" |

### 🔍 Scripts de Diagnóstico

| Script | Descripción | Cuándo Usar |
|--------|-------------|-------------|
| **diagnose-and-fix-onboarding.sh** | Diagnóstico completo con auto-fixes | Error 500 o problemas desconocidos |

### 🔄 Scripts de Rollback

| Script | Descripción | Cuándo Usar |
|--------|-------------|-------------|
| **rollback-onboarding.sh** | Limpia datos de onboarding | Error 422 o cuenta duplicada |

---

## 🎯 Guía de Uso según el Problema

### ✅ Caso 1: Ejecutar Migraciones Pendientes (Lo más común)

```bash
# Script recomendado (ULTRA-ROBUSTO)
bash scripts/migrate-all-robust.sh
```

**Características:**
- ✅ Aplica fixes automáticos antes de migrar
- ✅ Reintentos automáticos (hasta 3 intentos)
- ✅ Monitoreo en tiempo real
- ✅ Detecta migraciones atascadas (timeout 2 min)
- ✅ Timeout total de 10 minutos
- ✅ Análisis automático de errores
- ✅ Aplica fixes conocidos al detectar errores
- ✅ Verificación post-migración

---

### ❌ Caso 2: Error al Crear Cuenta Administrativa

#### Error 500 (Internal Server Error)

```bash
# 1. Diagnosticar el problema
bash scripts/diagnose-and-fix-onboarding.sh

# 2. Aplicar reparación profunda si hay errores críticos
bash scripts/deep-fix-onboarding.sh

# 3. Reiniciar aplicación
docker compose restart application

# 4. Intentar crear la cuenta
```

#### Error 422 (Unprocessable Entity) - "Cuenta ya existe"

```bash
# 1. Hacer rollback de datos parciales
bash scripts/rollback-onboarding.sh

# 2. Reiniciar aplicación
docker compose restart application

# 3. Intentar crear la cuenta
```

---

### 🔒 Caso 3: Migración Atascada/Congelada

```bash
# 1. Presionar Ctrl+C para detener el proceso

# 2. Reparar migraciones problemáticas
bash scripts/fix-stuck-migrations.sh

# 3. Ejecutar migraciones con timeout
bash scripts/migrate-all-robust.sh
```

---

### 🗂️ Caso 4: Error "Column does not exist"

```bash
# Ejemplo: column "batch_uuid" of relation "activity" does not exist

# 1. Agregar columnas faltantes
bash scripts/fix-missing-columns.sh

# 2. Reiniciar aplicación
docker compose restart application

# 3. Continuar con migraciones
bash scripts/migrate-all-robust.sh
```

---

## 📖 Detalles de Cada Script

### 🏆 migrate-all-robust.sh (RECOMENDADO)

**Script ultra-robusto para ejecutar TODAS las migraciones pendientes**

```bash
bash scripts/migrate-all-robust.sh
```

**Fases de ejecución:**

1. **FASE 0: Verificación Preliminar**
   - Verifica contenedores activos
   - Verifica conexión a PostgreSQL (con reintentos)
   - Cuenta migraciones pendientes

2. **FASE 1: Pre-Migración - Fixes Automáticos**
   - Instala extensiones PostgreSQL (uuid-ossp, postgis, pg_trgm)
   - Repara tabla `activity` (agrega batch_uuid, event)
   - Limpia cache de Laravel
   - Verifica procesos colgados
   - **FIX 5: Repara migraciones con Schema::connection()**
     - Busca en `/fleetbase/api/vendor/fleetbase/*/server/migrations`
     - Reemplaza `Schema::connection(config('storefront.connection.db'))->` por `Schema::`
     - Reemplaza `Schema::connection(config('registry.connection.db'))->` por `Schema::`
     - Reemplaza `Schema::connection(config('network.connection.db'))->` por `Schema::`
     - Crea backups automáticos (`.connection_backup`)
   - **FIX 5b: Repara Schema-> (flechas simples)**
     - Busca archivos con `Schema->`
     - Reemplaza por `Schema::`
   - **FIX 5c: Repara referencias al schema 'fleetbase'**
     - Busca `new Expression($databaseName . '.companies')`
     - Reemplaza por simplemente `'companies'`
     - Aplica a TODAS las tablas automáticamente usando PHP regex
   - **FIX 5d: Agrega unique constraints faltantes**
     - Agrega `UNIQUE` a `vehicle_devices.uuid` si no existe
     - Previene errores de foreign keys
   - **FIX 6: Repara índices espaciales duplicados**

3. **FASE 2: Migración con Reintentos**
   - Ejecuta migraciones con timeout de 10 minutos
   - Monitorea progreso cada 15 segundos
   - Detecta migraciones atascadas (2 min sin cambios)
   - Hasta 3 reintentos automáticos
   - Análisis de errores SQL
   - Aplica fixes conocidos automáticamente

4. **FASE 3: Verificación Post-Migración**
   - Cuenta migraciones completadas
   - Verifica integridad de la base de datos
   - Muestra próximos pasos

**Configuración:**
```bash
MAX_RETRIES=3              # Número de reintentos
MIGRATION_TIMEOUT=600      # Timeout total (10 minutos)
CHECK_INTERVAL=15          # Verificar progreso cada 15s
```

---

### 🔍 diagnose-and-fix-onboarding.sh

**Diagnóstico completo con auto-reparación**

```bash
bash scripts/diagnose-and-fix-onboarding.sh
```

**7 Fases de diagnóstico:**

1. **Análisis de Logs**
   - Extrae errores SQL del último request
   - Identifica tipo de error (columna, tabla, constraint)

2. **Verificación de Tablas Críticas**
   - users, companies, permissions, roles, activity
   - model_has_roles, model_has_permissions

3. **Verificación de Columnas Críticas**
   - Verifica columnas requeridas en cada tabla
   - Auto-agrega columnas faltantes conocidas

4. **Verificación de Datos**
   - Cuenta usuarios, empresas, permisos
   - Detecta datos parciales

5. **Verificación de Extensiones PostgreSQL**
   - postgis, uuid-ossp, pg_trgm
   - Auto-instala extensiones faltantes

6. **Verificación de Permisos y Roles**
   - Estado de tablas de autorización

7. **Logs Recientes Completos**
   - Extrae stack trace del último error
   - Guarda en `/tmp/fleetbase_last_error.log`

**Salida:**
- Estadísticas de fixes aplicados
- Errores críticos detectados
- Recomendaciones específicas

---

### 🔧 deep-fix-onboarding.sh

**Reparación profunda de la base de datos**

```bash
bash scripts/deep-fix-onboarding.sh
```

**8 Fases de reparación:**

1. **Extensiones**
   - uuid-ossp, postgis, pg_trgm

2. **Tabla activity**
   - Agrega columnas: batch_uuid, event
   - Convierte properties de TEXT a JSONB
   - Crea índices útiles

3. **Tabla users**
   - UUID con default
   - Constraint unique en public_id

4. **Tabla companies**
   - UUID con default
   - Constraint unique en public_id

5. **Tabla permissions**
   - Verifica primary key

6. **Tabla roles**
   - UUID con default

7. **Funciones Auxiliares**
   - `generate_public_id(prefix)`

8. **Verificación de Integridad**
   - Verifica todas las tablas críticas

---

### 🔄 rollback-onboarding.sh

**Limpia datos de onboarding para empezar de nuevo**

```bash
bash scripts/rollback-onboarding.sh
```

**Limpia las siguientes tablas (en orden):**
1. activity (logs)
2. sessions, tokens, api_credentials
3. model_has_permissions, model_has_roles, role_has_permissions
4. permissions, roles, policies
5. users, user_devices
6. companies, company_users, invites, notifications

**⚠️ ADVERTENCIA:** Elimina TODOS los datos pero mantiene la estructura.

---

### 🔒 fix-stuck-migrations.sh

**Repara migraciones atascadas**

```bash
bash scripts/fix-stuck-migrations.sh
```

**Fixes que aplica:**

1. **Migraciones con conexiones problemáticas**
   - Reemplaza `Schema::connection(config('storefront.connection.db'))` por `Schema::`
   - Soporta: storefront, registry, network

2. **Índices complejos**
   - Comenta índices JSON problemáticos

3. **Referencias a schemas inexistentes**
   - Remueve prefijo `fleetbase.` de las referencias

**Crea backups automáticos** en: `/fleetbase/api/database/migrations/backups_stuck_migrations/`

---

### 🗂️ fix-missing-columns.sh

**Agrega columnas faltantes en tablas críticas**

```bash
bash scripts/fix-missing-columns.sh
```

**Verificaciones:**

1. **Tabla activity**
   - `batch_uuid` (UUID)
   - `event` (VARCHAR)
   - Convierte `properties` a JSONB

2. **Tabla users**
   - Verifica columnas críticas: id, uuid, public_id, company_uuid, name, email, password

3. **Tabla companies**
   - Verifica columnas críticas

4. **Otras tablas**
   - permissions, roles

---

## 🎯 Flujo Recomendado - Setup Completo

### Primera vez - Setup inicial:

```bash
# 1. Levantar contenedores
docker compose up -d

# 2. Ejecutar migraciones robustas (incluye fixes automáticos)
bash scripts/migrate-all-robust.sh

# 3. Acceder a la aplicación
# http://localhost:4200/

# 4. Crear primera cuenta administrativa
```

### Si hay problemas:

```bash
# 1. Diagnosticar
bash scripts/diagnose-and-fix-onboarding.sh

# 2. Reparar (si el diagnóstico lo recomienda)
bash scripts/deep-fix-onboarding.sh

# 3. Rollback de datos parciales (si es necesario)
bash scripts/rollback-onboarding.sh

# 4. Reintentar migraciones
bash scripts/migrate-all-robust.sh

# 5. Reiniciar aplicación
docker compose restart application
```

---

## 🆘 Solución de Problemas Comunes

### Problema: "SQLSTATE[42703]: column 'batch_uuid' does not exist"

**Solución:**
```bash
bash scripts/fix-missing-columns.sh
docker compose restart application
```

---

### Problema: "SQLSTATE[23505]: unique_violation"

**Causa:** Datos duplicados o cuenta parcialmente creada

**Solución:**
```bash
bash scripts/rollback-onboarding.sh
docker compose restart application
```

---

### Problema: Migración se queda atascada sin avanzar

**Solución:**
```bash
# Ctrl+C para detener
bash scripts/fix-stuck-migrations.sh
bash scripts/migrate-all-robust.sh
```

---

### Problema: Error 500 al crear cuenta

**Solución:**
```bash
# 1. Ver el error específico
bash scripts/diagnose-and-fix-onboarding.sh

# 2. Seguir las recomendaciones del diagnóstico
```

---

## 📊 Comandos Útiles

### Ver estado de migraciones:
```bash
docker compose exec application php artisan migrate:status
```

### Ver logs de aplicación:
```bash
docker compose logs application --tail=50 -f
```

### Ver logs de base de datos:
```bash
docker compose logs database --tail=50
```

### Conectarse a PostgreSQL:
```bash
docker compose exec database psql -U fleetbase -d fleetbase
```

### Ver tablas creadas:
```bash
docker compose exec database psql -U fleetbase -d fleetbase -c '\dt'
```

### Contar migraciones:
```bash
docker compose exec database psql -U fleetbase -d fleetbase -c 'SELECT COUNT(*) FROM migrations'
```

---

## ⚙️ Configuración de Variables

Todas las configuraciones se leen automáticamente de `api/.env`:

```env
DB_CONNECTION=pgsql
DB_HOST=database
DB_PORT=5432
DB_DATABASE=fleetbase
DB_USERNAME=fleetbase
DB_PASSWORD=your_password
```

---

## 🔐 Seguridad

**Antes de ejecutar en producción:**

1. ✅ Hacer backup de la base de datos
2. ✅ Probar en ambiente de desarrollo
3. ✅ Revisar logs cuidadosamente
4. ✅ Cambiar passwords por defecto

---

## 📝 Notas Importantes

- Todos los scripts crean **backups automáticos** antes de modificar archivos
- Los scripts son **idempotentes** - se pueden ejecutar múltiples veces
- Usan **comandos seguros** con verificaciones previas
- Tienen **timeouts** para evitar procesos colgados
- Generan **logs detallados** para debugging

---

## 🎉 Resultado Esperado

Después de ejecutar los scripts exitosamente:

```
✅ Todas las migraciones completadas
✅ Base de datos íntegra
✅ Aplicación funcionando
✅ Listo para crear primera cuenta administrativa
```

**URL de acceso:** http://localhost:4200/

---

## 📞 Soporte

Si encuentras problemas no cubiertos en esta guía:

1. Ejecuta el diagnóstico completo: `bash scripts/diagnose-and-fix-onboarding.sh`
2. Revisa el log guardado en: `/tmp/fleetbase_last_error.log`
3. Verifica los logs de Docker: `docker compose logs application --tail=100`

---

**Última actualización:** 2025-11-13

