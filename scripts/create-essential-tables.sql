-- Script SQL para crear las tablas esenciales de Fleetbase con PostgreSQL
-- Basado en las migraciones de Laravel

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Tabla migrations (ya debería existir)
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    migration VARCHAR(255) NOT NULL,
    batch INTEGER NOT NULL
);

-- Tabla users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    public_id UUID DEFAULT uuid_generate_v4(),
    company_uuid UUID,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP,
    phone VARCHAR(255),
    date_of_birth DATE,
    timezone VARCHAR(255) DEFAULT 'UTC',
    country VARCHAR(2),
    ip_address VARCHAR(45),
    password VARCHAR(255),
    remember_token VARCHAR(100),
    session_status VARCHAR(50) DEFAULT 'inactive',
    last_login TIMESTAMP,
    meta JSONB,
    slug VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS users_public_id_idx ON users(public_id);
CREATE INDEX IF NOT EXISTS users_company_uuid_idx ON users(company_uuid);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Tabla companies
CREATE TABLE IF NOT EXISTS companies (
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
    timezone VARCHAR(255) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    owner_uuid UUID,
    status VARCHAR(50) DEFAULT 'active',
    options JSONB,
    meta JSONB,
    slug VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS companies_public_id_idx ON companies(public_id);
CREATE INDEX IF NOT EXISTS companies_owner_uuid_idx ON companies(owner_uuid);

-- Tabla personal_access_tokens (Laravel Sanctum)
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
);

CREATE INDEX IF NOT EXISTS personal_access_tokens_tokenable_idx 
    ON personal_access_tokens(tokenable_type, tokenable_id);

-- Tabla permissions (Spatie)
CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    guard_name VARCHAR(255) NOT NULL DEFAULT 'web',
    service VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, guard_name)
);

-- Tabla roles (Spatie)
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    guard_name VARCHAR(255) NOT NULL DEFAULT 'web',
    company_uuid UUID,
    service VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla model_has_permissions (Spatie)
CREATE TABLE IF NOT EXISTS model_has_permissions (
    permission_id BIGINT NOT NULL,
    model_type VARCHAR(255) NOT NULL,
    model_uuid UUID NOT NULL,
    PRIMARY KEY (permission_id, model_uuid, model_type)
);

-- Tabla model_has_roles (Spatie)
CREATE TABLE IF NOT EXISTS model_has_roles (
    role_id BIGINT NOT NULL,
    model_type VARCHAR(255) NOT NULL,
    model_uuid UUID NOT NULL,
    PRIMARY KEY (role_id, model_uuid, model_type)
);

-- Tabla role_has_permissions (Spatie)
CREATE TABLE IF NOT EXISTS role_has_permissions (
    permission_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (permission_id, role_id)
);

-- Tabla failed_jobs
CREATE TABLE IF NOT EXISTS failed_jobs (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    connection TEXT NOT NULL,
    queue TEXT NOT NULL,
    payload TEXT NOT NULL,
    exception TEXT NOT NULL,
    failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(255) NOT NULL,
    notifiable_type VARCHAR(255) NOT NULL,
    notifiable_id BIGINT NOT NULL,
    data JSONB NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS notifications_notifiable_idx 
    ON notifications(notifiable_type, notifiable_id);

-- Insertar migración de creación de tablas
INSERT INTO migrations (migration, batch) VALUES 
    ('2023_04_25_094301_create_users_table', 1),
    ('2023_04_25_094305_create_companies_table', 1),
    ('2023_04_25_094304_create_permissions_table', 1),
    ('2023_09_04_091906_create_failed_jobs_table', 1),
    ('2023_10_18_080950_create_notifications_table', 1)
ON CONFLICT DO NOTHING;

-- Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE '✅ Tablas esenciales creadas exitosamente';
END
$$;

