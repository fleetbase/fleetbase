#!/bin/bash
# Script para sembrar datos básicos sin usar artisan
# Se ejecuta desde el HOST y llama al contenedor Docker

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🌱 SEMBRANDO DATOS BÁSICOS SIN ARTISAN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Detectar si necesita sudo
DOCKER_CMD="docker"
if ! docker ps >/dev/null 2>&1; then
    if sudo docker ps >/dev/null 2>&1; then
        DOCKER_CMD="sudo docker"
        echo -e "${YELLOW}ℹ️  Usando sudo para Docker${NC}"
    else
        echo -e "${RED}❌ Error: No se puede acceder a Docker${NC}"
        exit 1
    fi
fi

# Verificar que los contenedores estén corriendo
echo -e "${BLUE}📋 Verificando contenedores...${NC}"
if ! $DOCKER_CMD compose ps | grep -q "Up"; then
    echo -e "${RED}❌ Error: Los contenedores no están corriendo${NC}"
    echo -e "${YELLOW}💡 Ejecuta: docker compose up -d${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Contenedores corriendo${NC}"
echo ""

echo -e "${BLUE}📋 Insertando datos básicos con PHP PDO...${NC}"
echo ""

# Ejecutar el script PHP dentro del contenedor
$DOCKER_CMD compose exec -T application php -r "
\$env = [];
foreach (file('.env') as \$line) {
    \$line = trim(\$line);
    if (\$line && strpos(\$line, '=') && strpos(\$line, '#') !== 0) {
        list(\$k, \$v) = explode('=', \$line, 2);
        \$env[trim(\$k)] = trim(\$v);
    }
}

