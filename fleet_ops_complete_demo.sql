-- ========================================
-- DATOS DEMOSTRATIVOS COMPLETOS PARA FLEET-OPS
-- Base de Datos: PostgreSQL (Adaptado a estructura real)
-- Registros: Más de 250
-- Idioma: Español
-- ========================================

BEGIN;

-- Obtener UUIDs de las empresas demo existentes
DO $$
DECLARE
    company1_uuid UUID;
    company2_uuid UUID;
    company3_uuid UUID;
BEGIN
    SELECT uuid INTO company1_uuid FROM companies WHERE _key = 'company_demo_1' LIMIT 1;
    SELECT uuid INTO company2_uuid FROM companies WHERE _key = 'company_demo_2' LIMIT 1;
    SELECT uuid INTO company3_uuid FROM companies WHERE _key = 'company_demo_3' LIMIT 1;

    -- ========================================
    -- 1. LUGARES (Places) - 30 registros
    -- ========================================
    INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, location, latitude, longitude, phone, type, created_at, updated_at) VALUES
    ('place_demo_1', gen_random_uuid(), 'PLC001', company1_uuid, 'Almacén Central Madrid', 'Calle Alcalá 100', 'Madrid', '28009', 'ES', ST_SetSRID(ST_MakePoint(-3.706575, 40.443044), 4326)::geography, '40.443044', '-3.706575', '+34911111001', 'warehouse', NOW(), NOW()),
    ('place_demo_2', gen_random_uuid(), 'PLC002', company2_uuid, 'Centro Logístico Barcelona', 'Avenida Diagonal 250', 'Barcelona', '08007', 'ES', ST_SetSRID(ST_MakePoint(2.152963, 41.395206), 4326)::geography, '41.395206', '2.152963', '+34922222002', 'warehouse', NOW(), NOW()),
    ('place_demo_3', gen_random_uuid(), 'PLC003', company3_uuid, 'Almacén Valencia Sur', 'Calle Colón 30', 'Valencia', '46004', 'ES', ST_SetSRID(ST_MakePoint(-0.377125, 39.471179), 4326)::geography, '39.471179', '-0.377125', '+34933333003', 'warehouse', NOW(), NOW()),
    ('place_demo_4', gen_random_uuid(), 'PLC004', company1_uuid, 'Punto Entrega Sevilla', 'Calle Sierpes 45', 'Sevilla', '41004', 'ES', ST_SetSRID(ST_MakePoint(-5.993591, 37.391512), 4326)::geography, '37.391512', '-5.993591', '+34944444004', 'customer', NOW(), NOW()),
    ('place_demo_5', gen_random_uuid(), 'PLC005', company2_uuid, 'Cliente Bilbao Centro', 'Gran Vía 25', 'Bilbao', '48011', 'ES', ST_SetSRID(ST_MakePoint(-2.935010, 43.263012), 4326)::geography, '43.263012', '-2.935010', '+34955555005', 'customer', NOW(), NOW()),
    ('place_demo_6', gen_random_uuid(), 'PLC006', company3_uuid, 'Tienda Málaga', 'Calle Larios 10', 'Málaga', '29005', 'ES', ST_SetSRID(ST_MakePoint(-4.421034, 36.721261), 4326)::geography, '36.721261', '-4.421034', '+34966666006', 'customer', NOW(), NOW()),
    ('place_demo_7', gen_random_uuid(), 'PLC007', company1_uuid, 'Oficina Zaragoza', 'Paseo Independencia 15', 'Zaragoza', '50001', 'ES', ST_SetSRID(ST_MakePoint(-0.879421, 41.656250), 4326)::geography, '41.656250', '-0.879421', '+34977777007', 'customer', NOW(), NOW()),
    ('place_demo_8', gen_random_uuid(), 'PLC008', company2_uuid, 'Restaurante Palma', 'Paseo Marítimo 5', 'Palma', '07014', 'ES', ST_SetSRID(ST_MakePoint(2.635815, 39.579402), 4326)::geography, '39.579402', '2.635815', '+34988888008', 'customer', NOW(), NOW()),
    ('place_demo_9', gen_random_uuid(), 'PLC009', company3_uuid, 'Hotel Alicante', 'Explanada de España 20', 'Alicante', '03001', 'ES', ST_SetSRID(ST_MakePoint(-0.468095, 38.379946), 4326)::geography, '38.379946', '-0.468095', '+34999999009', 'customer', NOW(), NOW()),
    ('place_demo_10', gen_random_uuid(), 'PLC010', company1_uuid, 'Supermercado Granada', 'Calle Reyes Católicos 30', 'Granada', '18009', 'ES', ST_SetSRID(ST_MakePoint(-3.596863, 37.175829), 4326)::geography, '37.175829', '-3.596863', '+34910101010', 'customer', NOW(), NOW());

    -- ========================================
    -- 2. VEHÍCULOS (Vehicles) - 50 registros
    -- ========================================
    FOR i IN 1..50 LOOP
        INSERT INTO vehicles (_key, uuid, public_id, company_uuid, make, model, year, plate_number, vin, type, status, online, created_at, updated_at) VALUES
        ('vehicle_demo_' || i, gen_random_uuid(), 'VEH' || LPAD(i::TEXT, 3, '0'), 
         CASE WHEN i % 3 = 0 THEN company1_uuid WHEN i % 3 = 1 THEN company2_uuid ELSE company3_uuid END,
         CASE i % 5 WHEN 0 THEN 'Mercedes-Benz' WHEN 1 THEN 'Ford' WHEN 2 THEN 'Renault' WHEN 3 THEN 'Peugeot' ELSE 'Fiat' END,
         CASE i % 5 WHEN 0 THEN 'Sprinter' WHEN 1 THEN 'Transit' WHEN 2 THEN 'Master' WHEN 3 THEN 'Boxer' ELSE 'Ducato' END,
         (2018 + (i % 6))::TEXT,
         LPAD(i::TEXT, 4, '0') || 'ABC',
         'VF' || LPAD(i::TEXT, 14, '0'),
         'van', 'active', true, NOW(), NOW());
    END LOOP;

    -- ========================================
    -- 3. CONDUCTORES (Drivers) - 60 registros
    -- ========================================
    FOR i IN 1..60 LOOP
        INSERT INTO drivers (_key, uuid, public_id, company_uuid, drivers_license_number, location, latitude, longitude, online, status, created_at, updated_at) VALUES
        ('driver_demo_' || i, gen_random_uuid(), 'DRV' || LPAD(i::TEXT, 3, '0'),
         CASE WHEN i % 3 = 0 THEN company1_uuid WHEN i % 3 = 1 THEN company2_uuid ELSE company3_uuid END,
         'B-' || LPAD(i::TEXT, 8, '0'),
         ST_SetSRID(ST_MakePoint(-3.7 + (i * 0.05), 40.4 + (i * 0.02)), 4326)::geography,
         (40.4 + (i * 0.02))::TEXT,
         (-3.7 + (i * 0.05))::TEXT,
         CASE WHEN i % 2 = 0 THEN 1 ELSE 0 END,
         'active', NOW(), NOW());
    END LOOP;

    -- ========================================
    -- 4. FLOTAS (Fleets) - 15 registros
    -- ========================================
    INSERT INTO fleets (_key, uuid, public_id, company_uuid, name, status, created_at, updated_at) VALUES
    ('fleet_demo_1', gen_random_uuid(), 'FLT001', company1_uuid, 'Flota Madrid Norte', 'active', NOW(), NOW()),
    ('fleet_demo_2', gen_random_uuid(), 'FLT002', company1_uuid, 'Flota Madrid Sur', 'active', NOW(), NOW()),
    ('fleet_demo_3', gen_random_uuid(), 'FLT003', company1_uuid, 'Flota Madrid Centro', 'active', NOW(), NOW()),
    ('fleet_demo_4', gen_random_uuid(), 'FLT004', company1_uuid, 'Flota Express', 'active', NOW(), NOW()),
    ('fleet_demo_5', gen_random_uuid(), 'FLT005', company1_uuid, 'Flota Nocturna', 'active', NOW(), NOW()),
    ('fleet_demo_6', gen_random_uuid(), 'FLT006', company2_uuid, 'Flota Barcelona Este', 'active', NOW(), NOW()),
    ('fleet_demo_7', gen_random_uuid(), 'FLT007', company2_uuid, 'Flota Barcelona Oeste', 'active', NOW(), NOW()),
    ('fleet_demo_8', gen_random_uuid(), 'FLT008', company2_uuid, 'Flota Litoral', 'active', NOW(), NOW()),
    ('fleet_demo_9', gen_random_uuid(), 'FLT009', company2_uuid, 'Flota Metropolitana', 'active', NOW(), NOW()),
    ('fleet_demo_10', gen_random_uuid(), 'FLT010', company2_uuid, 'Flota Urgente', 'active', NOW(), NOW()),
    ('fleet_demo_11', gen_random_uuid(), 'FLT011', company3_uuid, 'Flota Valencia Ciudad', 'active', NOW(), NOW()),
    ('fleet_demo_12', gen_random_uuid(), 'FLT012', company3_uuid, 'Flota Valencia Puerto', 'active', NOW(), NOW()),
    ('fleet_demo_13', gen_random_uuid(), 'FLT013', company3_uuid, 'Flota Eco', 'active', NOW(), NOW()),
    ('fleet_demo_14', gen_random_uuid(), 'FLT014', company3_uuid, 'Flota Regional', 'active', NOW(), NOW()),
    ('fleet_demo_15', gen_random_uuid(), 'FLT015', company3_uuid, 'Flota Premium', 'active', NOW(), NOW());

    -- ========================================
    -- 5. RELACIONES FLOTA-CONDUCTORES (Fleet Drivers) - 60 registros
    -- ========================================
    FOR i IN 1..60 LOOP
        INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at)
        SELECT 
            'fleet_driver_' || i,
            gen_random_uuid(),
            (SELECT uuid FROM fleets WHERE _key = 'fleet_demo_' || ((i % 15) + 1) LIMIT 1),
            (SELECT uuid FROM drivers WHERE _key = 'driver_demo_' || i LIMIT 1),
            NOW(), NOW()
        WHERE EXISTS (SELECT 1 FROM fleets WHERE _key = 'fleet_demo_' || ((i % 15) + 1))
          AND EXISTS (SELECT 1 FROM drivers WHERE _key = 'driver_demo_' || i);
    END LOOP;

    -- ========================================
    -- 6. RELACIONES FLOTA-VEHÍCULOS (Fleet Vehicles) - 50 registros
    -- ========================================
    FOR i IN 1..50 LOOP
        INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at)
        SELECT 
            'fleet_vehicle_' || i,
            gen_random_uuid(),
            (SELECT uuid FROM fleets WHERE _key = 'fleet_demo_' || ((i % 15) + 1) LIMIT 1),
            (SELECT uuid FROM vehicles WHERE _key = 'vehicle_demo_' || i LIMIT 1),
            NOW(), NOW()
        WHERE EXISTS (SELECT 1 FROM fleets WHERE _key = 'fleet_demo_' || ((i % 15) + 1))
          AND EXISTS (SELECT 1 FROM vehicles WHERE _key = 'vehicle_demo_' || i);
    END LOOP;

    -- ========================================
    -- 7. REPORTES DE COMBUSTIBLE (Fuel Reports) - 30 registros
    -- ========================================
    FOR i IN 1..30 LOOP
        INSERT INTO fuel_reports (_key, uuid, public_id, company_uuid, driver_uuid, vehicle_uuid, report, location, odometer, amount, currency, volume, metric_unit, status, created_at, updated_at)
        SELECT 
            'fuel_report_' || i,
            gen_random_uuid(),
            'FR' || LPAD(i::TEXT, 3, '0'),
            CASE WHEN i % 3 = 0 THEN company1_uuid WHEN i % 3 = 1 THEN company2_uuid ELSE company3_uuid END,
            (SELECT uuid FROM drivers WHERE _key = 'driver_demo_' || ((i % 60) + 1) LIMIT 1),
            (SELECT uuid FROM vehicles WHERE _key = 'vehicle_demo_' || ((i % 50) + 1) LIMIT 1),
            'Repostaje ' || CASE i % 4 WHEN 0 THEN 'Shell' WHEN 1 THEN 'Repsol' WHEN 2 THEN 'Cepsa' ELSE 'BP' END || ' - ' || CASE i % 5 WHEN 0 THEN 'Madrid' WHEN 1 THEN 'Barcelona' WHEN 2 THEN 'Valencia' WHEN 3 THEN 'Sevilla' ELSE 'Bilbao' END,
            ST_SetSRID(ST_MakePoint(-3.7 + (i * 0.1), 40.4 + (i * 0.05)), 4326)::geography,
            (100000 + (i * 350))::TEXT,
            (50.00 + (i * 1.5))::TEXT,
            'EUR',
            (35.0 + (i * 1.0))::TEXT,
            'liters',
            'approved',
            NOW() - (i || ' days')::INTERVAL,
            NOW() - (i || ' days')::INTERVAL
        WHERE EXISTS (SELECT 1 FROM drivers WHERE _key = 'driver_demo_' || ((i % 60) + 1))
          AND EXISTS (SELECT 1 FROM vehicles WHERE _key = 'vehicle_demo_' || ((i % 50) + 1));
    END LOOP;

    -- ========================================
    -- 8. INCIDENCIAS (Issues) - 25 registros
    -- ========================================
    FOR i IN 1..25 LOOP
        INSERT INTO issues (_key, uuid, public_id, issue_id, company_uuid, driver_uuid, vehicle_uuid, location, type, category, report, priority, status, created_at, updated_at)
        SELECT 
            'issue_' || i,
            gen_random_uuid(),
            'ISS' || LPAD(i::TEXT, 3, '0'),
            'ISSUE-' || LPAD(i::TEXT, 3, '0'),
            CASE WHEN i % 3 = 0 THEN company1_uuid WHEN i % 3 = 1 THEN company2_uuid ELSE company3_uuid END,
            (SELECT uuid FROM drivers WHERE _key = 'driver_demo_' || ((i % 60) + 1) LIMIT 1),
            (SELECT uuid FROM vehicles WHERE _key = 'vehicle_demo_' || ((i % 50) + 1) LIMIT 1),
            ST_SetSRID(ST_MakePoint(-3.6 + (i * 0.08), 40.3 + (i * 0.04)), 4326)::geography,
            CASE i % 5 WHEN 0 THEN 'mechanical' WHEN 1 THEN 'electrical' WHEN 2 THEN 'tire' WHEN 3 THEN 'body' ELSE 'brake' END,
            CASE i % 5 WHEN 0 THEN 'engine' WHEN 1 THEN 'lights' WHEN 2 THEN 'wear' WHEN 3 THEN 'damage' ELSE 'maintenance' END,
            CASE i % 8 
                WHEN 0 THEN 'Motor hace ruido extraño al arrancar'
                WHEN 1 THEN 'Luz delantera intermitente'
                WHEN 2 THEN 'Neumáticos con desgaste'
                WHEN 3 THEN 'Raspadura en carrocería'
                WHEN 4 THEN 'Frenos requieren ajuste'
                WHEN 5 THEN 'Batería baja'
                WHEN 6 THEN 'Filtro de aire sucio'
                ELSE 'Revisión general necesaria'
            END,
            CASE i % 3 WHEN 0 THEN 'high' WHEN 1 THEN 'medium' ELSE 'low' END,
            CASE i % 4 WHEN 0 THEN 'open' WHEN 1 THEN 'in_progress' WHEN 2 THEN 'resolved' ELSE 'open' END,
            NOW() - (i || ' days')::INTERVAL,
            NOW() - ((i - 1) || ' days')::INTERVAL
        WHERE EXISTS (SELECT 1 FROM drivers WHERE _key = 'driver_demo_' || ((i % 60) + 1))
          AND EXISTS (SELECT 1 FROM vehicles WHERE _key = 'vehicle_demo_' || ((i % 50) + 1));
    END LOOP;

    RAISE NOTICE 'Datos demo insertados exitosamente!';
    RAISE NOTICE 'Lugares: 10';
    RAISE NOTICE 'Vehículos: 50';
    RAISE NOTICE 'Conductores: 60';
    RAISE NOTICE 'Flotas: 15';
    RAISE NOTICE 'Relaciones Flota-Conductores: 60';
    RAISE NOTICE 'Relaciones Flota-Vehículos: 50';
    RAISE NOTICE 'Reportes de Combustible: 30';
    RAISE NOTICE 'Incidencias: 25';
    RAISE NOTICE 'TOTAL: 300 registros';
END $$;

COMMIT;

-- ========================================
-- RESUMEN FINAL:
-- ========================================
-- Lugares: 10
-- Vehículos: 50
-- Conductores: 60
-- Flotas: 15
-- Relaciones Flota-Conductores: 60
-- Relaciones Flota-Vehículos: 50
-- Reportes de Combustible: 30
-- Incidencias: 25
-- ========================================
-- TOTAL: 300 REGISTROS (más empresas existentes)
-- ========================================
