-- ========================================
-- DATOS DEMOSTRATIVOS PARA FLEET-OPS
-- Para la compañía CREAI
-- Base de Datos: PostgreSQL
-- Idioma: Español
-- ========================================

BEGIN;

DO $$
DECLARE
    creai_uuid UUID := '95aacd23-5533-4805-815f-9775535c7eba';
BEGIN
    -- ========================================
    -- 1. LUGARES (Places) - 30 registros
    -- ========================================
    INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, location, latitude, longitude, phone, type, created_at, updated_at) VALUES
    ('place_creai_1', gen_random_uuid(), 'PLCC01', creai_uuid, 'Almacén Central Madrid', 'Calle Alcalá 100', 'Madrid', '28009', 'ES', ST_SetSRID(ST_MakePoint(-3.706575, 40.443044), 4326)::geography, '40.443044', '-3.706575', '+34911111001', 'warehouse', NOW(), NOW()),
    ('place_creai_2', gen_random_uuid(), 'PLCC02', creai_uuid, 'Centro Logístico Barcelona', 'Avenida Diagonal 250', 'Barcelona', '08007', 'ES', ST_SetSRID(ST_MakePoint(2.152963, 41.395206), 4326)::geography, '41.395206', '2.152963', '+34922222002', 'warehouse', NOW(), NOW()),
    ('place_creai_3', gen_random_uuid(), 'PLCC03', creai_uuid, 'Almacén Valencia Sur', 'Calle Colón 30', 'Valencia', '46004', 'ES', ST_SetSRID(ST_MakePoint(-0.377125, 39.471179), 4326)::geography, '39.471179', '-0.377125', '+34933333003', 'warehouse', NOW(), NOW()),
    ('place_creai_4', gen_random_uuid(), 'PLCC04', creai_uuid, 'Cliente Sevilla Centro', 'Calle Sierpes 45', 'Sevilla', '41004', 'ES', ST_SetSRID(ST_MakePoint(-5.993591, 37.391512), 4326)::geography, '37.391512', '-5.993591', '+34944444004', 'customer', NOW(), NOW()),
    ('place_creai_5', gen_random_uuid(), 'PLCC05', creai_uuid, 'Cliente Bilbao', 'Gran Vía 25', 'Bilbao', '48011', 'ES', ST_SetSRID(ST_MakePoint(-2.935010, 43.263012), 4326)::geography, '43.263012', '-2.935010', '+34955555005', 'customer', NOW(), NOW()),
    ('place_creai_6', gen_random_uuid(), 'PLCC06', creai_uuid, 'Tienda Málaga', 'Calle Larios 10', 'Málaga', '29005', 'ES', ST_SetSRID(ST_MakePoint(-4.421034, 36.721261), 4326)::geography, '36.721261', '-4.421034', '+34966666006', 'customer', NOW(), NOW()),
    ('place_creai_7', gen_random_uuid(), 'PLCC07', creai_uuid, 'Oficina Zaragoza', 'Paseo Independencia 15', 'Zaragoza', '50001', 'ES', ST_SetSRID(ST_MakePoint(-0.879421, 41.656250), 4326)::geography, '41.656250', '-0.879421', '+34977777007', 'customer', NOW(), NOW()),
    ('place_creai_8', gen_random_uuid(), 'PLCC08', creai_uuid, 'Restaurante Palma', 'Paseo Marítimo 5', 'Palma', '07014', 'ES', ST_SetSRID(ST_MakePoint(2.635815, 39.579402), 4326)::geography, '39.579402', '2.635815', '+34988888008', 'customer', NOW(), NOW()),
    ('place_creai_9', gen_random_uuid(), 'PLCC09', creai_uuid, 'Hotel Alicante', 'Explanada de España 20', 'Alicante', '03001', 'ES', ST_SetSRID(ST_MakePoint(-0.468095, 38.379946), 4326)::geography, '38.379946', '-0.468095', '+34999999009', 'customer', NOW(), NOW()),
    ('place_creai_10', gen_random_uuid(), 'PLCC10', creai_uuid, 'Supermercado Granada', 'Calle Reyes Católicos 30', 'Granada', '18009', 'ES', ST_SetSRID(ST_MakePoint(-3.596863, 37.175829), 4326)::geography, '37.175829', '-3.596863', '+34910101010', 'customer', NOW(), NOW());

    -- ========================================
    -- 2. VEHÍCULOS (Vehicles) - 30 registros
    -- ========================================
    FOR i IN 1..30 LOOP
        INSERT INTO vehicles (_key, uuid, public_id, company_uuid, make, model, year, plate_number, vin, type, status, online, created_at, updated_at) VALUES
        ('vehicle_creai_' || i, gen_random_uuid(), 'VEHC' || LPAD(i::TEXT, 3, '0'), creai_uuid,
         CASE i % 5 WHEN 0 THEN 'Mercedes-Benz' WHEN 1 THEN 'Ford' WHEN 2 THEN 'Renault' WHEN 3 THEN 'Peugeot' ELSE 'Fiat' END,
         CASE i % 5 WHEN 0 THEN 'Sprinter' WHEN 1 THEN 'Transit' WHEN 2 THEN 'Master' WHEN 3 THEN 'Boxer' ELSE 'Ducato' END,
         (2019 + (i % 5))::TEXT,
         LPAD(i::TEXT, 4, '0') || 'XYZ',
         'VF' || LPAD(i::TEXT, 14, '0'),
         'van', 'active', i % 2 = 0, NOW(), NOW());
    END LOOP;

    -- ========================================
    -- 3. CONDUCTORES (Drivers) - 40 registros
    -- ========================================
    FOR i IN 1..40 LOOP
        INSERT INTO drivers (_key, uuid, public_id, company_uuid, drivers_license_number, location, latitude, longitude, online, status, created_at, updated_at) VALUES
        ('driver_creai_' || i, gen_random_uuid(), 'DRVC' || LPAD(i::TEXT, 3, '0'), creai_uuid,
         'B-' || LPAD(i::TEXT, 8, '0'),
         ST_SetSRID(ST_MakePoint(-3.7 + (i * 0.03), 40.4 + (i * 0.015)), 4326)::geography,
         (40.4 + (i * 0.015))::TEXT,
         (-3.7 + (i * 0.03))::TEXT,
         CASE WHEN i % 2 = 0 THEN 1 ELSE 0 END,
         'active', NOW(), NOW());
    END LOOP;

    -- ========================================
    -- 4. FLOTAS (Fleets) - 10 registros
    -- ========================================
    INSERT INTO fleets (_key, uuid, public_id, company_uuid, name, status, created_at, updated_at) VALUES
    ('fleet_creai_1', gen_random_uuid(), 'FLTC001', creai_uuid, 'Flota Madrid', 'active', NOW(), NOW()),
    ('fleet_creai_2', gen_random_uuid(), 'FLTC002', creai_uuid, 'Flota Barcelona', 'active', NOW(), NOW()),
    ('fleet_creai_3', gen_random_uuid(), 'FLTC003', creai_uuid, 'Flota Valencia', 'active', NOW(), NOW()),
    ('fleet_creai_4', gen_random_uuid(), 'FLTC004', creai_uuid, 'Flota Express', 'active', NOW(), NOW()),
    ('fleet_creai_5', gen_random_uuid(), 'FLTC005', creai_uuid, 'Flota Nocturna', 'active', NOW(), NOW()),
    ('fleet_creai_6', gen_random_uuid(), 'FLTC006', creai_uuid, 'Flota Sur', 'active', NOW(), NOW()),
    ('fleet_creai_7', gen_random_uuid(), 'FLTC007', creai_uuid, 'Flota Norte', 'active', NOW(), NOW()),
    ('fleet_creai_8', gen_random_uuid(), 'FLTC008', creai_uuid, 'Flota Este', 'active', NOW(), NOW()),
    ('fleet_creai_9', gen_random_uuid(), 'FLTC009', creai_uuid, 'Flota Oeste', 'active', NOW(), NOW()),
    ('fleet_creai_10', gen_random_uuid(), 'FLTC010', creai_uuid, 'Flota Premium', 'active', NOW(), NOW());

    -- ========================================
    -- 5. RELACIONES FLOTA-CONDUCTORES (40 registros)
    -- ========================================
    FOR i IN 1..40 LOOP
        INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at)
        SELECT 
            'fleet_driver_creai_' || i,
            gen_random_uuid(),
            (SELECT uuid FROM fleets WHERE _key = 'fleet_creai_' || ((i % 10) + 1) LIMIT 1),
            (SELECT uuid FROM drivers WHERE _key = 'driver_creai_' || i LIMIT 1),
            NOW(), NOW()
        WHERE EXISTS (SELECT 1 FROM fleets WHERE _key = 'fleet_creai_' || ((i % 10) + 1))
          AND EXISTS (SELECT 1 FROM drivers WHERE _key = 'driver_creai_' || i);
    END LOOP;

    -- ========================================
    -- 6. RELACIONES FLOTA-VEHÍCULOS (30 registros)
    -- ========================================
    FOR i IN 1..30 LOOP
        INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at)
        SELECT 
            'fleet_vehicle_creai_' || i,
            gen_random_uuid(),
            (SELECT uuid FROM fleets WHERE _key = 'fleet_creai_' || ((i % 10) + 1) LIMIT 1),
            (SELECT uuid FROM vehicles WHERE _key = 'vehicle_creai_' || i LIMIT 1),
            NOW(), NOW()
        WHERE EXISTS (SELECT 1 FROM fleets WHERE _key = 'fleet_creai_' || ((i % 10) + 1))
          AND EXISTS (SELECT 1 FROM vehicles WHERE _key = 'vehicle_creai_' || i);
    END LOOP;

    -- ========================================
    -- 7. REPORTES DE COMBUSTIBLE (50 registros)
    -- NOTA: amount debe ser VARCHAR según la base de datos
    -- ========================================
    FOR i IN 1..50 LOOP
        INSERT INTO fuel_reports (_key, uuid, public_id, company_uuid, driver_uuid, vehicle_uuid, report, location, odometer, amount, currency, volume, metric_unit, status, created_at, updated_at)
        SELECT 
            'fuel_report_creai_' || i,
            gen_random_uuid(),
            'FRC' || LPAD(i::TEXT, 3, '0'),
            creai_uuid,
            (SELECT uuid FROM drivers WHERE _key = 'driver_creai_' || ((i % 40) + 1) LIMIT 1),
            (SELECT uuid FROM vehicles WHERE _key = 'vehicle_creai_' || ((i % 30) + 1) LIMIT 1),
            'Repostaje ' || CASE i % 4 WHEN 0 THEN 'Shell' WHEN 1 THEN 'Repsol' WHEN 2 THEN 'Cepsa' ELSE 'BP' END || ' - ' || CASE i % 5 WHEN 0 THEN 'Madrid' WHEN 1 THEN 'Barcelona' WHEN 2 THEN 'Valencia' WHEN 3 THEN 'Sevilla' ELSE 'Bilbao' END,
            ST_SetSRID(ST_MakePoint(-3.7 + (i * 0.08), 40.4 + (i * 0.04)), 4326)::geography,
            (100000 + (i * 250))::TEXT,
            (50.00 + (i * 1.2))::TEXT,
            'EUR',
            (35.0 + (i * 0.8))::TEXT,
            'liters',
            'approved',
            NOW() - (i || ' days')::INTERVAL,
            NOW() - (i || ' days')::INTERVAL
        WHERE EXISTS (SELECT 1 FROM drivers WHERE _key = 'driver_creai_' || ((i % 40) + 1))
          AND EXISTS (SELECT 1 FROM vehicles WHERE _key = 'vehicle_creai_' || ((i % 30) + 1));
    END LOOP;

    -- ========================================
    -- 8. INCIDENCIAS (40 registros)
    -- ========================================
    FOR i IN 1..40 LOOP
        INSERT INTO issues (_key, uuid, public_id, issue_id, company_uuid, driver_uuid, vehicle_uuid, location, type, category, report, priority, status, created_at, updated_at)
        SELECT 
            'issue_creai_' || i,
            gen_random_uuid(),
            'ISSC' || LPAD(i::TEXT, 3, '0'),
            'ISSUEC-' || LPAD(i::TEXT, 3, '0'),
            creai_uuid,
            (SELECT uuid FROM drivers WHERE _key = 'driver_creai_' || ((i % 40) + 1) LIMIT 1),
            (SELECT uuid FROM vehicles WHERE _key = 'vehicle_creai_' || ((i % 30) + 1) LIMIT 1),
            ST_SetSRID(ST_MakePoint(-3.6 + (i * 0.06), 40.3 + (i * 0.03)), 4326)::geography,
            CASE i % 5 WHEN 0 THEN 'mechanical' WHEN 1 THEN 'electrical' WHEN 2 THEN 'tire' WHEN 3 THEN 'body' ELSE 'brake' END,
            CASE i % 5 WHEN 0 THEN 'engine' WHEN 1 THEN 'lights' WHEN 2 THEN 'wear' WHEN 3 THEN 'damage' ELSE 'maintenance' END,
            CASE i % 10 
                WHEN 0 THEN 'Motor hace ruido extraño al arrancar'
                WHEN 1 THEN 'Luz delantera izquierda intermitente'
                WHEN 2 THEN 'Neumáticos traseros con desgaste irregular'
                WHEN 3 THEN 'Raspadura en puerta lateral derecha'
                WHEN 4 THEN 'Frenos requieren ajuste urgente'
                WHEN 5 THEN 'Batería con bajo rendimiento'
                WHEN 6 THEN 'Filtro de aire necesita reemplazo'
                WHEN 7 THEN 'Amortiguadores gastados'
                WHEN 8 THEN 'Fisura pequeña en parabrisas'
                ELSE 'Aire acondicionado no funciona correctamente'
            END,
            CASE i % 3 WHEN 0 THEN 'high' WHEN 1 THEN 'medium' ELSE 'low' END,
            CASE i % 4 WHEN 0 THEN 'open' WHEN 1 THEN 'in_progress' WHEN 2 THEN 'resolved' ELSE 'open' END,
            NOW() - (i || ' days')::INTERVAL,
            NOW() - ((i - 1) || ' days')::INTERVAL
        WHERE EXISTS (SELECT 1 FROM drivers WHERE _key = 'driver_creai_' || ((i % 40) + 1))
          AND EXISTS (SELECT 1 FROM vehicles WHERE _key = 'vehicle_creai_' || ((i % 30) + 1));
    END LOOP;

    RAISE NOTICE 'Datos demo para CREAI insertados exitosamente!';
    RAISE NOTICE 'Lugares: 10';
    RAISE NOTICE 'Vehículos: 30';
    RAISE NOTICE 'Conductores: 40';
    RAISE NOTICE 'Flotas: 10';
    RAISE NOTICE 'Relaciones Flota-Conductores: 40';
    RAISE NOTICE 'Relaciones Flota-Vehículos: 30';
    RAISE NOTICE 'Reportes de Combustible: 50';
    RAISE NOTICE 'Incidencias: 40';
    RAISE NOTICE 'TOTAL: 250 registros';
END $$;

COMMIT;

-- ========================================
-- RESUMEN:
-- ========================================
-- Todos los datos insertados en la compañía CREAI
-- Total de registros: 250+
-- ========================================
