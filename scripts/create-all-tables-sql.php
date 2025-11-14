<?php
/**
 * Script de fallback para crear todas las tablas con SQL directo (sin migraciones)
 * Se ejecuta cuando las migraciones de Laravel fallan
 */

set_time_limit(0);
ini_set('memory_limit', '-1');

echo "\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "🔧 CREANDO TABLAS CON SQL DIRECTO (FALLBACK)\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "\n";

chdir('/fleetbase/api');

// Leer variables de entorno
$envFile = '/fleetbase/api/.env';
$env = [];
foreach (file($envFile) as $line) {
    $line = trim($line);
    if ($line && strpos($line, '=') !== false && strpos($line, '#') !== 0) {
        list($k, $v) = explode('=', $line, 2);
        $env[trim($k)] = trim($v);
    }
}

try {
    $pdo = new PDO(
        'pgsql:host='.$env['DB_HOST'].';port='.$env['DB_PORT'].';dbname='.$env['DB_DATABASE'],
        $env['DB_USERNAME'],
        $env['DB_PASSWORD'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    echo "✅ Conexión exitosa a PostgreSQL\n\n";
    
    // Habilitar extensiones
    echo "🔌 Habilitando extensiones PostgreSQL...\n";
    $pdo->exec('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    $pdo->exec('CREATE EXTENSION IF NOT EXISTS "postgis"');
    echo "✅ Extensiones habilitadas\n\n";
    
    echo "📋 Creando tablas esenciales...\n";
    
    // Definir todas las tablas SQL
    $tables = [
        'migrations' => "
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                migration VARCHAR(255) NOT NULL,
                batch INTEGER NOT NULL
            )
        ",
        
        'companies' => "
            CREATE TABLE IF NOT EXISTS companies (
                id BIGSERIAL PRIMARY KEY,
                _key VARCHAR(255),
                uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                public_id VARCHAR(191) UNIQUE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                phone VARCHAR(255),
                email VARCHAR(255),
                currency VARCHAR(255),
                country VARCHAR(255),
                timezone VARCHAR(255),
                type VARCHAR(255),
                logo_url TEXT,
                backdrop_url TEXT,
                website_url TEXT,
                slug VARCHAR(255),
                place_uuid UUID,
                owner_uuid UUID,
                status VARCHAR(255) DEFAULT 'active',
                options JSON,
                meta JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP
            )
        ",
        
        'users' => "
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                _key VARCHAR(255),
                uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                public_id VARCHAR(191) UNIQUE,
                company_uuid UUID,
                avatar_url TEXT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                email_verified_at TIMESTAMP,
                phone VARCHAR(255),
                phone_verified_at TIMESTAMP,
                date_of_birth DATE,
                timezone VARCHAR(255),
                country VARCHAR(255),
                ip_address VARCHAR(255),
                password VARCHAR(255),
                slug VARCHAR(255),
                type VARCHAR(255),
                status VARCHAR(255) DEFAULT 'active',
                meta JSON,
                session_id VARCHAR(255),
                last_login TIMESTAMP,
                last_seen_at TIMESTAMP,
                remember_token VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP
            )
        ",
        
        'permissions' => "
            CREATE TABLE IF NOT EXISTS permissions (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                guard_name VARCHAR(255) NOT NULL DEFAULT 'web',
                service VARCHAR(255),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(name, guard_name)
            )
        ",
        
        'roles' => "
            CREATE TABLE IF NOT EXISTS roles (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                guard_name VARCHAR(255) NOT NULL DEFAULT 'web',
                company_uuid UUID,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP
            )
        ",
        
        'model_has_permissions' => "
            CREATE TABLE IF NOT EXISTS model_has_permissions (
                permission_id BIGINT NOT NULL,
                model_type VARCHAR(255) NOT NULL,
                model_uuid VARCHAR(255) NOT NULL,
                PRIMARY KEY (permission_id, model_uuid, model_type)
            )
        ",
        
        'model_has_roles' => "
            CREATE TABLE IF NOT EXISTS model_has_roles (
                role_id BIGINT NOT NULL,
                model_type VARCHAR(255) NOT NULL,
                model_uuid VARCHAR(255) NOT NULL,
                PRIMARY KEY (role_id, model_uuid, model_type)
            )
        ",
        
        'role_has_permissions' => "
            CREATE TABLE IF NOT EXISTS role_has_permissions (
                permission_id BIGINT NOT NULL,
                role_id BIGINT NOT NULL,
                PRIMARY KEY (permission_id, role_id)
            )
        ",
        
        'personal_access_tokens' => "
            CREATE TABLE IF NOT EXISTS personal_access_tokens (
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
        ",
        
        'files' => "
            CREATE TABLE IF NOT EXISTS files (
                id BIGSERIAL PRIMARY KEY,
                _key VARCHAR(255),
                uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                public_id VARCHAR(191) UNIQUE,
                company_uuid UUID,
                uploader_uuid UUID,
                name VARCHAR(255),
                original_filename VARCHAR(255),
                extension VARCHAR(255),
                content_type VARCHAR(255),
                path TEXT,
                bucket VARCHAR(255),
                disk VARCHAR(255) DEFAULT 'local',
                file_size BIGINT,
                type VARCHAR(255),
                caption TEXT,
                subject_uuid UUID,
                subject_type VARCHAR(255),
                meta JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP
            )
        ",
        
        'activity_log' => "
            CREATE TABLE IF NOT EXISTS activity_log (
                id BIGSERIAL PRIMARY KEY,
                log_name VARCHAR(255),
                description TEXT NOT NULL,
                subject_type VARCHAR(255),
                event VARCHAR(255),
                subject_id BIGINT,
                causer_type VARCHAR(255),
                causer_id BIGINT,
                properties JSON,
                batch_uuid UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ",
        
        'company_users' => "
            CREATE TABLE IF NOT EXISTS company_users (
                user_uuid UUID NOT NULL,
                company_uuid UUID NOT NULL,
                status VARCHAR(255),
                is_external BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP,
                PRIMARY KEY (user_uuid, company_uuid)
            )
        ",
        
        'groups' => "
            CREATE TABLE IF NOT EXISTS groups (
                id BIGSERIAL PRIMARY KEY,
                uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                public_id VARCHAR(191) UNIQUE,
                company_uuid UUID,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                slug VARCHAR(255),
                created_by_uuid UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP
            )
        ",
        
        'failed_jobs' => "
            CREATE TABLE IF NOT EXISTS failed_jobs (
                id BIGSERIAL PRIMARY KEY,
                uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
                connection TEXT NOT NULL,
                queue TEXT NOT NULL,
                payload TEXT NOT NULL,
                exception TEXT NOT NULL,
                failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ",
        
        'notifications' => "
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                type VARCHAR(255) NOT NULL,
                notifiable_type VARCHAR(255) NOT NULL,
                notifiable_id BIGINT NOT NULL,
                data JSON NOT NULL,
                read_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ",
    ];
    
    $created = 0;
    $errors = 0;
    
    foreach ($tables as $name => $sql) {
        try {
            $pdo->exec($sql);
            echo "   ✅ $name\n";
            $created++;
        } catch (Exception $e) {
            echo "   ❌ $name: " . $e->getMessage() . "\n";
            $errors++;
        }
    }
    
    echo "\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "📊 Resumen:\n";
    echo "   ✅ Creadas: $created\n";
    echo "   ❌ Errores: $errors\n";
    echo "   📊 Total: " . count($tables) . "\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "\n";
    
    if ($errors === 0) {
        echo "🎉 TODAS LAS TABLAS CREADAS EXITOSAMENTE\n\n";
        exit(0);
    } else {
        echo "⚠️  COMPLETADO CON ALGUNOS ERRORES\n\n";
        exit(1);
    }
    
} catch (Exception $e) {
    echo "❌ ERROR FATAL: " . $e->getMessage() . "\n";
    exit(1);
}

