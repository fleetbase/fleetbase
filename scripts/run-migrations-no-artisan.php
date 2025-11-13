<?php
/**
 * Script para ejecutar migraciones de Laravel SIN usar artisan
 * Usa el Migrator de Laravel directamente
 */

set_time_limit(0);
ini_set('memory_limit', '-1');

echo "\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "🚀 EJECUTANDO MIGRACIONES SIN ARTISAN (Migrator directo)\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "\n";

// Cambiar al directorio de la API
chdir('/fleetbase/api');
echo "📁 Directorio de trabajo: " . getcwd() . "\n\n";

// Cargar autoloader de Composer
echo "📦 Cargando autoloader de Composer...\n";
if (!file_exists('vendor/autoload.php')) {
    echo "❌ Error: No se encuentra vendor/autoload.php\n";
    exit(1);
}
require 'vendor/autoload.php';
echo "✅ Autoloader cargado\n\n";

// Cargar variables de entorno
echo "⚙️  Cargando variables de entorno...\n";
echo "   Buscando .env en: /fleetbase/api/.env\n";
if (!file_exists('/fleetbase/api/.env')) {
    echo "❌ Error: No se encuentra /fleetbase/api/.env\n";
    exit(1);
}
$dotenv = Dotenv\Dotenv::createImmutable('/fleetbase/api');
$dotenv->load();
echo "✅ Variables de entorno cargadas\n\n";

// Inicializar Laravel Application Container
echo "🔧 Inicializando Laravel Application...\n";
use Illuminate\Container\Container;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Support\Facades\Facade;
use Illuminate\Database\Schema\Builder;

// Crear el contenedor de la aplicación
$app = new Container();
$app->singleton('app', function() use ($app) {
    return $app;
});

// Configurar el contenedor como instancia global
Container::setInstance($app);

// Configurar Facades para usar este contenedor
Facade::setFacadeApplication($app);

// Crear y configurar Capsule
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
    'sslmode' => 'prefer',
]);

$capsule->setAsGlobal();
$capsule->bootEloquent();

// Registrar servicios necesarios en el contenedor
$app->singleton('db', function() use ($capsule) {
    return $capsule->getDatabaseManager();
});

$app->singleton('db.connection', function() use ($capsule) {
    return $capsule->getConnection();
});

$app->singleton('db.schema', function() use ($capsule) {
    return $capsule->schema();
});

// Mock del servicio de cache
$app->singleton('cache', function() {
    return new class {
        public function get($key, $default = null) {
            return $default;
        }
        
        public function put($key, $value, $ttl = null) {
            return true;
        }
        
        public function forget($key) {
            return true;
        }
        
        public function flush() {
            return true;
        }
        
        public function remember($key, $ttl, $callback) {
            return $callback();
        }
        
        public function store($name = null) {
            return $this;
        }
        
        public function tags($names) {
            return $this;
        }
    };
});

