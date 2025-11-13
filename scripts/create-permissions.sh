#!/bin/bash
# Script para crear permisos de Fleetbase sin usar artisan
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
echo -e "${GREEN}🔐 CREANDO PERMISOS DE FLEETBASE SIN ARTISAN${NC}"
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

echo -e "${BLUE}📋 Generando permisos con PHP PDO...${NC}"
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
    
    // Verificar si ya hay permisos
    \$permCount = \$pdo->query('SELECT COUNT(*) FROM permissions')->fetchColumn();
    echo \"📊 Permisos actuales: \$permCount\n\n\";
    
    echo \"🔐 Creando permisos completos de Fleetbase...\n\n\";
    
    // Definir todos los permisos por módulo
    \$modules = [
        'users' => ['view', 'create', 'update', 'delete', 'assign-roles', 'manage-permissions'],
        'companies' => ['view', 'create', 'update', 'delete', 'manage-settings'],
        'groups' => ['view', 'create', 'update', 'delete', 'assign-users'],
        'roles' => ['view', 'create', 'update', 'delete', 'assign-permissions'],
        'permissions' => ['view', 'create', 'update', 'delete'],
        'files' => ['view', 'upload', 'download', 'delete'],
        'categories' => ['view', 'create', 'update', 'delete'],
        'transactions' => ['view', 'create', 'update', 'delete', 'process', 'refund'],
        'api-credentials' => ['view', 'create', 'update', 'delete', 'regenerate'],
        'webhooks' => ['view', 'create', 'update', 'delete', 'test'],
        'extensions' => ['view', 'install', 'uninstall', 'configure'],
        'settings' => ['view', 'update', 'manage-system'],
        'reports' => ['view', 'create', 'update', 'delete', 'export', 'schedule'],
        'alerts' => ['view', 'create', 'update', 'delete', 'configure'],
        'dashboards' => ['view', 'create', 'update', 'delete', 'customize'],
        'custom-fields' => ['view', 'create', 'update', 'delete'],
        'comments' => ['view', 'create', 'update', 'delete'],
        'invites' => ['view', 'create', 'resend', 'revoke'],
        'notifications' => ['view', 'send', 'mark-read', 'delete'],
        'activity-log' => ['view', 'export'],
        'chat' => ['view', 'send-message', 'create-channel', 'delete-message'],
        'policies' => ['view', 'create', 'update', 'delete', 'enforce'],
        'directives' => ['view', 'create', 'update', 'delete', 'execute'],
    ];
    
    \$stmt = \$pdo->prepare('
        INSERT INTO permissions (name, guard_name, created_at, updated_at) 
        VALUES (?, ?, NOW(), NOW()) 
        ON CONFLICT (name, guard_name) DO NOTHING
    ');
    
    \$created = 0;
    \$skipped = 0;
    
    foreach (\$modules as \$module => \$actions) {
        echo \"📦 Módulo: \$module\n\";
        foreach (\$actions as \$action) {
            \$permName = \$action . ' ' . \$module;
            try {
                \$result = \$stmt->execute([\$permName, 'web']);
                if (\$stmt->rowCount() > 0) {
                    \$created++;
                    echo \"   ✅ \$permName\n\";
                } else {
                    \$skipped++;
                }
            } catch (Exception \$e) {
                \$skipped++;
            }
        }
    }
    
    // Permisos especiales
    echo \"\n📦 Permisos especiales\n\";
    \$specialPermissions = [
        'manage-system-settings',
        'view-audit-logs',
        'export-data',
        'import-data',
        'manage-backups',
        'manage-integrations',
        'manage-api-keys',
        'impersonate-users',
        'manage-database',
        'view-system-health',
        'manage-queues',
        'manage-cache',
        'manage-logs',
        'execute-commands',
        'access-admin-panel',
    ];
    
    foreach (\$specialPermissions as \$perm) {
        try {
            \$result = \$stmt->execute([\$perm, 'web']);
            if (\$stmt->rowCount() > 0) {
                \$created++;
                echo \"   ✅ \$perm\n\";
            } else {
                \$skipped++;
            }
        } catch (Exception \$e) {
            \$skipped++;
        }
    }
    
    // Asignar todos los permisos al rol Administrator
    echo \"\n🔗 Asignando permisos a rol Administrator...\n\";
    \$adminRole = \$pdo->query(\"SELECT id FROM roles WHERE name = 'Administrator' AND guard_name = 'web' LIMIT 1\")->fetch(PDO::FETCH_ASSOC);
    
    if (\$adminRole) {
        \$allPermissions = \$pdo->query('SELECT id FROM permissions')->fetchAll(PDO::FETCH_COLUMN);
        \$assignStmt = \$pdo->prepare('INSERT INTO role_has_permissions (permission_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING');
        \$assigned = 0;
        
        foreach (\$allPermissions as \$permId) {
            try {
                \$result = \$assignStmt->execute([\$permId, \$adminRole['id']]);
                if (\$assignStmt->rowCount() > 0) {
                    \$assigned++;
                }
            } catch (Exception \$e) {
                // Ignorar duplicados
            }
        }
        
        echo \"✅ \$assigned permisos asignados a Administrator\n\";
    } else {
        echo \"⚠️  Rol Administrator no encontrado\n\";
        echo \"💡 Ejecuta primero: bash scripts/seed-basic-data.sh\n\";
    }
    
    echo \"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\";
    echo \"🎉 ¡PERMISOS CREADOS EXITOSAMENTE!\n\";
    echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\";
    echo \"\n📊 Resumen:\n\";
    echo \"   ✅ Permisos creados: \$created\n\";
    echo \"   ⏭️  Permisos omitidos (ya existían): \$skipped\n\";
    
    \$totalPerms = \$pdo->query('SELECT COUNT(*) FROM permissions')->fetchColumn();
    echo \"   📊 Total de permisos en BD: \$totalPerms\n\";
    
    echo \"\n💡 Los permisos están listos para ser usados en la aplicación\n\";
    
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
    echo -e "${GREEN}✅ Permisos creados correctamente${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ Error al crear permisos${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi

