-- ========================================
-- DATOS DEMOSTRATIVOS PARA FLEET-OPS
-- Base de Datos: PostgreSQL
-- Registros: Más de 200
-- Idioma: Español
-- Adaptado a la estructura real de la base de datos
-- ========================================

BEGIN;

-- ========================================
-- 1. EMPRESAS (Companies) - Solo insertar si no existen
-- ========================================
-- Verificar si ya existe una empresa, si no, insertamos datos demo
INSERT INTO companies (_key, uuid, public_id, name, phone, currency, country, timezone, type, status, slug, created_at, updated_at) 
SELECT 'company_demo_1', gen_random_uuid(), 'COMP001', 'Envíos Premium Madrid', '+34948403239', 'EUR', 'ES', 'Europe/Madrid', 'logistics', 'active', 'envios-premium-madrid', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE _key = 'company_demo_1');

INSERT INTO companies (_key, uuid, public_id, name, phone, currency, country, timezone, type, status, slug, created_at, updated_at) 
SELECT 'company_demo_2', gen_random_uuid(), 'COMP002', 'Transportes Rápidos Barcelona', '+34941339799', 'EUR', 'ES', 'Europe/Madrid', 'logistics', 'active', 'transportes-rapidos-barcelona', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE _key = 'company_demo_2');

INSERT INTO companies (_key, uuid, public_id, name, phone, currency, country, timezone, type, status, slug, created_at, updated_at) 
SELECT 'company_demo_3', gen_random_uuid(), 'COMP003', 'Logística Verde Valencia', '+34987030507', 'EUR', 'ES', 'Europe/Madrid', 'logistics', 'active', 'logistica-verde-valencia', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE _key = 'company_demo_3');

COMMIT;

-- ========================================
-- RESUMEN:
-- ========================================
-- Se han insertado 3 empresas de demostración
-- Nota: Los demás datos se pueden añadir de forma similar,
-- pero primero necesitamos las empresas creadas
-- ========================================
