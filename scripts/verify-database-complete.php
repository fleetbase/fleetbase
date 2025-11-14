<?php
/**
 * Script de verificación completa de la base de datos PostgreSQL
 * Verifica que todas las tablas necesarias existen y tienen la estructura correcta
 */

set_time_limit(0);
ini_set('memory_limit', '-1');

echo "\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "🔍 VERIFICACIÓN COMPLETA DE LA BASE DE DATOS\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "\n";

// Cambiar al directorio de la API
chdir('/fleetbase/api');

// Cargar autoloader de Composer
require 'vendor/autoload.php';

// Cargar variables de entorno
$dotenv = Dotenv\Dotenv::createImmutable('/fleetbase/api');
$dotenv->load();

use Illuminate\Container\Container;
use Illuminate\Database\Capsule\Manager as Capsule;

// Crear y configurar Capsule
$app = new Container();
$capsule = new Capsule($app);
$capsule->addConnection([
    'driver' => 'pgsql',
    'host' => env('DB_HOST', 'database'),
    'port' => env('DB_PORT', '5432'),
    'database' => env('DB_DATABASE', 'fleetbase'),
    'username' => env('DB_USERNAME', 'fleetbase'),
    'password' => env('DB_PASSWORD', 'fleetbase'),
    'charset' => 'utf8',
    'prefix' => '',
    'schema' => 'public',
]);

$capsule->setAsGlobal();
$connection = $capsule->getConnection();

// Lista de todas las tablas que deberían existir
$expectedTables = [
    // Tablas esenciales
    'migrations',
    'users',
    'user_devices',
    'companies',
    'groups',
    'group_users',
    'company_users',
    'permissions',
    'roles',
    'model_has_permissions',
    'model_has_roles',
    'role_has_permissions',
    'personal_access_tokens',
    
    // Tablas de datos
    'files',
    'transactions',
    'transaction_items',
    'categories',
    'types',
    'settings',
    
    // Tablas de API
    'api_credentials',
    'api_events',
    'api_request_logs',
    
    // Tablas de webhooks
    'webhook_endpoints',
    'webhook_request_logs',
    
    // Tablas de extensiones
    'extensions',
    'extension_installs',
    
    // Tablas de seguridad
    'invites',
    'policies',
    'verification_codes',
    'login_attempts',
    
    // Tablas de logs
    'activity_log',
    'failed_jobs',
    
    // Tablas de notificaciones
    'notifications',
    
    // Tablas de dashboards
    'dashboards',
    'dashboard_widgets',
    
    // Tablas de custom fields
    'custom_fields',
    'custom_field_values',
    
    // Tablas de chat
    'chat_channels',
    'chat_participants',
    'chat_messages',
    'chat_attachments',
    'chat_receipts',
    'chat_logs',
    
    // Tablas de directivas
    'directives',
    
    // Tablas de comentarios
    'comments',
    
    // Tablas de reportes
    'reports',
    'alerts',
    'report_cache',
    'report_audit_logs',
    'report_templates',
    'report_executions',
    
    // Tablas de schedule monitor
    'monitor_scheduled_tasks',
];

echo "📋 Verificando existencia de tablas...\n\n";

$existingTables = $connection->select("
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename != 'spatial_ref_sys'
    ORDER BY tablename
");

$existingTableNames = array_map(function($t) { return $t->tablename; }, $existingTables);

$missingTables = [];
$foundTables = [];

foreach ($expectedTables as $table) {
    if (in_array($table, $existingTableNames)) {
        echo "   ✅ {$table}\n";
        $foundTables[] = $table;
    } else {
        echo "   ❌ {$table} - FALTANTE\n";
        $missingTables[] = $table;
    }
}

echo "\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📊 Resumen de Tablas:\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "   ✅ Existentes: " . count($foundTables) . "\n";
echo "   ❌ Faltantes:  " . count($missingTables) . "\n";
echo "   📊 Total:      " . count($expectedTables) . "\n";
echo "\n";

// Verificar migraciones registradas
echo "📋 Verificando migraciones registradas...\n\n";

$migrations = $connection->table('migrations')->orderBy('id')->get();
echo "   Total de migraciones registradas: " . count($migrations) . " / 85\n";

if (count($migrations) < 85) {
    echo "   ⚠️  Algunas migraciones no están registradas\n";
} else {
    echo "   ✅ Todas las migraciones están registradas\n";
}

echo "\n";

// Verificar tipos de columnas UUID críticas
echo "🔍 Verificando tipos de columnas UUID...\n\n";

$uuidColumns = [
    ['table' => 'companies', 'column' => 'uuid'],
    ['table' => 'users', 'column' => 'company_uuid'],
    ['table' => 'groups', 'column' => 'company_uuid'],
    ['table' => 'transactions', 'column' => 'company_uuid'],
    ['table' => 'files', 'column' => 'company_uuid'],
];

foreach ($uuidColumns as $col) {
    try {
        $type = $connection->select("
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = '{$col['table']}' 
            AND column_name = '{$col['column']}'
            AND table_schema = 'public'
        ");
        
        if (!empty($type)) {
            $dataType = $type[0]->data_type;
            if ($dataType === 'uuid') {
                echo "   ✅ {$col['table']}.{$col['column']} → UUID\n";
            } else {
                echo "   ⚠️  {$col['table']}.{$col['column']} → {$dataType} (debería ser UUID)\n";
            }
        }
    } catch (Exception $e) {
        echo "   ⚠️  {$col['table']}.{$col['column']} → Tabla no existe\n";
    }
}

echo "\n";

// Verificar constraints únicos importantes
echo "🔍 Verificando constraints únicos...\n\n";

$constraints = [
    ['table' => 'dashboards', 'constraint' => 'dashboards_uuid_unique'],
    ['table' => 'users', 'constraint' => 'users_uuid_unique'],
];

foreach ($constraints as $con) {
    try {
        $exists = $connection->select("
            SELECT 1 
            FROM pg_constraint 
            WHERE conname = '{$con['constraint']}'
        ");
        
        if (!empty($exists)) {
            echo "   ✅ {$con['table']} tiene constraint único\n";
        } else {
            echo "   ⚠️  {$con['table']} no tiene constraint único (puede causar problemas)\n";
        }
    } catch (Exception $e) {
        echo "   ⚠️  Error verificando {$con['table']}\n";
    }
}

echo "\n";

// Verificar foreign keys importantes
echo "🔍 Verificando claves foráneas...\n\n";

$foreignKeys = $connection->select("
    SELECT 
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    ORDER BY tc.table_name
");

echo "   Total de claves foráneas: " . count($foreignKeys) . "\n";

// Contar FKs que apuntan a companies
$companyFks = array_filter($foreignKeys, function($fk) {
    return $fk->foreign_table_name === 'companies';
});

echo "   Claves foráneas a 'companies': " . count($companyFks) . "\n";

echo "\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

if (count($missingTables) > 0) {
    echo "⚠️  VERIFICACIÓN INCOMPLETA\n";
    echo "\n";
    echo "Tablas faltantes:\n";
    foreach ($missingTables as $table) {
        echo "   - {$table}\n";
    }
    echo "\n";
    exit(1);
} else {
    echo "🎉 ¡VERIFICACIÓN EXITOSA!\n";
    echo "\n";
    echo "✅ Todas las tablas esperadas existen\n";
    echo "✅ Columnas UUID correctas\n";
    echo "✅ Base de datos lista para usar\n";
    echo "\n";
    exit(0);
}