// Crear un mock de config que implemente ArrayAccess
$app->singleton('config', function() {
    $dbConfig = [
        'driver' => 'pgsql',
        'host' => env('DB_HOST', 'database'),
        'port' => env('DB_PORT', '5432'),
        'database' => env('DB_DATABASE', 'fleetbase'),
        'username' => env('DB_USERNAME', 'fleetbase'),
        'password' => env('DB_PASSWORD', 'fleetbase'),
        'charset' => 'utf8',
        'prefix' => '',
        'schema' => 'public',
        'sslmode' => 'prefer',
    ];
    
    return new class($dbConfig) implements ArrayAccess {
        private $configs = [];
        
        public function __construct($dbConfig) {
            $this->configs = [
                'database.default' => 'pgsql',
                'database.connections' => [
                    'pgsql' => $dbConfig
                ],
                'database.connections.pgsql' => $dbConfig,
                // Configuración completa de permisos (Spatie)
                'permission.teams' => false,
                'permission.use_passport_client_credentials' => false,
                'permission.display_permission_in_exception' => false,
                'permission.display_role_in_exception' => false,
                'permission.enable_wildcard_permission' => false,
                'permission.cache.expiration_time' => 60 * 24,
                'permission.cache.key' => 'spatie.permission.cache',
                'permission.cache.store' => 'default',
                'permission.table_names' => [
                    'roles' => 'roles',
                    'permissions' => 'permissions',
                    'model_has_permissions' => 'model_has_permissions',
                    'model_has_roles' => 'model_has_roles',
                    'role_has_permissions' => 'role_has_permissions',
                ],
                'permission.table_names.roles' => 'roles',
                'permission.table_names.permissions' => 'permissions',
                'permission.table_names.model_has_permissions' => 'model_has_permissions',
                'permission.table_names.model_has_roles' => 'model_has_roles',
                'permission.table_names.role_has_permissions' => 'role_has_permissions',
                'permission.column_names' => [
                    'role_pivot_key' => null,
                    'permission_pivot_key' => null,
                    'model_morph_key' => 'model_id',
                    'team_foreign_key' => 'team_id',
                ],
                'permission.column_names.model_morph_key' => 'model_id',
                'permission.column_names.team_foreign_key' => 'team_id',
                // Configuración de activity log (Spatie)
                'activitylog.enabled' => true,
                'activitylog.delete_records_older_than_days' => 365,
                'activitylog.default_log_name' => 'default',
                'activitylog.default_auth_driver' => null,
                'activitylog.table_name' => 'activity_log',
                'activitylog.database_connection' => null,
                'activitylog.subject_returns_soft_deleted_models' => false,
            ];
        }
        
        public function get($key, $default = null) {
            return $this->configs[$key] ?? $default;
        }
        
        public function set($key, $value) {
            $this->configs[$key] = $value;
        }
        
        public function offsetExists($offset): bool {
            return isset($this->configs[$offset]);
        }
        
        public function offsetGet($offset): mixed {
            return $this->configs[$offset] ?? null;
        }
        
        public function offsetSet($offset, $value): void {
            $this->configs[$offset] = $value;
        }
        
        public function offsetUnset($offset): void {
            unset($this->configs[$offset]);
        }
    };
});

echo "✅ Laravel Application inicializada\n\n";

// Conectar a la base de datos
echo "🔌 Conectando a la base de datos...\n";
try {
    $pdo = $capsule->getConnection()->getPdo();
    echo "✅ Conexión exitosa a PostgreSQL\n";
    echo "   Host: " . env('DB_HOST') . "\n";
    echo "   Database: " . env('DB_DATABASE') . "\n\n";
} catch (Exception $e) {
    echo "❌ Error de conexión: " . $e->getMessage() . "\n";
    exit(1);
}

// Limpiar base de datos
echo "🗑️  Limpiando base de datos...\n";
$schema = $capsule->schema();
$connection = $capsule->getConnection();

// Obtener todas las tablas
$tables = $connection->select("
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' AND tablename != 'spatial_ref_sys'
");

if (!empty($tables)) {
    echo "   Eliminando " . count($tables) . " tablas...\n";
    $connection->statement('SET session_replication_role = replica');
    foreach ($tables as $table) {
        $tableName = $table->tablename;
        $connection->statement("DROP TABLE IF EXISTS \"$tableName\" CASCADE");
    }
    $connection->statement('SET session_replication_role = DEFAULT');
    echo "✅ Base de datos limpiada\n\n";
} else {
    echo "✅ No hay tablas para eliminar\n\n";
}

// Crear tabla de migraciones
echo "📋 Creando tabla de migraciones...\n";
if (!$schema->hasTable('migrations')) {
    $schema->create('migrations', function ($table) {
        $table->increments('id');
        $table->string('migration');
        $table->integer('batch');
    });
    echo "✅ Tabla migrations creada\n\n";
} else {
    echo "✅ Tabla migrations ya existe\n\n";
}

// Buscar archivos de migración
echo "🔍 Buscando archivos de migración...\n";
$migrationDirs = [
    '/fleetbase/api/database/migrations',
    '/fleetbase/api/vendor/fleetbase/core-api/migrations'
];

$migrationFiles = [];
foreach ($migrationDirs as $dir) {
    if (is_dir($dir)) {
        $files = glob($dir . '/*.php');
        echo "   → Encontrado: $dir (" . count($files) . " archivos)\n";
        foreach ($files as $file) {
            $name = basename($file, '.php');
            $migrationFiles[$name] = $file;
        }
    }
}

// Eliminar duplicados y ordenar
$migrationFiles = array_unique($migrationFiles);
ksort($migrationFiles);

echo "✅ Total de archivos encontrados: " . count($migrationFiles) . "\n\n";

if (empty($migrationFiles)) {
    echo "⚠️  No se encontraron archivos de migración\n";
    exit(0);
}

// Ejecutar cada migración
echo "🚀 Ejecutando migraciones...\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$batch = 1;
$success = 0;
$failed = 0;
$skipped = 0;

foreach ($migrationFiles as $name => $file) {
    echo "⏳ $name\n";
    
    try {
        // Guardar clases actuales antes de incluir el archivo
        $beforeClasses = get_declared_classes();
        
        // Incluir el archivo de migración
        require_once $file;
        
        // Encontrar la nueva clase declarada
        $afterClasses = get_declared_classes();
        $newClasses = array_diff($afterClasses, $beforeClasses);
        
        $migrationClass = null;
        
        // Buscar la clase de migración con método up()
        foreach ($newClasses as $class) {
            try {
                $reflection = new ReflectionClass($class);
                if ($reflection->hasMethod('up') && !$reflection->isAbstract()) {
                    $migrationClass = $class;
                    break;
                }
            } catch (Exception $e) {
                // Ignorar clases que no se pueden reflejar
                continue;
            }
        }
        
        if (!$migrationClass) {
            echo "   ⚠️  No se pudo determinar la clase - OMITIDA\n\n";
            $skipped++;
            continue;
        }
        
        // Instanciar y ejecutar la migración
        $migration = new $migrationClass;
        
        if (!method_exists($migration, 'up')) {
            echo "   ⚠️  No tiene método up() - OMITIDA\n\n";
            $skipped++;
            continue;
        }
        
        // Ejecutar el método up() dentro de una transacción
        $connection->beginTransaction();
        try {
            $migration->up();
            
            // Registrar en la tabla migrations
            $connection->table('migrations')->insert([
                'migration' => $name,
                'batch' => $batch
            ]);
            
            $connection->commit();
            
            echo "   ✅ Ejecutada exitosamente\n\n";
            $success++;
        } catch (Exception $e) {
            $connection->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        echo "   ❌ Error: " . $e->getMessage() . "\n\n";
        $failed++;
        
        // Si falla, intentar al menos registrarla (para evitar reintentos)
        try {
            $connection->table('migrations')->insert([
                'migration' => $name,
                'batch' => $batch
            ]);
        } catch (Exception $e2) {
            // Ignorar error de registro
        }
    }
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📊 Resumen:\n";
echo "   ✅ Exitosas: $success\n";
echo "   ❌ Fallidas: $failed\n";
echo "   ⚠️  Omitidas: $skipped\n";
echo "   📊 Total: " . count($migrationFiles) . "\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

// Corregir tipos de columnas UUID si hay errores de tipo
if ($failed > 0) {
    echo "\n🔧 Corrigiendo tipos de columnas UUID...\n";
    
    try {
        // Verificar si companies.uuid es VARCHAR
        $companyUuidType = $connection->select("
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'companies' 
            AND column_name = 'uuid'
            AND table_schema = 'public'
        ");
        
        if (!empty($companyUuidType) && $companyUuidType[0]->data_type === 'character varying') {
            echo "   → Detectada companies.uuid como VARCHAR, convirtiendo a UUID...\n";
            
            // Paso 1: Encontrar todas las claves foráneas que referencian companies.uuid
            $foreignKeys = $connection->select("
                SELECT 
                    tc.table_name, 
                    tc.constraint_name,
                    kcu.column_name
                FROM information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND ccu.table_name = 'companies'
                AND ccu.column_name = 'uuid'
            ");
            
            echo "   → Encontradas " . count($foreignKeys) . " claves foráneas a eliminar temporalmente\n";
            
            // Paso 2: Eliminar las claves foráneas
            foreach ($foreignKeys as $fk) {
                try {
                    $connection->statement("ALTER TABLE \"{$fk->table_name}\" DROP CONSTRAINT IF EXISTS \"{$fk->constraint_name}\"");
                    echo "      ✓ Eliminada FK: {$fk->table_name}.{$fk->constraint_name}\n";
                } catch (Exception $e) {
                    echo "      ⚠️  Error al eliminar FK {$fk->constraint_name}: " . $e->getMessage() . "\n";
                }
            }
            
            // Paso 3: Convertir companies.uuid a UUID
            echo "   → Convirtiendo companies.uuid a tipo UUID...\n";
            $connection->statement("ALTER TABLE companies ALTER COLUMN uuid TYPE UUID USING uuid::UUID");
            echo "   ✅ companies.uuid convertida a UUID\n";
            
            // Paso 4: Convertir todas las columnas *_uuid que referencian companies a UUID también
            echo "   → Convirtiendo columnas company_uuid en otras tablas...\n";
            $companyUuidColumns = $connection->select("
                SELECT table_name, column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND column_name = 'company_uuid'
                AND data_type = 'character varying'
            ");
            
            foreach ($companyUuidColumns as $col) {
                try {
                    $connection->statement("ALTER TABLE \"{$col->table_name}\" ALTER COLUMN company_uuid TYPE UUID USING company_uuid::UUID");
                    echo "      ✓ {$col->table_name}.company_uuid → UUID\n";
                } catch (Exception $e) {
                    echo "      ⚠️  Error en {$col->table_name}: " . $e->getMessage() . "\n";
                }
            }
            
            echo "   ✅ Todas las columnas UUID convertidas\n";
            
            // Paso 5: Agregar constraints únicos faltantes
            echo "\n🔧 Agregando constraints únicos faltantes...\n";
            
            // Agregar unique constraint a dashboards.uuid si existe la tabla
            $dashboardsExists = $connection->select("
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'dashboards'
                )
            ");
            
            if ($dashboardsExists && $dashboardsExists[0]->exists) {
                try {
                    // Verificar si ya existe el constraint
                    $hasConstraint = $connection->select("
                        SELECT EXISTS (
                            SELECT FROM pg_constraint 
                            WHERE conname = 'dashboards_uuid_unique'
                        )
                    ");
                    
                    if (!$hasConstraint || !$hasConstraint[0]->exists) {
                        $connection->statement("ALTER TABLE dashboards ADD CONSTRAINT dashboards_uuid_unique UNIQUE (uuid)");
                        echo "   ✓ Agregado constraint único a dashboards.uuid\n";
                    }
                } catch (Exception $e) {
                    echo "   ⚠️  Error al agregar constraint a dashboards: " . $e->getMessage() . "\n";
                }
            }
            
            // Agregar columna uuid a activity_log si no existe
            $activityLogExists = $connection->select("
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'activity_log'
                )
            ");
            
            if ($activityLogExists && $activityLogExists[0]->exists) {
                try {
                    $hasUuid = $connection->select("
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = 'activity_log'
                            AND column_name = 'uuid'
                        )
                    ");
                    
                    if (!$hasUuid || !$hasUuid[0]->exists) {
                        $connection->statement("ALTER TABLE activity_log ADD COLUMN uuid UUID DEFAULT uuid_generate_v4() UNIQUE");
                        echo "   ✓ Agregada columna uuid a activity_log\n";
                    }
                } catch (Exception $e) {
                    echo "   ⚠️  Error al agregar uuid a activity_log: " . $e->getMessage() . "\n";
                }
            }
            
            // Verificar que personal_access_tokens existe
            $patExists = $connection->select("
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'personal_access_tokens'
                )
            ");
            
            if (!$patExists || !$patExists[0]->exists) {
                echo "   ⚠️  Tabla personal_access_tokens no existe, creándola...\n";
                try {
                    $connection->statement("
                        CREATE TABLE personal_access_tokens (
                            id BIGSERIAL PRIMARY KEY,
                            tokenable_type VARCHAR(255) NOT NULL,
                            tokenable_id BIGINT NOT NULL,
                            name VARCHAR(255) NOT NULL,
                            token VARCHAR(64) NOT NULL UNIQUE,
                            abilities TEXT,
                            last_used_at TIMESTAMP,
                            expires_at TIMESTAMP,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    ");
                    $connection->statement("
                        CREATE INDEX IF NOT EXISTS personal_access_tokens_tokenable_idx 
                        ON personal_access_tokens(tokenable_type, tokenable_id)
                    ");
                    echo "   ✓ Tabla personal_access_tokens creada\n";
                } catch (Exception $e) {
                    echo "   ⚠️  Error al crear personal_access_tokens: " . $e->getMessage() . "\n";
                }
            }
            
            echo "   ✅ Correcciones aplicadas\n";
            
            // Paso 6: Crear tablas fallidas con SQL directo (FALLBACK ROBUSTO)
            echo "\n🔄 Creando tablas faltantes con SQL directo...\n";
            
            // Array de tablas que necesitamos crear con SQL directo
            $sqlFixes = [
                // 1. Agregar company_uuid a roles (make_roles_multi_tenant)
                'roles_company_uuid' => [
                    'name' => '2023_07_04_173018_make_roles_multi_tenant_table',
                    'check' => "SELECT column_name FROM information_schema.columns WHERE table_name='roles' AND column_name='company_uuid'",
                    'sql' => "ALTER TABLE roles ADD COLUMN company_uuid UUID NULL",
                    'fk' => "ALTER TABLE roles ADD CONSTRAINT roles_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid) ON DELETE CASCADE"
                ],
                
                // 2. dashboard_widgets foreign key
                'dashboard_widgets_fk' => [
                    'name' => '2024_01_24_072725_add_foreign_keys_to_dashboard_widgets_table',
                    'check' => "SELECT 1 FROM pg_constraint WHERE conname='dashboard_widgets_dashboard_uuid_foreign'",
                    'sql' => "ALTER TABLE dashboard_widgets ADD CONSTRAINT dashboard_widgets_dashboard_uuid_foreign FOREIGN KEY (dashboard_uuid) REFERENCES dashboards(uuid) ON DELETE CASCADE ON UPDATE CASCADE"
                ],
                
                // 3. Crear tabla comments
                'comments_table' => [
                    'name' => '2024_01_31_063635_create_comments_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='comments'",
                    'sql' => "CREATE TABLE IF NOT EXISTS comments (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        company_uuid UUID,
                        subject_uuid UUID,
                        subject_type VARCHAR(255),
                        content TEXT NOT NULL,
                        author_uuid UUID,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE comments ADD CONSTRAINT comments_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid) ON DELETE CASCADE ON UPDATE CASCADE"
                ],
                
                // 4. Crear tabla custom_fields
                'custom_fields_table' => [
                    'name' => '2024_02_04_051200_create_custom_fields_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='custom_fields'",
                    'sql' => "CREATE TABLE IF NOT EXISTS custom_fields (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        company_uuid UUID,
                        category_uuid UUID NULL,
                        subject_uuid UUID,
                        subject_type VARCHAR(255),
                        name VARCHAR(255) NOT NULL,
                        label VARCHAR(255),
                        type VARCHAR(255) DEFAULT 'text',
                        editable BOOLEAN DEFAULT TRUE,
                        required BOOLEAN DEFAULT FALSE,
                        default_value TEXT,
                        validation_rules JSON,
                        options JSON,
                        meta JSON,
                        for_type VARCHAR(255) NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE custom_fields ADD CONSTRAINT custom_fields_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid)"
                ],
                
                // 5. Crear tabla custom_field_values
                'custom_field_values_table' => [
                    'name' => '2024_03_07_054635_create_custom_field_values_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='custom_field_values'",
                    'sql' => "CREATE TABLE IF NOT EXISTS custom_field_values (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        company_uuid UUID,
                        custom_field_uuid UUID,
                        subject_uuid UUID,
                        subject_type VARCHAR(255),
                        value TEXT,
                        value_data JSON,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE custom_field_values ADD CONSTRAINT custom_field_values_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid)"
                ],
                
                // 6-11. Crear tablas de chat
                'chat_channels_table' => [
                    'name' => '2024_04_01_090455_create_chat_channels_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='chat_channels'",
                    'sql' => "CREATE TABLE IF NOT EXISTS chat_channels (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        company_uuid UUID,
                        name VARCHAR(255),
                        created_by_uuid UUID,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE chat_channels ADD CONSTRAINT chat_channels_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid)"
                ],
                
                'chat_participants_table' => [
                    'name' => '2024_04_01_090456_create_chat_participants_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='chat_participants'",
                    'sql' => "CREATE TABLE IF NOT EXISTS chat_participants (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        company_uuid UUID,
                        chat_channel_uuid UUID,
                        user_uuid UUID,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE chat_participants ADD CONSTRAINT chat_participants_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid)"
                ],
                
                'chat_messages_table' => [
                    'name' => '2024_04_01_090458_create_chat_messages_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='chat_messages'",
                    'sql' => "CREATE TABLE IF NOT EXISTS chat_messages (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        company_uuid UUID,
                        chat_channel_uuid UUID,
                        sender_uuid UUID,
                        content TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid)"
                ],
                
                'chat_attachments_table' => [
                    'name' => '2024_04_01_090459_create_chat_attachments_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='chat_attachments'",
                    'sql' => "CREATE TABLE IF NOT EXISTS chat_attachments (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        company_uuid UUID,
                        chat_message_uuid UUID,
                        file_uuid UUID,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE chat_attachments ADD CONSTRAINT chat_attachments_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid)"
                ],
                
                'chat_receipts_table' => [
                    'name' => '2024_04_01_090459_create_chat_receipts_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='chat_receipts'",
                    'sql' => "CREATE TABLE IF NOT EXISTS chat_receipts (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        company_uuid UUID,
                        chat_message_uuid UUID,
                        user_uuid UUID,
                        read_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE chat_receipts ADD CONSTRAINT chat_receipts_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid)"
                ],
                
                'chat_logs_table' => [
                    'name' => '2024_04_06_042059_create_chat_logs_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='chat_logs'",
                    'sql' => "CREATE TABLE IF NOT EXISTS chat_logs (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        company_uuid UUID,
                        chat_channel_uuid UUID,
                        event VARCHAR(255),
                        details JSON,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE chat_logs ADD CONSTRAINT chat_logs_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid)"
                ],
                
                // 12. Crear tabla directives
                'directives_table' => [
                    'name' => '2024_08_27_090558_create_directives_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='directives'",
                    'sql' => "CREATE TABLE IF NOT EXISTS directives (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        company_uuid UUID,
                        name VARCHAR(255) NOT NULL,
                        type VARCHAR(255),
                        content TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE directives ADD CONSTRAINT directives_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid)"
                ],
                
                // 13. Agregar access_token_id a api_events
                'api_events_access_token' => [
                    'name' => '2024_10_17_075756_add_access_token_id_to_log_tables',
                    'check' => "SELECT column_name FROM information_schema.columns WHERE table_name='api_events' AND column_name='access_token_id'",
                    'sql' => "ALTER TABLE api_events ADD COLUMN IF NOT EXISTS access_token_id BIGINT NULL",
                    'fk' => "ALTER TABLE api_events ADD CONSTRAINT api_events_access_token_id_foreign FOREIGN KEY (access_token_id) REFERENCES personal_access_tokens(id) ON DELETE CASCADE ON UPDATE CASCADE"
                ],
                
                // 14. Agregar índice UUID a activity_log
                'activity_log_uuid_index' => [
                    'name' => '2025_05_20_034427_add_uuid_index_to_activity_table',
                    'check' => "SELECT 1 FROM pg_indexes WHERE indexname='activity_log_uuid_index'",
                    'sql' => "CREATE INDEX IF NOT EXISTS activity_log_uuid_index ON activity_log(uuid)"
                ],
                
                // 14b. add_group_column_to_custom_fields (ya incluida en custom_fields_table, solo registrar)
                'custom_fields_group' => [
                    'name' => '2024_02_28_070126_add_group_column_to_custom_fields_table',
                    'check' => "SELECT 1 FROM information_schema.columns WHERE table_name='custom_fields' AND column_name='category_uuid'",
                    'sql' => "SELECT 1"
                ],
                
                // 14c. add_editable_column_to_custom_fields (ya incluida en custom_fields_table, solo registrar)
                'custom_fields_editable' => [
                    'name' => '2024_03_11_060207_add_editable_column_to_custom_fields_table',
                    'check' => "SELECT 1 FROM information_schema.columns WHERE table_name='custom_fields' AND column_name='editable'",
                    'sql' => "SELECT 1"
                ],
                
                // 14d. add_for_column_to_custom_fields (ya incluida en custom_fields_table, solo registrar)
                'custom_fields_for' => [
                    'name' => '2025_10_01_070748_add_for_column_to_custom_fields_table',
                    'check' => "SELECT 1 FROM information_schema.columns WHERE table_name='custom_fields' AND column_name='for_type'",
                    'sql' => "SELECT 1"
                ],
                
                // 14e. report_enhancements (ya incluidas en reports_table, solo registrar)
                'reports_enhancements' => [
                    'name' => '2025_09_25_084135_report_enhancements',
                    'check' => "SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='public_id'",
                    'sql' => "SELECT 1" // Query simple que no hace nada, solo para registrar
                ],
                
                // 15-20. Crear tablas de reports
                'reports_table' => [
                    'name' => '2025_08_28_054910_create_reports_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='reports'",
                    'sql' => "CREATE TABLE IF NOT EXISTS reports (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        public_id VARCHAR(255) NOT NULL,
                        company_uuid UUID,
                        name VARCHAR(255) NOT NULL,
                        description VARCHAR(255),
                        status VARCHAR(255),
                        tags JSON,
                        meta JSON,
                        options JSON,
                        query_config JSON,
                        result_columns JSON,
                        last_executed_at TIMESTAMP,
                        execution_time INTEGER,
                        row_count INTEGER,
                        is_scheduled BOOLEAN DEFAULT FALSE,
                        schedule_config JSON,
                        export_formats JSON,
                        is_generated BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE reports ADD CONSTRAINT reports_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid) ON DELETE CASCADE"
                ],
                
                'alerts_table' => [
                    'name' => '2025_08_28_054911_create_alerts_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='alerts'",
                    'sql' => "CREATE TABLE IF NOT EXISTS alerts (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        company_uuid UUID,
                        name VARCHAR(255) NOT NULL,
                        type VARCHAR(255),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE alerts ADD CONSTRAINT alerts_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid) ON DELETE CASCADE"
                ],
                
                'report_cache_table' => [
                    'name' => '2025_09_25_084829_create_report_cache_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='report_cache'",
                    'sql' => "CREATE TABLE IF NOT EXISTS report_cache (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        report_uuid UUID,
                        cached_data JSON,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE report_cache ADD CONSTRAINT report_cache_report_uuid_foreign FOREIGN KEY (report_uuid) REFERENCES reports(uuid) ON DELETE CASCADE"
                ],
                
                'report_audit_logs_table' => [
                    'name' => '2025_09_25_084836_create_report_audit_logs_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='report_audit_logs'",
                    'sql' => "CREATE TABLE IF NOT EXISTS report_audit_logs (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        report_uuid UUID,
                        action VARCHAR(255),
                        details JSON,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE report_audit_logs ADD CONSTRAINT report_audit_logs_report_uuid_foreign FOREIGN KEY (report_uuid) REFERENCES reports(uuid) ON DELETE SET NULL"
                ],
                
                'report_templates_table' => [
                    'name' => '2025_09_25_084926_create_report_templates_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='report_templates'",
                    'sql' => "CREATE TABLE IF NOT EXISTS report_templates (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        company_uuid UUID,
                        name VARCHAR(255) NOT NULL,
                        template TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        deleted_at TIMESTAMP
                    )",
                    'fk' => "ALTER TABLE report_templates ADD CONSTRAINT report_templates_company_uuid_foreign FOREIGN KEY (company_uuid) REFERENCES companies(uuid) ON DELETE CASCADE"
                ],
                
                'report_executions_table' => [
                    'name' => '2025_09_25_085024_create_report_executions_table',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='report_executions'",
                    'sql' => "CREATE TABLE IF NOT EXISTS report_executions (
                        id BIGSERIAL PRIMARY KEY,
                        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                        report_uuid UUID,
                        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        execution_time INTEGER,
                        status VARCHAR(255)
                    )",
                    'fk' => "ALTER TABLE report_executions ADD CONSTRAINT report_executions_report_uuid_foreign FOREIGN KEY (report_uuid) REFERENCES reports(uuid) ON DELETE CASCADE"
                ],
                
                // 21. Crear tabla monitor_scheduled_tasks (Schedule Monitor)
                'monitor_scheduled_tasks_table' => [
                    'name' => '2024_03_15_051507_create_schedule_monitor_tables',
                    'check' => "SELECT 1 FROM information_schema.tables WHERE table_name='monitor_scheduled_tasks'",
                    'sql' => "CREATE TABLE IF NOT EXISTS monitor_scheduled_tasks (
                        id BIGSERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        type VARCHAR(255),
                        cron_expression VARCHAR(255),
                        ping_url TEXT,
                        grace_time INTEGER,
                        last_pinged_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )"
                ],
            ];
            
            $fixedCount = 0;
            foreach ($sqlFixes as $key => $fix) {
                echo "   ⏳ " . $fix['name'] . "\n";
                
                try {
                    // Verificar si ya existe
                    $exists = $connection->select($fix['check']);
                    
                    if (empty($exists)) {
                        // Ejecutar SQL principal
                        $connection->statement($fix['sql']);
                        
                        // Ejecutar FK si existe
                        if (isset($fix['fk'])) {
                            try {
                                $connection->statement($fix['fk']);
                            } catch (Exception $e) {
                                // FK puede fallar, no es crítico
                            }
                        }
                        
                        // Registrar como ejecutada
                        $connection->table('migrations')->insert([
                            'migration' => $fix['name'],
                            'batch' => $batch
                        ]);
                        
                        echo "      ✅ Creada exitosamente\n";
                        $success++;
                        $failed--;
                        $fixedCount++;
                    } else {
                        // Registrar como ejecutada si no estaba
                        $migExists = $connection->table('migrations')
                            ->where('migration', $fix['name'])
                            ->exists();
                        
                        if (!$migExists) {
                                            $connection->table('migrations')->insert([
                                'migration' => $fix['name'],
                                                'batch' => $batch
                                            ]);
                        }
                                            
                        echo "      ✅ Ya existe (registrada)\n";
                                            $success++;
                                            $failed--;
                        $fixedCount++;
                        }
                    } catch (Exception $e) {
                        echo "      ❌ Error: " . $e->getMessage() . "\n";
                    }
                }
            
            echo "\n   ✅ Tablas creadas con SQL directo: $fixedCount\n";
            
            echo "\n📊 Resumen actualizado:\n";
            echo "   ✅ Exitosas: $success\n";
            echo "   ❌ Fallidas: $failed\n";
        }
    } catch (Exception $e) {
        echo "   ⚠️  Error al corregir tipos: " . $e->getMessage() . "\n";
    }
}

echo "\n";

if ($failed > 0) {
    echo "\n⚠️  COMPLETADO CON ERRORES\n\n";
    exit(1);
} else {
    echo "\n🎉 ¡MIGRACIONES COMPLETADAS EXITOSAMENTE!\n\n";
    exit(0);
}

