# Correcciones Realizadas al Script create-new-instance.sh

## Fecha: 12 de Noviembre, 2025

---

## 🔧 Problemas Corregidos

### 1. ✅ Verificación de Recursos Docker Duplicados

**Problema:**
- No se verificaba si existían contenedores, imágenes o volúmenes duplicados antes de crear una nueva instancia
- Esto causaba el error: `image "docker.io/library/fleetbase-cliente1-fleetbase-application-pgsql:latest": already exists`

**Solución:**
Se agregó la función `check_docker_duplicates()` que:

- ✅ Verifica contenedores existentes con el mismo nombre de instancia
- ✅ Verifica imágenes existentes con el mismo nombre de instancia
- ✅ Verifica volúmenes existentes con el mismo nombre de instancia
- ✅ Ofrece opciones al usuario:
  - Opción 1: Limpiar recursos existentes automáticamente
  - Opción 2: Cancelar y usar otro nombre

**Ubicación:** Líneas 97-191 en `scripts/create-new-instance.sh`

```bash
# Función para verificar si hay recursos Docker duplicados
check_docker_duplicates() {
    local instance_name=$1
    local has_duplicates=false
    
    # Verifica contenedores, imágenes y volúmenes
    # Limpia automáticamente si el usuario lo solicita
}
```

**Se ejecuta:** Inmediatamente después de solicitar el nombre de la instancia (línea 197)

---

### 2. ✅ Error con el Comando pg_isready

**Problema:**
```
pg_isready: option requires an argument: U
pg_isready: hint: Try "pg_isready --help" for more information.
```

**Causa:**
- El script `start.sh` generado usaba variables sin definir (`$DB_USER`, `$HTTP_PORT`, `$CONSOLE_PORT`)
- El heredoc usaba comillas simples (`'START_EOF'`) que no permitían la interpolación de variables

**Solución:**
1. Se cambió el heredoc de comillas simples a sin comillas para permitir interpolación
2. Se agregaron las variables de configuración al inicio del script `start.sh`:

```bash
# Variables de configuración
DB_USER="${DB_USER}"
HTTP_PORT="${HTTP_PORT}"
CONSOLE_PORT="${CONSOLE_PORT}"
```

3. Se corrigieron las referencias a variables en el script usando `\${VARIABLE}`

**Ubicación:** Líneas 692-745 en `scripts/create-new-instance.sh`

---

### 3. ✅ Limpieza Automática de Imágenes Duplicadas en start.sh

**Problema:**
- Cuando se ejecutaba `start.sh --build`, las imágenes duplicadas causaban errores

**Solución:**
Se agregó limpieza automática de imágenes antes de construir:

```bash
# Limpiar imágenes duplicadas antes de construir
echo "🧹 Limpiando imágenes Docker duplicadas..."
docker images | grep "${INSTANCE_NAME}-fleetbase-application-pgsql" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
```

**Ubicación:** Líneas 704-707 en `scripts/create-new-instance.sh`

**Mejora adicional:**
- Se cambió `docker compose build` a `docker compose build --no-cache` para forzar reconstrucción limpia

---

## 📋 Resumen de Cambios

| # | Cambio | Líneas Afectadas | Estado |
|---|--------|------------------|--------|
| 1 | Función `check_docker_duplicates()` agregada | 97-191 | ✅ Completado |
| 2 | Llamada a verificación de duplicados | 197 | ✅ Completado |
| 3 | Corrección de variables en script `start.sh` | 696-699 | ✅ Completado |
| 4 | Limpieza de imágenes en `start.sh` | 704-707 | ✅ Completado |
| 5 | Cambio a `--no-cache` en build | 712 | ✅ Completado |
| 6 | Corrección de comando `pg_isready` | 731 | ✅ Completado |

---

## 🎯 Beneficios

### Para el Usuario:
1. **Prevención Proactiva:** Detecta duplicados antes de crear la instancia
2. **Limpieza Automática:** Opción de limpiar recursos existentes en un solo paso
3. **Sin Errores de pg_isready:** El comando ahora funciona correctamente
4. **Sin Conflictos de Imágenes:** Las imágenes duplicadas se limpian automáticamente

### Para el Sistema:
1. **Menor Uso de Espacio:** Elimina recursos Docker obsoletos
2. **Construcción Limpia:** `--no-cache` asegura builds frescos
3. **Menos Conflictos:** Evita problemas con recursos Docker duplicados

---

## 🚀 Cómo Usar las Nuevas Funcionalidades

### Creación de Nueva Instancia:

```bash
cd /mnt/g/Users/GAMEMAX/Documents/CREAI/fleetbase-repo
bash scripts/create-new-instance.sh
```

**Flujo Mejorado:**
1. Solicita nombre de instancia
2. **NUEVO:** Verifica duplicados automáticamente
3. Si hay duplicados, ofrece opciones:
   - Limpiar y continuar
   - Cancelar
4. Continúa con la configuración normal

### Inicio de Instancia con Build Limpio:

```bash
cd /mnt/g/Users/GAMEMAX/Documents/CREAI/cliente1
./start.sh --build
```

**Proceso Mejorado:**
1. **NUEVO:** Limpia imágenes duplicadas automáticamente
2. Construye con `--no-cache` para build limpio
3. Inicia servicios
4. Verifica estado de PostgreSQL correctamente

---

## 🧪 Pruebas Recomendadas

### 1. Probar Detección de Duplicados:

```bash
# Crear primera instancia
bash scripts/create-new-instance.sh
# Nombre: test1

# Intentar crear otra con el mismo nombre
bash scripts/create-new-instance.sh
# Nombre: test1
# Debería detectar duplicados y ofrecer limpiar
```

### 2. Probar Comando pg_isready:

```bash
cd /mnt/g/Users/GAMEMAX/Documents/CREAI/test1
./start.sh

# Verificar que no aparezca el error:
# "pg_isready: option requires an argument: U"
```

### 3. Probar Build Limpio:

```bash
cd /mnt/g/Users/GAMEMAX/Documents/CREAI/test1
./start.sh --build

# Debería limpiar imágenes y construir sin errores
```

---

## 📝 Notas Adicionales

### Variables Interpoladas en start.sh:
- `DB_USER`: Usuario de PostgreSQL
- `HTTP_PORT`: Puerto de la aplicación
- `CONSOLE_PORT`: Puerto de la consola web

Estas variables se definen en el momento de la creación de la instancia y se incrustan en el script `start.sh`.

### Comando pg_isready Correcto:
```bash
pg_isready -U ${DB_USER}
```

**Parámetros:**
- `-U`: Usuario de PostgreSQL (requiere el flag con guion)
- `${DB_USER}`: Variable expandida con el nombre del usuario

---

## ✅ Estado Final

Todos los problemas reportados han sido corregidos:

- ✅ Verificación de duplicados implementada
- ✅ Error de `pg_isready` corregido
- ✅ Limpieza automática de imágenes agregada
- ✅ Error de imagen "already exists" solucionado
- ✅ Sin errores de linter

---

## 🔗 Referencias

- **Archivo Principal:** `scripts/create-new-instance.sh`
- **Función Nueva:** `check_docker_duplicates()` (líneas 97-191)
- **Script Generado:** `start.sh` (creado en cada instancia)
- **Comando Docker:** `docker compose build --no-cache`

---

## 📞 Soporte

Si encuentras algún problema con estas correcciones:

1. Verifica que Docker esté corriendo: `docker ps`
2. Verifica permisos: El script usa `sudo` para comandos Docker
3. Revisa logs: `docker compose logs -f database`
4. Verifica imágenes: `docker images | grep fleetbase`

---

**Última Actualización:** 12 de Noviembre, 2025
**Versión del Script:** create-new-instance.sh v2.0