try {
    \$pdo = new PDO(
        'pgsql:host='.\$env['DB_HOST'].';port='.\$env['DB_PORT'].';dbname='.\$env['DB_DATABASE'],
        \$env['DB_USERNAME'],
        \$env['DB_PASSWORD'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    echo \"✅ Conexión exitosa\n\n\";
    
    // Verificar estructura de la tabla permissions
    echo \"🔍 Verificando tabla permissions...\n\";
    \$permTableInfo = \$pdo->query(\"
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'permissions' AND column_name = 'id'
    \")->fetch(PDO::FETCH_ASSOC);
    
    if (\$permTableInfo) {
        echo \"   Columna id: \" . \$permTableInfo['data_type'] . \"\n\";
        echo \"   Default: \" . (\$permTableInfo['column_default'] ?: 'ninguno') . \"\n\";
        
        // Solo corregir secuencia si es tipo INTEGER/BIGINT, no UUID
        if (in_array(\$permTableInfo['data_type'], ['integer', 'bigint'])) {
            // Si no tiene secuencia, crearla
            if (empty(\$permTableInfo['column_default']) || strpos(\$permTableInfo['column_default'], 'nextval') === false) {
                echo \"   ⚠️  Corrigiendo secuencia de autoincremento...\n\";
                
                // Crear secuencia si no existe
                \$pdo->exec(\"CREATE SEQUENCE IF NOT EXISTS permissions_id_seq\");
                
                // Establecer el valor actual de la secuencia
                \$maxId = \$pdo->query(\"SELECT COALESCE(MAX(id), 0) FROM permissions\")->fetchColumn();
                \$pdo->exec(\"SELECT setval('permissions_id_seq', \" . (\$maxId + 1) . \", false)\");
                
                // Asignar la secuencia como default
                \$pdo->exec(\"ALTER TABLE permissions ALTER COLUMN id SET DEFAULT nextval('permissions_id_seq')\");
                
                // Asignar ownership de la secuencia a la columna
                \$pdo->exec(\"ALTER SEQUENCE permissions_id_seq OWNED BY permissions.id\");
                
                echo \"   ✅ Secuencia configurada\n\";
            } else {
                echo \"   ✅ Secuencia OK\n\";
            }
        } elseif (\$permTableInfo['data_type'] === 'uuid') {
            // Para UUID, verificar que tenga un default
            if (empty(\$permTableInfo['column_default'])) {
                echo \"   ⚠️  Configurando generación automática de UUID...\n\";
                \$pdo->exec(\"ALTER TABLE permissions ALTER COLUMN id SET DEFAULT uuid_generate_v4()\");
                echo \"   ✅ UUID configurado\n\";
            } else {
                echo \"   ✅ UUID OK\n\";
            }
        }
    }
    
    // Verificar estructura de la tabla roles
    echo \"🔍 Verificando tabla roles...\n\";
    \$rolesTableInfo = \$pdo->query(\"
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'id'
    \")->fetch(PDO::FETCH_ASSOC);
    
    if (\$rolesTableInfo) {
        echo \"   Columna id: \" . \$rolesTableInfo['data_type'] . \"\n\";
        echo \"   Default: \" . (\$rolesTableInfo['column_default'] ?: 'ninguno') . \"\n\";
        
        // Solo corregir secuencia si es tipo INTEGER/BIGINT, no UUID
        if (in_array(\$rolesTableInfo['data_type'], ['integer', 'bigint'])) {
            // Si no tiene secuencia, crearla
            if (empty(\$rolesTableInfo['column_default']) || strpos(\$rolesTableInfo['column_default'], 'nextval') === false) {
                echo \"   ⚠️  Corrigiendo secuencia de autoincremento...\n\";
                
                // Crear secuencia si no existe
                \$pdo->exec(\"CREATE SEQUENCE IF NOT EXISTS roles_id_seq\");
                
                // Establecer el valor actual de la secuencia
                \$maxId = \$pdo->query(\"SELECT COALESCE(MAX(id), 0) FROM roles\")->fetchColumn();
                \$pdo->exec(\"SELECT setval('roles_id_seq', \" . (\$maxId + 1) . \", false)\");
                
                // Asignar la secuencia como default
                \$pdo->exec(\"ALTER TABLE roles ALTER COLUMN id SET DEFAULT nextval('roles_id_seq')\");
                
                // Asignar ownership de la secuencia a la columna
                \$pdo->exec(\"ALTER SEQUENCE roles_id_seq OWNED BY roles.id\");
                
                echo \"   ✅ Secuencia configurada\n\";
            } else {
                echo \"   ✅ Secuencia OK\n\";
            }
        } elseif (\$rolesTableInfo['data_type'] === 'uuid') {
            // Para UUID, verificar que tenga un default
            if (empty(\$rolesTableInfo['column_default'])) {
                echo \"   ⚠️  Configurando generación automática de UUID...\n\";
                \$pdo->exec(\"ALTER TABLE roles ALTER COLUMN id SET DEFAULT uuid_generate_v4()\");
                echo \"   ✅ UUID configurado\n\";
            } else {
                echo \"   ✅ UUID OK\n\";
            }
        }
    }
    echo \"\n\";
    
    // Verificar y corregir tabla company_users
    echo \"🔍 Verificando tabla company_users...\n\";
    \$companyUsersUuid = \$pdo->query(\"
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'company_users' AND column_name = 'uuid'
    \")->fetch(PDO::FETCH_ASSOC);
    
    if (\$companyUsersUuid && \$companyUsersUuid['data_type'] === 'uuid') {
        if (empty(\$companyUsersUuid['column_default'])) {
            echo \"   ⚠️  Configurando generación automática de UUID...\n\";
            \$pdo->exec(\"ALTER TABLE company_users ALTER COLUMN uuid SET DEFAULT uuid_generate_v4()\");
            echo \"   ✅ UUID configurado\n\";
        } else {
            echo \"   ✅ UUID OK\n\";
        }
    }
    echo \"\n\";
    
    // Verificar si ya hay datos
    \$userCount = \$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    
    if (\$userCount > 0) {
        echo \"⚠️  Ya existen \$userCount usuarios en la base de datos\n\";
        echo \"💡 Omitiendo seeding para evitar duplicados\n\";
        exit(0);
    }
    
    echo \"🌱 Sembrando datos básicos...\n\n\";
    
    // Función para generar UUID v4
    function uuid() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
    
    // 1. Crear permisos básicos
    echo \"📝 Creando permisos básicos...\n\";
    \$permissions = [
        ['name' => 'view users', 'guard_name' => 'web'],
        ['name' => 'create users', 'guard_name' => 'web'],
        ['name' => 'update users', 'guard_name' => 'web'],
        ['name' => 'delete users', 'guard_name' => 'web'],
        ['name' => 'view companies', 'guard_name' => 'web'],
        ['name' => 'create companies', 'guard_name' => 'web'],
        ['name' => 'update companies', 'guard_name' => 'web'],
        ['name' => 'delete companies', 'guard_name' => 'web'],
        ['name' => 'manage settings', 'guard_name' => 'web'],
        ['name' => 'view reports', 'guard_name' => 'web'],
        ['name' => 'create reports', 'guard_name' => 'web'],
    ];
    
    // No especificar la columna id, dejar que PostgreSQL use el autoincremento
    \$stmt = \$pdo->prepare('INSERT INTO permissions (name, guard_name, created_at, updated_at) VALUES (?, ?, NOW(), NOW()) ON CONFLICT (name, guard_name) DO NOTHING RETURNING id');
    \$permCount = 0;
    foreach (\$permissions as \$perm) {
        try {
            \$stmt->execute([\$perm['name'], \$perm['guard_name']]);
            \$permCount++;
        } catch (PDOException \$e) {
            // Ignorar conflictos
            if (strpos(\$e->getMessage(), 'duplicate') === false) {
                throw \$e;
            }
        }
    }
    echo \"✅ \$permCount permisos creados\n\";
    
    // 2. Crear roles básicos
    echo \"📝 Creando roles básicos...\n\";
    \$roles = [
        ['name' => 'Administrator', 'guard_name' => 'web'],
        ['name' => 'Manager', 'guard_name' => 'web'],
        ['name' => 'User', 'guard_name' => 'web'],
    ];
    
    \$stmt = \$pdo->prepare('INSERT INTO roles (id, name, guard_name, created_at, updated_at) VALUES (DEFAULT, ?, ?, NOW(), NOW()) RETURNING id');
    \$roleIds = [];
    foreach (\$roles as \$role) {
        \$stmt->execute([\$role['name'], \$role['guard_name']]);
        \$roleIds[\$role['name']] = \$stmt->fetchColumn();
    }
    echo \"✅ \" . count(\$roles) . \" roles creados\n\";
    
    // 3. Asignar todos los permisos al rol Administrator
    echo \"📝 Asignando permisos a Administrator...\n\";
    if (isset(\$roleIds['Administrator'])) {
        \$allPermissions = \$pdo->query('SELECT id FROM permissions')->fetchAll(PDO::FETCH_COLUMN);
        \$stmt = \$pdo->prepare('INSERT INTO role_has_permissions (permission_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING');
        foreach (\$allPermissions as \$permId) {
            \$stmt->execute([\$permId, \$roleIds['Administrator']]);
        }
        echo \"✅ \" . count(\$allPermissions) . \" permisos asignados\n\";
    }
    
    // 4. Crear compañía por defecto
    echo \"📝 Creando compañía por defecto...\n\";
    \$companyUuid = uuid();
    \$pdo->prepare('INSERT INTO companies (public_id, name, description, timezone, currency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())')
        ->execute([\$companyUuid, 'Default Company', 'Default company for initial setup', 'UTC', 'USD', 'active']);
    echo \"✅ Compañía creada: \$companyUuid\n\";
    
    // 5. Crear usuario administrador por defecto
    echo \"📝 Creando usuario administrador...\n\";
    \$userUuid = uuid();
    \$password = password_hash('password', PASSWORD_BCRYPT); // Cambiar esto en producción
    \$pdo->prepare('INSERT INTO users (uuid, public_id, company_uuid, name, email, password, timezone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())')
        ->execute([\$userUuid, \$userUuid, \$companyUuid, 'Administrator', 'admin@fleetbase.local', \$password, 'UTC']);
    echo \"✅ Usuario admin creado\n\";
    echo \"   Email: admin@fleetbase.local\n\";
    echo \"   Password: password\n\";
    echo \"   ⚠️  CAMBIAR PASSWORD EN PRODUCCIÓN\n\";
    
    // 6. Asociar usuario con compañía
    \$pdo->prepare('INSERT INTO company_users (uuid, company_uuid, user_uuid, status, created_at) VALUES (uuid_generate_v4(), ?, ?, ?, NOW())')
        ->execute([\$companyUuid, \$userUuid, 'active']);
    echo \"✅ Usuario asociado a compañía\n\";
    
    // 7. Asignar rol Administrator al usuario
    if (isset(\$roleIds['Administrator'])) {
        \$pdo->prepare('INSERT INTO model_has_roles (role_id, model_type, model_uuid) VALUES (?, ?, ?)')
            ->execute([\$roleIds['Administrator'], 'App\\\\Models\\\\User', \$userUuid]);
        echo \"✅ Rol Administrator asignado\n\";
    }
    
    // 8. Configuraciones básicas
    echo \"📝 Creando configuraciones básicas...\n\";
    \$settings = [
        ['key' => 'app.name', 'value' => json_encode('Fleetbase')],
        ['key' => 'app.locale', 'value' => json_encode('en')],
        ['key' => 'app.timezone', 'value' => json_encode('UTC')],
    ];
    
    \$stmt = \$pdo->prepare('INSERT INTO settings (key, value) VALUES (?, ?::json) ON CONFLICT (key) DO NOTHING');
    \$settingCount = 0;
    foreach (\$settings as \$setting) {
        try {
            \$stmt->execute([\$setting['key'], \$setting['value']]);
            \$settingCount++;
        } catch (PDOException \$e) {
            // Ignorar conflictos
            if (strpos(\$e->getMessage(), 'duplicate') === false && strpos(\$e->getMessage(), 'unique') === false) {
                throw \$e;
            }
        }
    }
    echo \"✅ \$settingCount configuraciones creadas\n\";
    
    echo \"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\";
    echo \"🎉 ¡SEEDING COMPLETADO EXITOSAMENTE!\n\";
    echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\";
    echo \"\n📊 Resumen:\n\";
    echo \"   ✅ Permisos: \" . count(\$permissions) . \"\n\";
    echo \"   ✅ Roles: \" . count(\$roles) . \"\n\";
    echo \"   ✅ Compañía: 1\n\";
    echo \"   ✅ Usuario admin: 1\n\";
    echo \"   ✅ Configuraciones: \$settingCount\n\";
    echo \"\n🔐 Credenciales de acceso:\n\";
    echo \"   📧 Email: admin@fleetbase.local\n\";
    echo \"   🔑 Password: password\n\";
    echo \"\n⚠️  IMPORTANTE: Cambia el password en producción\n\";
    
    exit(0);
    
} catch (Exception \$e) {
    echo \"❌ Error: \" . \$e->getMessage() . \"\n\";
    exit(1);
}
"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Datos sembrados correctamente${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Limpiar caché de Laravel
    echo -e "${YELLOW}🧹 Limpiando caché de Laravel...${NC}"
    $DOCKER_CMD compose exec -T application php artisan config:clear > /dev/null 2>&1 || true
    $DOCKER_CMD compose exec -T application php artisan cache:clear > /dev/null 2>&1 || true
    $DOCKER_CMD compose exec -T application php artisan view:clear > /dev/null 2>&1 || true
    echo -e "${GREEN}   ✓ Caché limpiado${NC}"
    echo ""
    
    # Reiniciar contenedores para aplicar cambios
    echo -e "${YELLOW}🔄 Reiniciando contenedores para aplicar cambios...${NC}"
    echo -e "${BLUE}   Esto tomará unos segundos...${NC}"
    $DOCKER_CMD compose restart application scheduler queue > /dev/null 2>&1 || true
    
    # Esperar a que los contenedores estén listos
    echo -e "${YELLOW}   ⏳ Esperando a que los servicios estén listos...${NC}"
    sleep 10
    
    # Verificar estado de application
    if $DOCKER_CMD ps | grep -q "application.*Up"; then
        echo -e "${GREEN}   ✓ Contenedores reiniciados correctamente${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Los contenedores están iniciando, espera unos segundos más${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Proceso completado exitosamente${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}📝 Próximos pasos:${NC}"
    echo -e "   1. Accede a la consola: ${GREEN}http://localhost:${CONSOLE_PORT}${NC}"
    echo -e "   2. Email: ${GREEN}admin@fleetbase.local${NC}"
    echo -e "   3. Password: ${GREEN}password${NC}"
    echo -e "   4. ${RED}Cambia la contraseña en producción${NC}"
    echo ""
    
    exit 0
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ Error al sembrar datos${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi

