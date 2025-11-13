# 🔄 Guía de Refactorización de Migraciones MySQL → PostgreSQL

## 📋 Resumen

Fleetbase está diseñado originalmente para MySQL. Esta guía te ayudará a refactorizar las migraciones para que funcionen con PostgreSQL.

## ⚠️ Problemas Comunes MySQL → PostgreSQL

| Problema MySQL | Solución PostgreSQL |
|----------------|---------------------|
| `CHARACTER SET utf8mb4` | Eliminar (PostgreSQL usa UTF-8 por defecto) |
| `COLLATE utf8mb4_unicode_ci` | Eliminar (no aplica) |
| `ENGINE=InnoDB` | Eliminar (PostgreSQL usa su propio motor) |
| `->unsigned()` | Eliminar (PostgreSQL no tiene unsigned) |
| `->enum(['val1', 'val2'])` | Cambiar a `->string('column', 50)` |
| `->mediumText()` | Cambiar a `->text()` |
| `->longText()` | Cambiar a `->text()` |
| `->timestamp(0)` | Cambiar a `->timestamp()` |

## 🚀 Método 1: Script Bash (Automático)

```bash
# Dar permisos de ejecución
chmod +x scripts/refactor-migrations-to-pgsql.sh

# Ejecutar el script
./scripts/refactor-migrations-to-pgsql.sh
```

## 🐍 Método 2: Script Python (Más detallado)

```bash
# Copiar el script al contenedor
docker compose cp scripts/refactor_migrations.py application:/tmp/

# Ejecutar dentro del contenedor
docker compose exec application python3 /tmp/refactor_migrations.py
```

## 🛠️ Método 3: Manual (Comandos individuales)

### 1. Crear respaldo

```bash
docker compose exec application bash -c "
  cp -r /fleetbase/api/database/migrations /fleetbase/api/database/migrations_backup_mysql
  cp -r /fleetbase/api/vendor/fleetbase /fleetbase/api/vendor/fleetbase_backup_mysql
"
```

### 2. Eliminar CHARACTER SET y COLLATE

```bash
docker compose exec application bash -c "
  find /fleetbase/api/database/migrations -name '*.php' -type f -exec sed -i 's/CHARACTER SET [a-z0-9_]*//gI' {} \;
  find /fleetbase/api/database/migrations -name '*.php' -type f -exec sed -i 's/COLLATE [a-z0-9_]*//gI' {} \;
  
  find /fleetbase/api/vendor/fleetbase -name '*.php' -type f -exec sed -i 's/CHARACTER SET [a-z0-9_]*//gI' {} \;
  find /fleetbase/api/vendor/fleetbase -name '*.php' -type f -exec sed -i 's/COLLATE [a-z0-9_]*//gI' {} \;
"
```

### 3. Eliminar ENGINE=InnoDB

```bash
docker compose exec application bash -c "
  find /fleetbase/api/database/migrations -name '*.php' -type f -exec sed -i \"s/, *engine *= *[\\\"']*InnoDB[\\\"']*//gI\" {} \;
  find /fleetbase/api/vendor/fleetbase -name '*.php' -type f -exec sed -i \"s/, *engine *= *[\\\"']*InnoDB[\\\"']*//gI\" {} \;
"
```

### 4. Eliminar ->unsigned()

```bash
docker compose exec application bash -c "
  find /fleetbase/api/database/migrations -name '*.php' -type f -exec sed -i 's/->unsigned()//g' {} \;
  find /fleetbase/api/vendor/fleetbase -name '*.php' -type f -exec sed -i 's/->unsigned()//g' {} \;
"
```

### 5. Convertir enum a string

```bash
docker compose exec application bash -c "
  find /fleetbase/api/database/migrations -name '*.php' -type f -exec sed -i \"s/->enum(\([^)]*\))/->string(\1, 50)/g\" {} \;
  find /fleetbase/api/vendor/fleetbase -name '*.php' -type f -exec sed -i \"s/->enum(\([^)]*\))/->string(\1, 50)/g\" {} \;
"
```

### 6. Cambiar mediumText y longText a text

```bash
docker compose exec application bash -c "
  find /fleetbase/api/database/migrations -name '*.php' -type f -exec sed -i 's/->mediumText()/->text()/g' {} \;
  find /fleetbase/api/database/migrations -name '*.php' -type f -exec sed -i 's/->longText()/->text()/g' {} \;
  
  find /fleetbase/api/vendor/fleetbase -name '*.php' -type f -exec sed -i 's/->mediumText()/->text()/g' {} \;
  find /fleetbase/api/vendor/fleetbase -name '*.php' -type f -exec sed -i 's/->longText()/->text()/g' {} \;
"
```

### 7. Cambiar timestamp(0) a timestamp()

```bash
docker compose exec application bash -c "
  find /fleetbase/api/database/migrations -name '*.php' -type f -exec sed -i 's/->timestamp(0)/->timestamp()/g' {} \;
  find /fleetbase/api/vendor/fleetbase -name '*.php' -type f -exec sed -i 's/->timestamp(0)/->timestamp()/g' {} \;
"
```

## ✅ Verificar la Refactorización

```bash
# Ver cuántas migraciones hay
docker compose exec application bash -c "find /fleetbase/api/database/migrations -name '*.php' | wc -l"

# Verificar que no queden referencias a MySQL
docker compose exec application bash -c "
  grep -r 'CHARACTER SET' /fleetbase/api/database/migrations/ || echo 'OK: Sin CHARACTER SET'
  grep -r 'COLLATE' /fleetbase/api/database/migrations/ || echo 'OK: Sin COLLATE'
  grep -r 'ENGINE' /fleetbase/api/database/migrations/ || echo 'OK: Sin ENGINE'
  grep -r '->unsigned()' /fleetbase/api/database/migrations/ || echo 'OK: Sin unsigned'
"
```

## 🚀 Ejecutar las Migraciones

```bash
# Limpiar la base de datos (si es necesario)
docker compose exec application php artisan db:wipe --force

# Ejecutar migraciones
docker compose exec application php artisan migrate --force

# Si hay errores, ver detalles
docker compose exec application php artisan migrate --force -vvv
```

## 🔧 Solución de Problemas Comunes

### Error: "column does not exist"
Algunas migraciones pueden tener dependencias. Ejecutar una por una:
```bash
docker compose exec application php artisan migrate --path=/fleetbase/api/database/migrations/2023_04_25_094301_create_users_table.php --force
```

### Error: "type does not exist"
PostgreSQL maneja enums de forma diferente. Si persiste, cambiar manualmente en la migración.

### Error con índices
PostgreSQL tiene límites de nombres diferentes. Reducir nombres de índices si es necesario.

## 📝 Notas Importantes

1. **Respaldo**: Siempre crea respaldos antes de refactorizar
2. **Vendor**: Las migraciones en `vendor/fleetbase` también necesitan refactorización
3. **Testing**: Prueba cada migración en un ambiente de desarrollo primero
4. **Reversión**: Si algo falla, puedes restaurar desde los respaldos

## 🎯 Checklist

- [ ] Respaldo creado
- [ ] Script de refactorización ejecutado
- [ ] Verificación completada (sin CHARACTER SET, ENGINE, etc.)
- [ ] Migraciones ejecutadas sin errores
- [ ] Aplicación funcional
- [ ] Datos de prueba creados

## 🆘 ¿Necesitas ayuda?

Si encuentras errores específicos, compártelos para ajustar las migraciones manualmente.

