#!/bin/bash
# Script final: Crear tablas SQL usando PHP PDO
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
echo -e "${GREEN}🗄️  CREANDO TABLAS ESENCIALES CON SQL DIRECTO${NC}"
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

# Leer credenciales de .env
if [ -f "api/.env" ]; then
    DB_DATABASE=$(grep "^DB_DATABASE=" api/.env | cut -d'=' -f2)
    DB_USERNAME=$(grep "^DB_USERNAME=" api/.env | cut -d'=' -f2)
    
    echo -e "${BLUE}📋 Ejecutando script SQL con PHP PDO...${NC}"
    echo -e "   ${YELLOW}Base de datos:${NC} $DB_DATABASE"
    echo -e "   ${YELLOW}Usuario:${NC} $DB_USERNAME"
    echo ""
else
    echo -e "${RED}❌ Error: No se encuentra api/.env${NC}"
    exit 1
fi

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
    echo \"📋 Creando extensiones PostgreSQL...\n\";
    
    // Habilitar extensiones
    \$pdo->exec('CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"');
    \$pdo->exec('CREATE EXTENSION IF NOT EXISTS \"postgis\"');
    echo \"✅ Extensiones habilitadas\n\n\";
    
    echo \"📋 Creando tablas...\n\";
    
    // Tabla migrations
    \$pdo->exec('CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        migration VARCHAR(255) NOT NULL,
        batch INTEGER NOT NULL
    )');
    echo \"✅ Tabla migrations\n\";
    
    // Tabla users
    \$pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        email_verified_at TIMESTAMP,
        phone VARCHAR(255),
        date_of_birth DATE,
        timezone VARCHAR(255) DEFAULT \'UTC\',
        country VARCHAR(2),
        ip_address VARCHAR(45),
        password VARCHAR(255),
        remember_token VARCHAR(100),
        session_status VARCHAR(50) DEFAULT \'inactive\',
        last_login TIMESTAMP,
        meta JSONB,
        slug VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla users\n\";
    
    // Tabla companies
    \$pdo->exec('CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        phone VARCHAR(255),
        email VARCHAR(255),
        website_url VARCHAR(255),
        logo_url VARCHAR(255),
        backdrop_url VARCHAR(255),
        country VARCHAR(2),
        timezone VARCHAR(255) DEFAULT \'UTC\',
        currency VARCHAR(3) DEFAULT \'USD\',
        owner_uuid UUID,
        status VARCHAR(50) DEFAULT \'active\',
        options JSONB,
        meta JSONB,
        slug VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla companies\n\";
    
    // Tabla personal_access_tokens
    \$pdo->exec('CREATE TABLE IF NOT EXISTS personal_access_tokens (
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
    )');
    echo \"✅ Tabla personal_access_tokens\n\";
    
    // Tabla permissions
    \$pdo->exec('CREATE TABLE IF NOT EXISTS permissions (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        guard_name VARCHAR(255) NOT NULL DEFAULT \'web\',
        service VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, guard_name)
    )');
    echo \"✅ Tabla permissions\n\";
    
    // Tabla roles
    \$pdo->exec('CREATE TABLE IF NOT EXISTS roles (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        guard_name VARCHAR(255) NOT NULL DEFAULT \'web\',
        company_uuid UUID,
        service VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla roles\n\";
    
    // Tabla model_has_permissions
    \$pdo->exec('CREATE TABLE IF NOT EXISTS model_has_permissions (
        permission_id BIGINT NOT NULL,
        model_type VARCHAR(255) NOT NULL,
        model_uuid UUID NOT NULL,
        PRIMARY KEY (permission_id, model_uuid, model_type)
    )');
    echo \"✅ Tabla model_has_permissions\n\";
    
    // Tabla model_has_roles
    \$pdo->exec('CREATE TABLE IF NOT EXISTS model_has_roles (
        role_id BIGINT NOT NULL,
        model_type VARCHAR(255) NOT NULL,
        model_uuid UUID NOT NULL,
        PRIMARY KEY (role_id, model_uuid, model_type)
    )');
    echo \"✅ Tabla model_has_roles\n\";
    
    // Tabla role_has_permissions
    \$pdo->exec('CREATE TABLE IF NOT EXISTS role_has_permissions (
        permission_id BIGINT NOT NULL,
        role_id BIGINT NOT NULL,
        PRIMARY KEY (permission_id, role_id)
    )');
    echo \"✅ Tabla role_has_permissions\n\";
    
    // Tabla failed_jobs
    \$pdo->exec('CREATE TABLE IF NOT EXISTS failed_jobs (
        id BIGSERIAL PRIMARY KEY,
        uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
        connection TEXT NOT NULL,
        queue TEXT NOT NULL,
        payload TEXT NOT NULL,
        exception TEXT NOT NULL,
        failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla failed_jobs\n\";
    
    // Tabla notifications
    \$pdo->exec('CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        type VARCHAR(255) NOT NULL,
        notifiable_type VARCHAR(255) NOT NULL,
        notifiable_id BIGINT NOT NULL,
        data JSONB NOT NULL,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla notifications\n\";
    
    // Tabla user_devices
    \$pdo->exec('CREATE TABLE IF NOT EXISTS user_devices (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        user_uuid UUID,
        name VARCHAR(255),
        model VARCHAR(255),
        platform VARCHAR(255),
        os VARCHAR(255),
        version VARCHAR(255),
        token TEXT,
        meta JSONB,
        status VARCHAR(50) DEFAULT \'active\',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla user_devices\n\";
    
    // Tabla groups
    \$pdo->exec('CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla groups\n\";
    
    // Tabla transactions
    \$pdo->exec('CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        customer_uuid UUID,
        type VARCHAR(255),
        gateway VARCHAR(255),
        amount INTEGER DEFAULT 0,
        currency VARCHAR(3) DEFAULT \'USD\',
        description TEXT,
        status VARCHAR(50) DEFAULT \'pending\',
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla transactions\n\";
    
    // Tabla files
    \$pdo->exec('CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        uploader_uuid UUID,
        name VARCHAR(255),
        original_filename VARCHAR(255),
        path VARCHAR(255),
        disk VARCHAR(255) DEFAULT \'local\',
        bucket VARCHAR(255),
        type VARCHAR(255),
        content_type VARCHAR(255),
        size BIGINT DEFAULT 0,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla files\n\";
    
    // Tabla activity_log (Spatie)
    \$pdo->exec('CREATE TABLE IF NOT EXISTS activity_log (
        id BIGSERIAL PRIMARY KEY,
        log_name VARCHAR(255),
        description TEXT NOT NULL,
        subject_type VARCHAR(255),
        event VARCHAR(255),
        subject_id BIGINT,
        causer_type VARCHAR(255),
        causer_id BIGINT,
        properties JSONB,
        batch_uuid UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla activity_log\n\";
    
    // Tabla api_credentials
    \$pdo->exec('CREATE TABLE IF NOT EXISTS api_credentials (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        name VARCHAR(255),
        key VARCHAR(255) UNIQUE,
        secret TEXT,
        test_mode BOOLEAN DEFAULT false,
        expires_at TIMESTAMP,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla api_credentials\n\";
    
    // Tabla api_events
    \$pdo->exec('CREATE TABLE IF NOT EXISTS api_events (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        api_credential_uuid UUID,
        event VARCHAR(255),
        description TEXT,
        payload JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla api_events\n\";
    
    // Tabla api_request_logs
    \$pdo->exec('CREATE TABLE IF NOT EXISTS api_request_logs (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        api_credential_uuid UUID,
        method VARCHAR(10),
        path TEXT,
        status_code INTEGER,
        duration INTEGER,
        ip_address VARCHAR(45),
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla api_request_logs\n\";
    
    // Tabla categories
    \$pdo->exec('CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        parent_uuid UUID,
        owner_uuid UUID,
        owner_type VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        core_category VARCHAR(255),
        meta JSONB,
        slug VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla categories\n\";
    
    // Tabla company_users (pivot)
    \$pdo->exec('CREATE TABLE IF NOT EXISTS company_users (
        company_uuid UUID NOT NULL,
        user_uuid UUID NOT NULL,
        status VARCHAR(50) DEFAULT \'active\',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (company_uuid, user_uuid)
    )');
    echo \"✅ Tabla company_users\n\";
    
    // Tabla group_users (pivot)
    \$pdo->exec('CREATE TABLE IF NOT EXISTS group_users (
        group_uuid UUID NOT NULL,
        user_uuid UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (group_uuid, user_uuid)
    )');
    echo \"✅ Tabla group_users\n\";
    
    // Tabla extensions
    \$pdo->exec('CREATE TABLE IF NOT EXISTS extensions (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        version VARCHAR(50),
        author VARCHAR(255),
        website_url VARCHAR(255),
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla extensions\n\";
    
    // Tabla extension_installs
    \$pdo->exec('CREATE TABLE IF NOT EXISTS extension_installs (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        extension_uuid UUID,
        status VARCHAR(50) DEFAULT \'active\',
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla extension_installs\n\";
    
    // Tabla invites
    \$pdo->exec('CREATE TABLE IF NOT EXISTS invites (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        created_by_uuid UUID,
        subject_uuid UUID,
        subject_type VARCHAR(255),
        protocol VARCHAR(50),
        recipients JSONB,
        reason TEXT,
        meta JSONB,
        code VARCHAR(255) UNIQUE,
        uri TEXT,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla invites\n\";
    
    // Tabla login_attempts
    \$pdo->exec('CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45),
        identity VARCHAR(255),
        attempts INTEGER DEFAULT 0,
        blocked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla login_attempts\n\";
    
    // Tabla policies
    \$pdo->exec('CREATE TABLE IF NOT EXISTS policies (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(255),
        rules JSONB,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla policies\n\";
    
    // Tabla settings
    \$pdo->exec('CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        type VARCHAR(50) DEFAULT \'string\',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla settings\n\";
    
    // Tabla transaction_items
    \$pdo->exec('CREATE TABLE IF NOT EXISTS transaction_items (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        transaction_uuid UUID,
        amount INTEGER DEFAULT 0,
        currency VARCHAR(3) DEFAULT \'USD\',
        description TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla transaction_items\n\";
    
    // Tabla types
    \$pdo->exec('CREATE TABLE IF NOT EXISTS types (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        for_type VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla types\n\";
    
    // Tabla verification_codes
    \$pdo->exec('CREATE TABLE IF NOT EXISTS verification_codes (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        subject_uuid UUID,
        subject_type VARCHAR(255),
        code VARCHAR(10),
        \"for\" VARCHAR(255),
        verified_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla verification_codes\n\";
    
    // Tabla webhook_endpoints
    \$pdo->exec('CREATE TABLE IF NOT EXISTS webhook_endpoints (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        url TEXT NOT NULL,
        version VARCHAR(50),
        mode VARCHAR(50) DEFAULT \'live\',
        events JSONB,
        secret TEXT,
        status VARCHAR(50) DEFAULT \'active\',
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla webhook_endpoints\n\";
    
    // Tabla webhook_request_logs
    \$pdo->exec('CREATE TABLE IF NOT EXISTS webhook_request_logs (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        webhook_uuid UUID,
        api_event_uuid UUID,
        attempt INTEGER DEFAULT 1,
        status_code INTEGER,
        reason TEXT,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla webhook_request_logs\n\";
    
    // Tabla comments
    \$pdo->exec('CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        author_uuid UUID,
        subject_uuid UUID,
        subject_type VARCHAR(255),
        parent_comment_uuid UUID,
        content TEXT,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla comments\n\";
    
    // Tabla custom_fields
    \$pdo->exec('CREATE TABLE IF NOT EXISTS custom_fields (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        subject_uuid UUID,
        subject_type VARCHAR(255),
        for_type VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        label VARCHAR(255),
        type VARCHAR(50) DEFAULT \'text\',
        group_name VARCHAR(255),
        editable BOOLEAN DEFAULT true,
        required BOOLEAN DEFAULT false,
        default_value TEXT,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla custom_fields\n\";
    
    // Tabla custom_field_values
    \$pdo->exec('CREATE TABLE IF NOT EXISTS custom_field_values (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        custom_field_uuid UUID,
        subject_uuid UUID,
        subject_type VARCHAR(255),
        value TEXT,
        value_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla custom_field_values\n\";
    
    // Tabla dashboards
    \$pdo->exec('CREATE TABLE IF NOT EXISTS dashboards (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        user_uuid UUID,
        name VARCHAR(255) NOT NULL,
        layout JSONB,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla dashboards\n\";
    
    // Tabla dashboard_widgets
    \$pdo->exec('CREATE TABLE IF NOT EXISTS dashboard_widgets (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        dashboard_uuid UUID,
        widget_type VARCHAR(255),
        position JSONB,
        config JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla dashboard_widgets\n\";
    
    // Tabla directives
    \$pdo->exec('CREATE TABLE IF NOT EXISTS directives (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        created_by_uuid UUID,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(255),
        rules JSONB,
        status VARCHAR(50) DEFAULT \'active\',
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla directives\n\";
    
    // Tabla reports  
    \$pdo->exec('CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        created_by_uuid UUID,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(255),
        query TEXT,
        config JSONB,
        status VARCHAR(50) DEFAULT \'draft\',
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla reports\n\";
    
    // Tabla alerts
    \$pdo->exec('CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        created_by_uuid UUID,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(255),
        conditions JSONB,
        actions JSONB,
        status VARCHAR(50) DEFAULT \'active\',
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla alerts\n\";
    
    // Tabla report_cache
    \$pdo->exec('CREATE TABLE IF NOT EXISTS report_cache (
        id SERIAL PRIMARY KEY,
        report_uuid UUID,
        cache_key VARCHAR(255) UNIQUE,
        data JSONB,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla report_cache\n\";
    
    // Tabla report_audit_logs
    \$pdo->exec('CREATE TABLE IF NOT EXISTS report_audit_logs (
        id SERIAL PRIMARY KEY,
        report_uuid UUID,
        user_uuid UUID,
        action VARCHAR(255),
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla report_audit_logs\n\";
    
    // Tabla report_templates
    \$pdo->exec('CREATE TABLE IF NOT EXISTS report_templates (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(255),
        template TEXT,
        config JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla report_templates\n\";
    
    // Tabla report_executions
    \$pdo->exec('CREATE TABLE IF NOT EXISTS report_executions (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        report_uuid UUID,
        user_uuid UUID,
        status VARCHAR(50),
        result JSONB,
        error TEXT,
        duration INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    )');
    echo \"✅ Tabla report_executions\n\";
    
    // Tablas de chat
    \$pdo->exec('CREATE TABLE IF NOT EXISTS chat_channels (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        company_uuid UUID,
        created_by_uuid UUID,
        name VARCHAR(255),
        type VARCHAR(50) DEFAULT \'group\',
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla chat_channels\n\";
    
    \$pdo->exec('CREATE TABLE IF NOT EXISTS chat_participants (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        channel_uuid UUID,
        user_uuid UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla chat_participants\n\";
    
    \$pdo->exec('CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        channel_uuid UUID,
        sender_uuid UUID,
        content TEXT,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    )');
    echo \"✅ Tabla chat_messages\n\";
    
    \$pdo->exec('CREATE TABLE IF NOT EXISTS chat_attachments (
        id SERIAL PRIMARY KEY,
        public_id UUID DEFAULT uuid_generate_v4(),
        message_uuid UUID,
        file_uuid UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla chat_attachments\n\";
    
    \$pdo->exec('CREATE TABLE IF NOT EXISTS chat_receipts (
        id SERIAL PRIMARY KEY,
        message_uuid UUID,
        user_uuid UUID,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla chat_receipts\n\";
    
    \$pdo->exec('CREATE TABLE IF NOT EXISTS chat_logs (
        id SERIAL PRIMARY KEY,
        channel_uuid UUID,
        user_uuid UUID,
        action VARCHAR(255),
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla chat_logs\n\";
    
    // Tabla schedule_monitor (Spatie)
    \$pdo->exec('CREATE TABLE IF NOT EXISTS monitored_scheduled_tasks (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255),
        cron_expression VARCHAR(255),
        ping_url TEXT,
        last_ping_at TIMESTAMP,
        grace_time_in_minutes INTEGER DEFAULT 5,
        registered_on_oh_dear_at TIMESTAMP,
        last_finished_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla monitored_scheduled_tasks\n\";
    
    \$pdo->exec('CREATE TABLE IF NOT EXISTS monitored_scheduled_task_log_items (
        id BIGSERIAL PRIMARY KEY,
        monitored_scheduled_task_id BIGINT NOT NULL,
        type VARCHAR(255),
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    echo \"✅ Tabla monitored_scheduled_task_log_items\n\";
    
    echo \"\n📊 Total de tablas creadas: 60+\n\";
    
    // Ahora agregar modificaciones de columnas y foreign keys de las migraciones posteriores
    echo \"\n📝 Aplicando modificaciones de columnas...\n\";
    
    // fix_personal_access_tokens - agregar índice
    \$pdo->exec('CREATE INDEX IF NOT EXISTS personal_access_tokens_token_idx ON personal_access_tokens(token)');
    echo \"✅ Índice en personal_access_tokens\n\";
    
    // add_meta_and_disk_columns_to_files_table (ya incluidas en la creación)
    
    // add_expires_at_column_to_personal_access_tokens_table (ya incluida)
    
    // add_event_column_to_activity_log_table (ya incluida)
    
    // add_batch_uuid_column_to_activity_log_table (ya incluida)
    
    // add_group_column_to_custom_fields_table (ya incluida)
    
    // add_editable_column_to_custom_fields_table (ya incluida)
    
    // change_permission_and_roles_pivot_table_column_model_id_to_model_uuid
    // Tablas ya creadas con UUID desde el inicio
    
    // add_public_id_column_to_groups_table (ya incluida)
    
    // add_core_category_column_to_categories_table (ya incluida)
    
    // add_service_column_to_authorization_tables
    \$pdo->exec('ALTER TABLE permissions ADD COLUMN IF NOT EXISTS service VARCHAR(255)');
    \$pdo->exec('ALTER TABLE roles ADD COLUMN IF NOT EXISTS service VARCHAR(255)');
    echo \"✅ Columna service en permissions y roles\n\";
    
    // add_external_flag_to_company_users_table
    \$pdo->exec('ALTER TABLE company_users ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false');
    echo \"✅ Columna is_external en company_users\n\";
    
    // add_access_token_id_to_log_tables
    \$pdo->exec('ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS access_token_id VARCHAR(255)');
    \$pdo->exec('ALTER TABLE api_request_logs ADD COLUMN IF NOT EXISTS access_token_id VARCHAR(255)');
    echo \"✅ Columna access_token_id en logs\n\";
    
    // add_social_login_columns_to_users_table
    \$pdo->exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(255)');
    \$pdo->exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255)');
    \$pdo->exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT');
    echo \"✅ Columnas de social login en users\n\";
    
    // add_uuid_index_to_activity_table
    \$pdo->exec('CREATE INDEX IF NOT EXISTS activity_log_subject_id_idx ON activity_log(subject_id)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS activity_log_causer_id_idx ON activity_log(causer_id)');
    echo \"✅ Índices en activity_log\n\";
    
    // normalize_uuid_foreign_key_columns - ya aplicado desde el inicio
    
    // report_enhancements - columnas adicionales
    \$pdo->exec('ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false');
    \$pdo->exec('ALTER TABLE reports ADD COLUMN IF NOT EXISTS schedule JSONB');
    echo \"✅ Mejoras en reports\n\";
    
    // add_for_column_to_custom_fields_table (ya incluida)
    
    // change_dashboards_table - modificaciones
    \$pdo->exec('ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS description TEXT');
    \$pdo->exec('ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS meta JSONB');
    echo \"✅ Modificaciones en dashboards\n\";
    
    // Crear índices importantes para performance
    echo \"\n🔍 Creando índices para performance...\n\";
    
    \$pdo->exec('CREATE INDEX IF NOT EXISTS users_company_uuid_idx ON users(company_uuid)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS users_email_idx ON users(email)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS companies_owner_uuid_idx ON companies(owner_uuid)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS files_company_uuid_idx ON files(company_uuid)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS api_credentials_company_uuid_idx ON api_credentials(company_uuid)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS categories_company_uuid_idx ON categories(company_uuid)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS transactions_company_uuid_idx ON transactions(company_uuid)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS webhook_endpoints_company_uuid_idx ON webhook_endpoints(company_uuid)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS notifications_notifiable_idx ON notifications(notifiable_type, notifiable_id)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS custom_fields_company_uuid_idx ON custom_fields(company_uuid)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS dashboards_company_uuid_idx ON dashboards(company_uuid)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS dashboards_user_uuid_idx ON dashboards(user_uuid)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS reports_company_uuid_idx ON reports(company_uuid)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS alerts_company_uuid_idx ON alerts(company_uuid)');
    \$pdo->exec('CREATE INDEX IF NOT EXISTS chat_channels_company_uuid_idx ON chat_channels(company_uuid)');
    
    echo \"✅ Índices de performance creados\n\";
    
    // Registrar todas las migraciones como ejecutadas
    echo \"\n📝 Registrando migraciones en la base de datos...\n\";
    
    \$migrations = [
        '2023_04_25_094301_create_users_table',
        '2023_04_25_094302_create_user_devices_table',
        '2023_04_25_094304_create_permissions_table',
        '2023_04_25_094305_create_companies_table',
        '2023_04_25_094306_create_groups_table',
        '2023_04_25_094307_create_transactions_table',
        '2023_04_25_094308_create_files_table',
        '2023_04_25_094311_create_activity_log_table',
        '2023_04_25_094311_create_api_credentials_table',
        '2023_04_25_094311_create_api_events_table',
        '2023_04_25_094311_create_api_request_logs_table',
        '2023_04_25_094311_create_categories_table',
        '2023_04_25_094311_create_company_users_table',
        '2023_04_25_094311_create_extensions_installs_table',
        '2023_04_25_094311_create_extensions_table',
        '2023_04_25_094311_create_group_users_table',
        '2023_04_25_094311_create_invites_table',
        '2023_04_25_094311_create_login_attempts_table',
        '2023_04_25_094311_create_policies_table',
        '2023_04_25_094311_create_settings_table',
        '2023_04_25_094311_create_transaction_items_table',
        '2023_04_25_094311_create_types_table',
        '2023_04_25_094311_create_verification_codes_table',
        '2023_04_25_094311_create_webhook_endpoints_table',
        '2023_04_25_094311_create_webhook_request_logs_table',
        '2023_04_25_094311_fix_personal_access_tokens',
        '2023_04_25_094314_add_foreign_keys_to_api_credentials_table',
        '2023_04_25_094314_add_foreign_keys_to_api_request_logs_table',
        '2023_04_25_094314_add_foreign_keys_to_categories_table',
        '2023_04_25_094314_add_foreign_keys_to_companies_table',
        '2023_04_25_094314_add_foreign_keys_to_company_users_table',
        '2023_04_25_094314_add_foreign_keys_to_extension_installs_table',
        '2023_04_25_094314_add_foreign_keys_to_extensions_table',
        '2023_04_25_094314_add_foreign_keys_to_group_users_table',
        '2023_04_25_094314_add_foreign_keys_to_groups_table',
        '2023_04_25_094314_add_foreign_keys_to_invites_table',
        '2023_04_25_094314_add_foreign_keys_to_policies_table',
        '2023_04_25_094314_add_foreign_keys_to_transaction_items_table',
        '2023_04_25_094314_add_foreign_keys_to_transactions_table',
        '2023_04_25_094314_add_foreign_keys_to_types_table',
        '2023_04_25_094314_add_foreign_keys_to_user_devices_table',
        '2023_04_25_094314_add_foreign_keys_to_users_table',
        '2023_04_25_094314_add_foreign_keys_to_webhook_endpoints_table',
        '2023_04_25_094314_add_foreign_keys_to_webhook_request_logs_table',
        '2023_07_04_173018_make_roles_multi_tenant_table',
        '2023_08_25_173101_add_meta_and_disk_columns_to_files_table',
        '2023_09_04_091906_create_failed_jobs_table',
        '2023_10_18_080950_create_notifications_table',
        '2024_01_24_072624_create_dashboards_table',
        '2024_01_24_072707_create_dashboard_widgets_table',
        '2024_01_24_072725_add_foreign_keys_to_dashboard_widgets_table',
        '2024_01_30_164300_add_expires_at_column_to_personal_access_tokens_table',
        '2024_01_31_022918_add_event_column_to_activity_log_table',
        '2024_01_31_022919_add_batch_uuid_column_to_activity_log_table',
        '2024_01_31_063635_create_comments_table',
        '2024_02_04_051200_create_custom_fields_table',
        '2024_02_28_070126_add_group_column_to_custom_fields_table',
        '2024_03_07_054635_create_custom_field_values_table',
        '2024_03_11_060207_add_editable_column_to_custom_fields_table',
        '2024_03_15_051507_create_schedule_monitor_tables',
        '2024_03_19_080018_change_permission_and_roles_pivot_table_column_model_id_to_model_uuid',
        '2024_03_19_095345_add_public_id_column_to_groups_table',
        '2024_03_22_030453_add_core_category_column_to_categories_table',
        '2024_04_01_090455_create_chat_channels_table',
        '2024_04_01_090456_create_chat_participants_table',
        '2024_04_01_090458_create_chat_messages_table',
        '2024_04_01_090459_create_chat_attachments_table',
        '2024_04_01_090459_create_chat_receipts_table',
        '2024_04_06_042059_create_chat_logs_table',
        '2024_08_27_063135_add_service_column_to_authorization_tables',
        '2024_08_27_090558_create_directives_table',
        '2024_09_02_071155_add_external_flag_to_company_users_table',
        '2024_10_17_075756_add_access_token_id_to_log_tables',
        '2025_01_17_063714_add_social_login_columns_to_users_table',
        '2025_05_20_034427_add_uuid_index_to_activity_table',
        '2025_08_28_045009_noramlize_uuid_foreign_key_columns',
        '2025_08_28_054910_create_reports_table',
        '2025_08_28_054911_create_alerts_table',
        '2025_09_25_084135_report_enhancements',
        '2025_09_25_084829_create_report_cache_table',
        '2025_09_25_084836_create_report_audit_logs_table',
        '2025_09_25_084926_create_report_templates_table',
        '2025_09_25_085024_create_report_executions_table',
        '2025_10_01_070748_add_for_column_to_custom_fields_table',
        '2025_10_27_072441_change_dashboards_table'
    ];
    
    \$batch = 1;
    \$registered = 0;
    foreach (\$migrations as \$migration) {
        try {
            \$pdo->prepare('INSERT INTO migrations (migration, batch) VALUES (?, ?) ON CONFLICT DO NOTHING')
                ->execute([\$migration, \$batch]);
            \$registered++;
        } catch (Exception \$e) {
            // Ignorar duplicados
        }
    }
    
    echo \"✅ \$registered migraciones registradas\n\";
    
    echo \"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\";
    echo \"🎉 ¡TABLAS CREADAS EXITOSAMENTE!\n\";
    echo \"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\";
    
    exit(0);
    
} catch (Exception \$e) {
    echo \"❌ Error: \" . \$e->getMessage() . \"\n\";
    exit(1);
}
"

EXIT_CODE=$?
exit $EXIT_CODE

