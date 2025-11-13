-- ========================================
-- DATOS DEMOSTRATIVOS PARA FLEET-OPS
-- Base de Datos: PostgreSQL
-- Registros: Más de 200
-- Idioma: Español
-- ========================================

-- Nota: Este script asume que ya existen las tablas en la base de datos
-- y que se ejecutará conectado a la base de datos PostgreSQL de Fleetbase

BEGIN;

-- ========================================
-- 1. EMPRESAS (Companies)
-- ========================================
INSERT INTO companies (_key, uuid, public_id, name, phone, email, type, status, slug, created_at, updated_at) VALUES
('company_1', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'COMP001', 'Envíos Premium 1', '+34948403239', 'contacto1@envíospremium.es', 'logistics', 'active', 'envíos-premium-1', NOW(), NOW());

INSERT INTO companies (_key, uuid, public_id, name, phone, email, type, status, slug, created_at, updated_at) VALUES
('company_2', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'COMP002', 'Transportes Rápidos 2', '+34941339799', 'contacto2@transportesrápidos.es', 'logistics', 'active', 'transportes-rápidos-2', NOW(), NOW());

INSERT INTO companies (_key, uuid, public_id, name, phone, email, type, status, slug, created_at, updated_at) VALUES
('company_3', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'COMP003', 'Transportes Verdes 3', '+34987030507', 'contacto3@transportesverdes.es', 'logistics', 'active', 'transportes-verdes-3', NOW(), NOW());

-- ========================================
-- 2. LUGARES (Places)
-- ========================================
INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_1', 'a1a01c17-edd5-4745-a829-ecfbe82160f0', 'PLACE001', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Avenida Gaudi 180, Murcia', 'Avenida Gaudi 180', 'Murcia', '95717', 'ES', '37.949476', '-1.127293', '+34993173370', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_2', '68475596-0480-46bc-b453-de5d5c10a298', 'PLACE002', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Avenida Andalucía 169, Sevilla', 'Avenida Andalucía 169', 'Sevilla', '97093', 'ES', '37.405534', '-6.024530', '+34998106242', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_3', '6abb8c4c-cc69-47f8-9000-6c250e679d08', 'PLACE003', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Avenida de la Constitución 40, Madrid', 'Avenida de la Constitución 40', 'Madrid', '60208', 'ES', '40.443044', '-3.706575', '+34967731083', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_4', 'fc71b2a8-6f9e-4a8d-b1f8-7f19ebeb0d3b', 'PLACE004', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Calle Cervantes 129, Alicante', 'Calle Cervantes 129', 'Alicante', '80783', 'ES', '38.379946', '-0.468095', '+34979637555', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_5', '72d0e1d7-063c-4f05-b105-f83026137da4', 'PLACE005', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Calle Princesa 121, Elche', 'Calle Princesa 121', 'Elche', '82822', 'ES', '38.234145', '-0.746323', '+34977645617', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_6', 'ef674ca0-a652-4081-997b-afa4125b0362', 'PLACE006', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Avenida Gaudi 120, Gijón', 'Avenida Gaudi 120', 'Gijón', '96304', 'ES', '43.507166', '-5.620318', '+34951224690', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_7', '59d02c09-a36d-48b1-bea2-34b028fdc0fb', 'PLACE007', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Ronda Valencia 93, Murcia', 'Ronda Valencia 93', 'Murcia', '16931', 'ES', '37.993853', '-1.088948', '+34996377310', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_8', 'e6b4d03e-fbc7-4f69-8f6c-6d7699ff34c6', 'PLACE008', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Avenida Diagonal 111, Madrid', 'Avenida Diagonal 111', 'Madrid', '41334', 'ES', '40.444984', '-3.679765', '+34957054136', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_9', '693836f9-4dd4-4947-982f-5bd1dcaf717d', 'PLACE009', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Calle Real 191, Granada', 'Calle Real 191', 'Granada', '30096', 'ES', '37.207744', '-3.555227', '+34943522302', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_10', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', 'PLACE010', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Paseo Gracia 70, Hospitalet', 'Paseo Gracia 70', 'Hospitalet', '20716', 'ES', '41.348604', '2.103499', '+34988147997', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_11', '43b00464-b32e-4c51-8389-e85b85083333', 'PLACE011', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Calle Barcelona 165, Córdoba', 'Calle Barcelona 165', 'Córdoba', '90264', 'ES', '37.891090', '-4.785601', '+34917853958', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_12', 'd7a66ccf-0ac0-4070-ad67-2618c70f7b90', 'PLACE012', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Calle Barcelona 184, Sevilla', 'Calle Barcelona 184', 'Sevilla', '69800', 'ES', '37.362827', '-5.962048', '+34963756474', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_13', '8c153eab-552a-4986-b1bb-d781b92dc91a', 'PLACE013', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Plaza Mayor 174, Barcelona', 'Plaza Mayor 174', 'Barcelona', '34576', 'ES', '41.360324', '2.145402', '+34945212452', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_14', '823171c3-335c-438a-9e67-2d6a4c1e9571', 'PLACE014', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Avenida Europa 105, Vitoria', 'Avenida Europa 105', 'Vitoria', '79629', 'ES', '42.818755', '-2.638352', '+34969763650', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_15', '00bc721a-d79a-4223-8ea7-19c2d1772684', 'PLACE015', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Paseo Gracia 5, Vigo', 'Paseo Gracia 5', 'Vigo', '43341', 'ES', '42.235400', '-8.671949', '+34951989646', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_16', '772d3990-e93c-43e7-adc2-c5caf440152b', 'PLACE016', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Plaza Cataluña 193, Gijón', 'Plaza Cataluña 193', 'Gijón', '11524', 'ES', '43.570469', '-5.637738', '+34936639160', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_17', '4c30105a-5f1a-4959-be07-94480a3d68d7', 'PLACE017', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Calle Barcelona 62, Palma', 'Calle Barcelona 62', 'Palma', '46432', 'ES', '39.603739', '2.693672', '+34913387241', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_18', 'd229c27a-1e52-4532-8f0b-b7b3d82188be', 'PLACE018', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Calle Toledo 130, Málaga', 'Calle Toledo 130', 'Málaga', '47259', 'ES', '36.703854', '-4.455878', '+34987923362', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_19', '5247e6eb-fab2-4d9d-b975-31b50d00b670', 'PLACE019', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Avenida de la Constitución 170, Hospitalet', 'Avenida de la Constitución 170', 'Hospitalet', '33850', 'ES', '41.349192', '2.109632', '+34972494625', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_20', 'dd53bf5a-50be-41c1-ab4c-176641358247', 'PLACE020', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Paseo Castellana 124, Palma', 'Paseo Castellana 124', 'Palma', '29791', 'ES', '39.572051', '2.688082', '+34971918768', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_21', '674c8ba3-0b11-4497-b77d-239226fcb94c', 'PLACE021', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Paseo Castellana 77, Elche', 'Paseo Castellana 77', 'Elche', '20691', 'ES', '38.309278', '-0.708254', '+34998263481', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_22', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', 'PLACE022', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Calle Madrid 64, Palma', 'Calle Madrid 64', 'Palma', '87798', 'ES', '39.579402', '2.635815', '+34980211815', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_23', '0bac3346-ca40-4ade-ab39-82dca62f0876', 'PLACE023', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Avenida Libertad 98, Valladolid', 'Avenida Libertad 98', 'Valladolid', '78531', 'ES', '41.652115', '-4.677850', '+34933498729', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_24', '5eea587f-5fdf-4e21-9493-189f21805f43', 'PLACE024', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Avenida Europa 112, Bilbao', 'Avenida Europa 112', 'Bilbao', '73620', 'ES', '43.226710', '-2.974130', '+34979758460', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_25', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', 'PLACE025', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Calle Aragón 163, Elche', 'Calle Aragón 163', 'Elche', '87248', 'ES', '38.270454', '-0.661110', '+34957486732', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_26', 'a3945835-3668-4d98-ba7d-fe95e38980b8', 'PLACE026', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Avenida Europa 91, Bilbao', 'Avenida Europa 91', 'Bilbao', '24072', 'ES', '43.227596', '-2.936829', '+34938095106', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_27', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', 'PLACE027', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Calle Sevilla 119, Vitoria', 'Calle Sevilla 119', 'Vitoria', '22528', 'ES', '42.880432', '-2.627746', '+34980556261', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_28', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', 'PLACE028', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Calle Real 82, Córdoba', 'Calle Real 82', 'Córdoba', '94897', 'ES', '37.895241', '-4.794492', '+34944175898', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_29', 'd55d5300-ad11-41f3-a7ef-0bf4b022fc36', 'PLACE029', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Calle Sevilla 89, Palma', 'Calle Sevilla 89', 'Palma', '45800', 'ES', '39.546226', '2.632716', '+34929814510', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_30', 'be9c8675-eae0-488b-9c5d-66fe2eb01452', 'PLACE030', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Calle Barcelona 126, Palma', 'Calle Barcelona 126', 'Palma', '16539', 'ES', '39.586107', '2.696726', '+34959274290', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_31', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', 'PLACE031', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Plaza Mayor 121, Madrid', 'Plaza Mayor 121', 'Madrid', '34521', 'ES', '40.407314', '-3.736907', '+34966727825', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_32', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', 'PLACE032', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Plaza España 25, Madrid', 'Plaza España 25', 'Madrid', '93840', 'ES', '40.437915', '-3.746371', '+34984462643', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_33', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'PLACE033', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Gran Vía 100, Palma', 'Gran Vía 100', 'Palma', '79258', 'ES', '39.534118', '2.680199', '+34972049333', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_34', '3389c354-331f-4372-9030-d2bbaf7a3de9', 'PLACE034', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Calle Sol 112, Las Palmas', 'Calle Sol 112', 'Las Palmas', '45196', 'ES', '28.103921', '-15.464670', '+34989397080', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_35', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'PLACE035', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Gran Vía 87, Sevilla', 'Gran Vía 87', 'Sevilla', '79698', 'ES', '37.426710', '-6.008268', '+34927421013', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_36', '0d083d50-9054-41ab-a96f-1821f3d45d0d', 'PLACE036', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Avenida Gaudi 157, Palma', 'Avenida Gaudi 157', 'Palma', '42066', 'ES', '39.557191', '2.633379', '+34999942996', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_37', '804a5b86-7693-4109-804f-1c973c00d5b5', 'PLACE037', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Calle Mayor 81, Gijón', 'Calle Mayor 81', 'Gijón', '36503', 'ES', '43.571238', '-5.683397', '+34965402929', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_38', '901d53fc-35d8-40e4-b286-0775962a71cf', 'PLACE038', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Ronda Valencia 98, Granada', 'Ronda Valencia 98', 'Granada', '79835', 'ES', '37.200933', '-3.592909', '+34911930381', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_39', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', 'PLACE039', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Calle Toledo 99, Vigo', 'Calle Toledo 99', 'Vigo', '45640', 'ES', '42.228172', '-8.744003', '+34933049733', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_40', '8086cfa9-a6f1-4d23-b3ac-b1df0c425953', 'PLACE040', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Avenida Gaudi 147, Barcelona', 'Avenida Gaudi 147', 'Barcelona', '15615', 'ES', '41.397670', '2.127082', '+34948178313', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_41', '796eb698-e7f9-4337-87aa-45a5b5ae8e52', 'PLACE041', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Calle Valencia 191, Elche', 'Calle Valencia 191', 'Elche', '86607', 'ES', '38.272992', '-0.666277', '+34988688093', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_42', '4984261e-b398-4bc3-9a45-3b6e9872c854', 'PLACE042', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Calle Madrid 23, Elche', 'Calle Madrid 23', 'Elche', '80845', 'ES', '38.274843', '-0.694070', '+34959491608', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_43', '011f19e3-f1bb-4ae9-bd41-c101da82fa1d', 'PLACE043', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Avenida de la Constitución 13, Barcelona', 'Avenida de la Constitución 13', 'Barcelona', '60629', 'ES', '41.415237', '2.181796', '+34967098419', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_44', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', 'PLACE044', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Avenida de la Constitución 117, Bilbao', 'Avenida de la Constitución 117', 'Bilbao', '50409', 'ES', '43.296044', '-2.943036', '+34961937218', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_45', 'aed9db3a-3526-42b9-adfc-0e7c0c56c69b', 'PLACE045', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Calle Toledo 20, Barcelona', 'Calle Toledo 20', 'Barcelona', '21113', 'ES', '41.389638', '2.161698', '+34943970998', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_46', 'c3b928d8-da55-4b7a-b299-d04beb2f74ef', 'PLACE046', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Plaza Mayor 85, Palma', 'Plaza Mayor 85', 'Palma', '51211', 'ES', '39.558811', '2.622852', '+34947645327', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_47', '33d445a1-6944-4107-b316-23c3580ae4f0', 'PLACE047', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Avenida Andalucía 57, Málaga', 'Avenida Andalucía 57', 'Málaga', '77827', 'ES', '36.692046', '-4.428248', '+34918249056', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_48', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', 'PLACE048', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Calle Barcelona 68, Valencia', 'Calle Barcelona 68', 'Valencia', '76287', 'ES', '39.446067', '-0.374898', '+34932019269', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_49', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'PLACE049', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Calle Valencia 116, Vigo', 'Calle Valencia 116', 'Vigo', '11914', 'ES', '42.201756', '-8.722689', '+34937451649', 'warehouse', NOW(), NOW());

INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_50', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'PLACE050', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Calle Mayor 93, Granada', 'Calle Mayor 93', 'Granada', '60490', 'ES', '37.159234', '-3.591812', '+34943160742', 'warehouse', NOW(), NOW());

-- ========================================
-- 3. PROVEEDORES (Vendors)
-- ========================================
INSERT INTO vendors (_key, uuid, public_id, company_uuid, place_uuid, name, internal_id, email, phone, type, status, slug, created_at, updated_at) VALUES
('vendor_1', '5c1bc265-58ac-4063-b4dd-db743377985f', 'VENDOR001', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '4984261e-b398-4bc3-9a45-3b6e9872c854', 'Mensajería Urgente Proveedor 1', 'VEN-0001', 'proveedor1@example.com', '+34912389295', 'supplier', 'active', 'mensajería-urgente-proveedor-1', NOW(), NOW());

INSERT INTO vendors (_key, uuid, public_id, company_uuid, place_uuid, name, internal_id, email, phone, type, status, slug, created_at, updated_at) VALUES
('vendor_2', 'ccd08f51-67c3-423e-ba7f-550881ef4c9e', 'VENDOR002', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '4984261e-b398-4bc3-9a45-3b6e9872c854', 'Mensajería 24h Proveedor 2', 'VEN-0002', 'proveedor2@example.com', '+34964043982', 'supplier', 'active', 'mensajería-24h-proveedor-2', NOW(), NOW());

INSERT INTO vendors (_key, uuid, public_id, company_uuid, place_uuid, name, internal_id, email, phone, type, status, slug, created_at, updated_at) VALUES
('vendor_3', '91ea8440-22ac-4443-a25e-5bd0ebe31dec', 'VENDOR003', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'fc71b2a8-6f9e-4a8d-b1f8-7f19ebeb0d3b', 'Logística Ibérica Proveedor 3', 'VEN-0003', 'proveedor3@example.com', '+34911458498', 'supplier', 'active', 'logística-ibérica-proveedor-3', NOW(), NOW());

INSERT INTO vendors (_key, uuid, public_id, company_uuid, place_uuid, name, internal_id, email, phone, type, status, slug, created_at, updated_at) VALUES
('vendor_4', 'f990982a-1b7a-48cc-89a8-7766bc978200', 'VENDOR004', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', 'Distribución Integral Proveedor 4', 'VEN-0004', 'proveedor4@example.com', '+34928328512', 'supplier', 'active', 'distribución-integral-proveedor-4', NOW(), NOW());

INSERT INTO vendors (_key, uuid, public_id, company_uuid, place_uuid, name, internal_id, email, phone, type, status, slug, created_at, updated_at) VALUES
('vendor_5', '9e9afca0-e00d-4263-92cc-e140de9971eb', 'VENDOR005', '3bc9ef59-698b-4859-878a-ce336f2c022d', '693836f9-4dd4-4947-982f-5bd1dcaf717d', 'Envíos Premium Proveedor 5', 'VEN-0005', 'proveedor5@example.com', '+34992637576', 'supplier', 'active', 'envíos-premium-proveedor-5', NOW(), NOW());

INSERT INTO vendors (_key, uuid, public_id, company_uuid, place_uuid, name, internal_id, email, phone, type, status, slug, created_at, updated_at) VALUES
('vendor_6', 'b2e8d860-e6bd-4b15-b910-1bbddf3f86e1', 'VENDOR006', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '0bac3346-ca40-4ade-ab39-82dca62f0876', 'Envíos Premium Proveedor 6', 'VEN-0006', 'proveedor6@example.com', '+34954947334', 'supplier', 'active', 'envíos-premium-proveedor-6', NOW(), NOW());

INSERT INTO vendors (_key, uuid, public_id, company_uuid, place_uuid, name, internal_id, email, phone, type, status, slug, created_at, updated_at) VALUES
('vendor_7', 'cdeb0703-2496-4125-9c26-6e9f81cf8a9c', 'VENDOR007', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ef674ca0-a652-4081-997b-afa4125b0362', 'Distribuciones del Sur Proveedor 7', 'VEN-0007', 'proveedor7@example.com', '+34931871861', 'supplier', 'active', 'distribuciones-del-sur-proveedor-7', NOW(), NOW());

INSERT INTO vendors (_key, uuid, public_id, company_uuid, place_uuid, name, internal_id, email, phone, type, status, slug, created_at, updated_at) VALUES
('vendor_8', 'df81316b-5c4d-4dc9-93bf-2e0f91e0c652', 'VENDOR008', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'd55d5300-ad11-41f3-a7ef-0bf4b022fc36', 'Transporte Nacional Proveedor 8', 'VEN-0008', 'proveedor8@example.com', '+34950884642', 'supplier', 'active', 'transporte-nacional-proveedor-8', NOW(), NOW());

INSERT INTO vendors (_key, uuid, public_id, company_uuid, place_uuid, name, internal_id, email, phone, type, status, slug, created_at, updated_at) VALUES
('vendor_9', 'e309eedb-0fe7-4b9d-9052-0dfee4f87456', 'VENDOR009', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '772d3990-e93c-43e7-adc2-c5caf440152b', 'Envíos Premium Proveedor 9', 'VEN-0009', 'proveedor9@example.com', '+34995946622', 'supplier', 'active', 'envíos-premium-proveedor-9', NOW(), NOW());

INSERT INTO vendors (_key, uuid, public_id, company_uuid, place_uuid, name, internal_id, email, phone, type, status, slug, created_at, updated_at) VALUES
('vendor_10', '97dc3caa-719b-49fc-88f8-894bd6ed3225', 'VENDOR010', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '68475596-0480-46bc-b453-de5d5c10a298', 'Transporte Nacional Proveedor 10', 'VEN-0010', 'proveedor10@example.com', '+34994144785', 'supplier', 'active', 'transporte-nacional-proveedor-10', NOW(), NOW());

-- ========================================
-- 4. FLOTAS (Fleets)
-- ========================================
INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_1', 'dee565d8-1eb3-4363-ba25-90d1ab5dc6b6', 'FLEET001', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e309eedb-0fe7-4b9d-9052-0dfee4f87456', 'Flota 1 - Elche', '#33FFF5', 'delivery', 'active', 'flota-1', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_2', '6cafeb70-3162-4e35-ac5a-89ce43fdd1d2', 'FLEET002', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Flota 2 - A Coruña', '#33FF57', 'delivery', 'active', 'flota-2', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_3', '11c46b56-fab5-4c95-ac78-55698c14b381', 'FLEET003', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Flota 3 - Murcia', '#FFFF33', 'delivery', 'active', 'flota-3', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_4', '434bc1d8-93c0-43eb-9bfa-953a5359b8a7', 'FLEET004', '3bc9ef59-698b-4859-878a-ce336f2c022d', '97dc3caa-719b-49fc-88f8-894bd6ed3225', 'Flota 4 - Bilbao', '#3357FF', 'delivery', 'active', 'flota-4', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_5', '46d170dc-d163-45dd-848a-6c9a2ad6f9cd', 'FLEET005', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Flota 5 - Elche', '#33FF8C', 'delivery', 'active', 'flota-5', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_6', '4014b2f6-0aa5-44a7-961c-00a47e811110', 'FLEET006', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'e309eedb-0fe7-4b9d-9052-0dfee4f87456', 'Flota 6 - Sevilla', '#FF8C33', 'delivery', 'active', 'flota-6', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_7', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', 'FLEET007', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Flota 7 - Madrid', '#F5FF33', 'delivery', 'active', 'flota-7', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_8', 'f032308b-f3c8-4718-9291-bcf838ca1207', 'FLEET008', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '91ea8440-22ac-4443-a25e-5bd0ebe31dec', 'Flota 8 - Barcelona', '#33FFF5', 'delivery', 'active', 'flota-8', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_9', '293891ee-f0ba-45f8-8a61-6a8dfc03f1bc', 'FLEET009', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '9e9afca0-e00d-4263-92cc-e140de9971eb', 'Flota 9 - Las Palmas', '#33FFF5', 'delivery', 'active', 'flota-9', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_10', 'a27e4d3f-370a-4050-a001-e89f69df6c8d', 'FLEET010', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'df81316b-5c4d-4dc9-93bf-2e0f91e0c652', 'Flota 10 - Granada', '#FF3333', 'delivery', 'active', 'flota-10', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_11', '9e2c14b8-c650-4b4c-8291-c5fa08055097', 'FLEET011', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'b2e8d860-e6bd-4b15-b910-1bbddf3f86e1', 'Flota 11 - Murcia', '#8C33FF', 'delivery', 'active', 'flota-11', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_12', 'a31ef3dc-bbfd-46cd-b255-36e4eff2b956', 'FLEET012', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '9e9afca0-e00d-4263-92cc-e140de9971eb', 'Flota 12 - Madrid', '#FF3333', 'delivery', 'active', 'flota-12', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_13', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', 'FLEET013', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Flota 13 - Elche', '#33FF8C', 'delivery', 'active', 'flota-13', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_14', 'c8591701-2003-4dfc-a9f4-f28975c185b0', 'FLEET014', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Flota 14 - Vigo', '#33FFF5', 'delivery', 'active', 'flota-14', NOW(), NOW());

INSERT INTO fleets (_key, uuid, public_id, company_uuid, vendor_uuid, name, color, task, status, slug, created_at, updated_at) VALUES
('fleet_15', 'c66faf32-c43c-4291-bc3c-8e02a224528d', 'FLEET015', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Flota 15 - Barcelona', '#FF33A1', 'delivery', 'active', 'flota-15', NOW(), NOW());

-- ========================================
-- 5. CONDUCTORES (Drivers)
-- ========================================
INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_1', '41a53b11-4f2c-4ac2-910b-e2d19d71ad1b', 'DRIVER001', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Isabel Serrano', 'isabel.serrano@example.com', '+34925543914', 'ES35697419', '41.420623', '2.012197', 'active', 'isabel-serrano-1', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_2', '43ad9ea3-7d19-454d-ae95-6a7b0cbe81da', 'DRIVER002', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'f990982a-1b7a-48cc-89a8-7766bc978200', 'Sara Vázquez', 'sara.vázquez@example.com', '+34992258617', 'ES98617622', '41.709466', '-0.942758', 'active', 'sara-vázquez-2', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_3', 'e9813b0b-0680-4d59-9d7f-7ad5ed690c91', 'DRIVER003', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Carlos Suárez', 'carlos.suárez@example.com', '+34964819311', 'ES62909041', '41.699976', '-4.699010', 'active', 'carlos-suárez-3', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_4', '65215931-7bbf-4c4c-8ec9-12af635bbf7f', 'DRIVER004', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5c1bc265-58ac-4063-b4dd-db743377985f', 'Natalia Delgado', 'natalia.delgado@example.com', '+34926854674', 'ES37348300', '41.625362', '-0.801983', 'active', 'natalia-delgado-4', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_5', 'd4516faa-23ea-4895-9477-a0ff77dd1535', 'DRIVER005', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'df81316b-5c4d-4dc9-93bf-2e0f91e0c652', 'Lucía Martínez', 'lucía.martínez@example.com', '+34996255514', 'ES78064017', '37.370286', '-6.024636', 'active', 'lucía-martínez-5', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_6', '4730e4c9-46b9-48bc-817f-3e8e31ed94cb', 'DRIVER006', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'cdeb0703-2496-4125-9c26-6e9f81cf8a9c', 'Marta Suárez', 'marta.suárez@example.com', '+34918306395', 'ES75692466', '37.962213', '-1.088364', 'active', 'marta-suárez-6', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_7', '5b4652f1-9c32-4429-ba6a-04b4295215b8', 'DRIVER007', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'df81316b-5c4d-4dc9-93bf-2e0f91e0c652', 'María Gómez', 'maría.gómez@example.com', '+34932242318', 'ES76428865', '43.434185', '-8.390244', 'active', 'maría-gómez-7', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_8', '03c5d78e-4c4f-4281-ac9c-b4af784c3821', 'DRIVER008', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '97dc3caa-719b-49fc-88f8-894bd6ed3225', 'Fernando Sánchez', 'fernando.sánchez@example.com', '+34942471268', 'ES82696078', '42.831425', '-2.753016', 'active', 'fernando-sánchez-8', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_9', 'e31d1c29-1754-4cd7-9166-8a0380fe3202', 'DRIVER009', '3bc9ef59-698b-4859-878a-ce336f2c022d', '97dc3caa-719b-49fc-88f8-894bd6ed3225', 'Sergio Ramírez', 'sergio.ramírez@example.com', '+34957608585', 'ES66931590', '43.552330', '-5.649058', 'active', 'sergio-ramírez-9', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_10', 'fbbeed09-de67-4270-bdce-a1d43a650f85', 'DRIVER010', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'df81316b-5c4d-4dc9-93bf-2e0f91e0c652', 'Verónica Torres', 'verónica.torres@example.com', '+34933430276', 'ES33032856', '28.163391', '-15.524777', 'active', 'verónica-torres-10', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_11', '105f897f-4160-411f-a730-f004b2e2b6e4', 'DRIVER011', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Antonio Suárez', 'antonio.suárez@example.com', '+34966889253', 'ES89552214', '38.078027', '-1.117786', 'active', 'antonio-suárez-11', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_12', '9f9b2e1f-0c91-497a-9901-7054f3747119', 'DRIVER012', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'José Ruiz', 'josé.ruiz@example.com', '+34971556962', 'ES80037810', '41.580200', '-0.924024', 'active', 'josé-ruiz-12', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_13', '70c04768-2c72-4d82-83ee-75d5246344bc', 'DRIVER013', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Gloria Ortiz', 'gloria.ortiz@example.com', '+34955756226', 'ES25077818', '28.161696', '-15.418445', 'active', 'gloria-ortiz-13', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_14', '1fcea0f2-0251-4b12-bf77-b50d9d363df4', 'DRIVER014', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'f990982a-1b7a-48cc-89a8-7766bc978200', 'Gloria García', 'gloria.garcía@example.com', '+34977920506', 'ES15906767', '40.469292', '-3.639293', 'active', 'gloria-garcía-14', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_15', '5b29752f-098a-4fc4-859a-26505711fbb6', 'DRIVER015', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Sara Morales', 'sara.morales@example.com', '+34948398991', 'ES37245090', '43.589945', '-5.689100', 'active', 'sara-morales-15', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_16', 'ae04ba30-c338-444d-a5ad-2349e39dc189', 'DRIVER016', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Eva Serrano', 'eva.serrano@example.com', '+34977359831', 'ES12800231', '42.906953', '-2.610351', 'active', 'eva-serrano-16', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_17', 'b3be37d3-b17e-4b87-8ae3-80fde85042c5', 'DRIVER017', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Carlos Cortés', 'carlos.cortés@example.com', '+34976014053', 'ES94063833', '43.235217', '-2.920722', 'active', 'carlos-cortés-17', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_18', '391c34e6-b519-4cb7-8592-b86ac664b8ec', 'DRIVER018', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Eva Ramírez', 'eva.ramírez@example.com', '+34988775500', 'ES56982770', '43.452173', '-8.460991', 'active', 'eva-ramírez-18', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_19', 'f5dd443b-223e-4d78-a340-0478ff44a66b', 'DRIVER019', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5c1bc265-58ac-4063-b4dd-db743377985f', 'Alejandro Medina', 'alejandro.medina@example.com', '+34958075847', 'ES73137436', '41.449672', '2.219874', 'active', 'alejandro-medina-19', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_20', 'f550fc5a-3ca3-48b8-b57b-5dcd3b3bd2d4', 'DRIVER020', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'cdeb0703-2496-4125-9c26-6e9f81cf8a9c', 'Sara Molina', 'sara.molina@example.com', '+34929049408', 'ES41341064', '40.389868', '-3.665393', 'active', 'sara-molina-20', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_21', '2bc6d0e7-aaac-48cb-89d2-7cb74a54375a', 'DRIVER021', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Laura Santos', 'laura.santos@example.com', '+34914017114', 'ES97519667', '38.278396', '-0.649047', 'active', 'laura-santos-21', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_22', '3084563c-0d94-454e-8adf-d85100582946', 'DRIVER022', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Diego Pérez', 'diego.pérez@example.com', '+34991100616', 'ES54743032', '36.742181', '-4.411141', 'active', 'diego-pérez-22', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_23', 'a4d61a8f-74e4-43fa-a3f2-b011a968469e', 'DRIVER023', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Andrés Moreno', 'andrés.moreno@example.com', '+34940359027', 'ES83704029', '37.441557', '-5.976037', 'active', 'andrés-moreno-23', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_24', 'c456d9df-baad-4511-98d6-b1bc0b9963a9', 'DRIVER024', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Óscar Moreno', 'óscar.moreno@example.com', '+34984830402', 'ES34598501', '41.290576', '2.081689', 'active', 'óscar-moreno-24', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_25', 'e5523494-e835-48be-87e2-f003080e6dbd', 'DRIVER025', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Teresa Medina', 'teresa.medina@example.com', '+34910369434', 'ES98338682', '41.666598', '-4.744660', 'active', 'teresa-medina-25', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_26', 'da1a69e3-e434-42d1-b393-224bbda40a32', 'DRIVER026', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Lucía Castillo', 'lucía.castillo@example.com', '+34935692627', 'ES45551298', '28.098337', '-15.430587', 'active', 'lucía-castillo-26', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_27', '90e7a4de-e453-45b2-97a4-d5caa26c25f8', 'DRIVER027', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'df81316b-5c4d-4dc9-93bf-2e0f91e0c652', 'Rafael Fernández', 'rafael.fernández@example.com', '+34974968378', 'ES68320911', '38.013643', '-1.174758', 'active', 'rafael-fernández-27', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_28', '05857931-8db8-4923-b471-97fd1aba42e5', 'DRIVER028', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Diego Domínguez', 'diego.domínguez@example.com', '+34917388933', 'ES93296131', '43.598174', '-5.713117', 'active', 'diego-domínguez-28', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_29', '4f77e647-7646-4b30-a7a7-d4c299e98e71', 'DRIVER029', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Laura Sánchez', 'laura.sánchez@example.com', '+34999014258', 'ES27503177', '43.197617', '-2.952584', 'active', 'laura-sánchez-29', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_30', 'b613c1e7-fcca-4ddc-a87c-026887281a8b', 'DRIVER030', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'cdeb0703-2496-4125-9c26-6e9f81cf8a9c', 'Rafael Ramos', 'rafael.ramos@example.com', '+34971127748', 'ES13002938', '43.289122', '-8.317805', 'active', 'rafael-ramos-30', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_31', '572c8b69-f75d-44db-9f7a-d0e2f8f833ea', 'DRIVER031', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Laura Medina', 'laura.medina@example.com', '+34922532258', 'ES43602740', '43.635056', '-5.754469', 'active', 'laura-medina-31', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_32', 'f99e759e-f25c-4308-a6c3-7a2203eb77fa', 'DRIVER032', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Rafael Delgado', 'rafael.delgado@example.com', '+34977749915', 'ES19449355', '37.947603', '-1.223191', 'active', 'rafael-delgado-32', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_33', '16823146-eee1-46af-a809-15767c3c2486', 'DRIVER033', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Elena Alonso', 'elena.alonso@example.com', '+34942448642', 'ES12716657', '41.400075', '2.164092', 'active', 'elena-alonso-33', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_34', '621bfdad-36e7-4f0b-9aeb-dd451849dc3d', 'DRIVER034', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Luis Iglesias', 'luis.iglesias@example.com', '+34973028811', 'ES81798004', '43.463123', '-5.613918', 'active', 'luis-iglesias-34', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_35', '2588e8d0-a05a-4070-a585-ba79aadb88c6', 'DRIVER035', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Álvaro Ramírez', 'álvaro.ramírez@example.com', '+34910439433', 'ES31457524', '42.246030', '-8.698298', 'active', 'álvaro-ramírez-35', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_36', 'ed22ee37-28f4-4fe0-ac64-44e4e174e5c6', 'DRIVER036', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Eva Vázquez', 'eva.vázquez@example.com', '+34965483293', 'ES72485205', '41.345096', '2.098963', 'active', 'eva-vázquez-36', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_37', 'f3e1a540-3f44-4b2f-80c9-b893a627c1dd', 'DRIVER037', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ccd08f51-67c3-423e-ba7f-550881ef4c9e', 'Álvaro Delgado', 'álvaro.delgado@example.com', '+34992317946', 'ES83992804', '41.423343', '2.037469', 'active', 'álvaro-delgado-37', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_38', '6ec285e6-d62b-464e-a059-777707e38ca8', 'DRIVER038', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Ricardo Santos', 'ricardo.santos@example.com', '+34986231954', 'ES50148494', '41.398737', '2.114945', 'active', 'ricardo-santos-38', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_39', '14db45a6-c04b-49d7-ad51-ae75d11a934e', 'DRIVER039', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Raúl Santos', 'raúl.santos@example.com', '+34941532555', 'ES32956364', '38.396260', '-0.562926', 'active', 'raúl-santos-39', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_40', 'b4764ca7-deb6-4a47-913f-3a5143d56c98', 'DRIVER040', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Dolores Martínez', 'dolores.martínez@example.com', '+34955320677', 'ES11164080', '43.524528', '-5.610482', 'active', 'dolores-martínez-40', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_41', '497b8716-bdfa-48dc-8cd4-9d4dcb1a6341', 'DRIVER041', '3bc9ef59-698b-4859-878a-ce336f2c022d', '91ea8440-22ac-4443-a25e-5bd0ebe31dec', 'Carlos Alonso', 'carlos.alonso@example.com', '+34966953309', 'ES59572139', '43.264681', '-2.852738', 'active', 'carlos-alonso-41', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_42', '42a645d2-bf1f-42c0-957c-09500c74060f', 'DRIVER042', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Isabel Gómez', 'isabel.gómez@example.com', '+34959058679', 'ES38985051', '42.871991', '-2.651545', 'active', 'isabel-gómez-42', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_43', '697c52a5-31d0-4864-acb7-683615d366ec', 'DRIVER043', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Enrique Alonso', 'enrique.alonso@example.com', '+34990258524', 'ES59012874', '37.130912', '-3.592109', 'active', 'enrique-alonso-43', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_44', '7c8bf8a1-a0e8-41bc-a531-794563607aff', 'DRIVER044', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'cdeb0703-2496-4125-9c26-6e9f81cf8a9c', 'Daniel Romero', 'daniel.romero@example.com', '+34946979552', 'ES74247131', '43.361327', '-2.891555', 'active', 'daniel-romero-44', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_45', '6ff944e5-425c-4be5-954a-2be796586cf8', 'DRIVER045', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'cdeb0703-2496-4125-9c26-6e9f81cf8a9c', 'Raúl Hernández', 'raúl.hernández@example.com', '+34980712149', 'ES34828898', '41.673275', '-0.981883', 'active', 'raúl-hernández-45', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_46', '85f97c62-7282-4dc1-997b-a34ff13ac9b7', 'DRIVER046', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5c1bc265-58ac-4063-b4dd-db743377985f', 'María Sanz', 'maría.sanz@example.com', '+34941463029', 'ES53879722', '42.923314', '-2.622089', 'active', 'maría-sanz-46', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_47', 'c83af5f4-9301-44ae-bb66-32b8c8f61e2e', 'DRIVER047', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Álvaro Gómez', 'álvaro.gómez@example.com', '+34987160288', 'ES19642438', '38.268134', '-0.618241', 'active', 'álvaro-gómez-47', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_48', 'bedf125d-f52e-401a-9703-49a54fa2528b', 'DRIVER048', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Alejandro Iglesias', 'alejandro.iglesias@example.com', '+34913417568', 'ES96497426', '41.610019', '-4.731311', 'active', 'alejandro-iglesias-48', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_49', '7568650d-b0a8-423a-bcdf-84d8098ed77f', 'DRIVER049', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Monica Iglesias', 'monica.iglesias@example.com', '+34920110921', 'ES64710288', '38.360541', '-0.558679', 'active', 'monica-iglesias-49', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_50', 'c3aa6ff4-de59-4a70-82a8-06d1b54c6c22', 'DRIVER050', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Francisco García', 'francisco.garcía@example.com', '+34966517908', 'ES28373820', '37.479094', '-5.894702', 'active', 'francisco-garcía-50', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_51', 'a88d16bc-aada-46e3-883b-3610f19a4e4b', 'DRIVER051', '3bc9ef59-698b-4859-878a-ce336f2c022d', '9e9afca0-e00d-4263-92cc-e140de9971eb', 'Dolores Vázquez', 'dolores.vázquez@example.com', '+34921283938', 'ES86475508', '37.417558', '-5.893351', 'active', 'dolores-vázquez-51', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_52', '2ccf82a0-402b-4d48-92c6-c95d44950480', 'DRIVER052', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Alejandro González', 'alejandro.gonzález@example.com', '+34994416054', 'ES24282298', '42.868055', '-2.755511', 'active', 'alejandro-gonzález-52', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_53', '57d13c60-2757-4c6b-b346-535ec6cc07b7', 'DRIVER053', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Daniel Ortiz', 'daniel.ortiz@example.com', '+34983204694', 'ES78560089', '28.210976', '-15.373978', 'active', 'daniel-ortiz-53', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_54', '1b0c14af-edcf-4ead-b768-83e35989eb0d', 'DRIVER054', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Dolores Iglesias', 'dolores.iglesias@example.com', '+34960426477', 'ES19512885', '36.771073', '-4.405248', 'active', 'dolores-iglesias-54', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_55', 'a3b8b9da-3d60-4995-91de-c20da5ecc600', 'DRIVER055', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Enrique Torres', 'enrique.torres@example.com', '+34955211247', 'ES38590808', '41.715777', '-0.928021', 'active', 'enrique-torres-55', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_56', '117a319a-56a6-4c16-9cb9-c1a1c8a7c778', 'DRIVER056', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Monica Gutiérrez', 'monica.gutiérrez@example.com', '+34975136547', 'ES55946565', '41.726039', '-4.686034', 'active', 'monica-gutiérrez-56', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_57', 'd4067654-8d8a-48e3-9719-1d73de6f4baa', 'DRIVER057', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Elena Moreno', 'elena.moreno@example.com', '+34965869754', 'ES48627183', '41.728786', '-0.941988', 'active', 'elena-moreno-57', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_58', '36d07950-d06a-4369-ab88-bbe023d3959f', 'DRIVER058', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Teresa Iglesias', 'teresa.iglesias@example.com', '+34952661860', 'ES15093600', '38.349882', '-0.551800', 'active', 'teresa-iglesias-58', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_59', '7a2c5607-248b-48ed-b433-ba9656743b7c', 'DRIVER059', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Ana Sanz', 'ana.sanz@example.com', '+34953923060', 'ES15487599', '37.827088', '-4.782574', 'active', 'ana-sanz-59', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_60', '8a053a76-b603-4ff8-8887-7fb4e38356d3', 'DRIVER060', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'df81316b-5c4d-4dc9-93bf-2e0f91e0c652', 'Isabel Jiménez', 'isabel.jiménez@example.com', '+34978796089', 'ES64255221', '43.612818', '-5.708574', 'active', 'isabel-jiménez-60', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_61', 'dd41aea7-d1f9-4465-8573-60a2902fd422', 'DRIVER061', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Natalia Pérez', 'natalia.pérez@example.com', '+34950208114', 'ES46582172', '41.718968', '-0.979754', 'active', 'natalia-pérez-61', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_62', '504d43ae-540b-4a73-89b7-bc011244556d', 'DRIVER062', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '9e9afca0-e00d-4263-92cc-e140de9971eb', 'Pablo Pérez', 'pablo.pérez@example.com', '+34938620604', 'ES85970358', '41.461461', '2.157637', 'active', 'pablo-pérez-62', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_63', '4228b2c3-0267-4e76-b3a3-def30ae82a22', 'DRIVER063', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Raquel Rodríguez', 'raquel.rodríguez@example.com', '+34954152110', 'ES95280484', '38.069991', '-1.174956', 'active', 'raquel-rodríguez-63', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_64', '7c5012c1-d38a-4370-ac45-2191a0d1c35b', 'DRIVER064', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5c1bc265-58ac-4063-b4dd-db743377985f', 'Teresa Sanz', 'teresa.sanz@example.com', '+34971583867', 'ES47294458', '38.086817', '-1.037540', 'active', 'teresa-sanz-64', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_65', '6d941154-4b46-432d-9e24-f1de269b532c', 'DRIVER065', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'f990982a-1b7a-48cc-89a8-7766bc978200', 'Beatriz Ortega', 'beatriz.ortega@example.com', '+34987392234', 'ES49403933', '38.199634', '-0.604492', 'active', 'beatriz-ortega-65', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_66', '950c612b-3775-4102-b1c5-d529e6e76349', 'DRIVER066', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '91ea8440-22ac-4443-a25e-5bd0ebe31dec', 'Pablo Cortés', 'pablo.cortés@example.com', '+34921511231', 'ES97865935', '38.223133', '-0.628117', 'active', 'pablo-cortés-66', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_67', 'ffe8b58d-e0d4-44b3-b63b-fca6d5f50e23', 'DRIVER067', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Adrián Ruiz', 'adrián.ruiz@example.com', '+34912298764', 'ES92245125', '41.298788', '2.146059', 'active', 'adrián-ruiz-67', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_68', '92d39d43-ecf4-4db5-8a6e-fd9d75c9af1d', 'DRIVER068', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Silvia Ramos', 'silvia.ramos@example.com', '+34943288889', 'ES56916724', '36.630602', '-4.409352', 'active', 'silvia-ramos-68', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_69', '543fb08b-9a78-4b77-9c95-dc6cb36020c4', 'DRIVER069', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Ángeles Marín', 'ángeles.marín@example.com', '+34926755245', 'ES28427193', '38.032186', '-1.072228', 'active', 'ángeles-marín-69', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_70', 'de3a152d-e14d-4225-8ea2-9187e3cbb2c7', 'DRIVER070', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Laura Nuñez', 'laura.nuñez@example.com', '+34920639120', 'ES59239053', '37.875872', '-4.689469', 'active', 'laura-nuñez-70', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_71', 'ffe3505b-83bd-4405-8350-865d522ed2c4', 'DRIVER071', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Rafael Ortiz', 'rafael.ortiz@example.com', '+34961239671', 'ES37655054', '43.336917', '-8.479243', 'active', 'rafael-ortiz-71', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_72', 'cf5b29d1-3bf9-4aff-acc6-04755dd57519', 'DRIVER072', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Rafael Gutiérrez', 'rafael.gutiérrez@example.com', '+34939963802', 'ES71013356', '41.653856', '-0.864420', 'active', 'rafael-gutiérrez-72', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_73', '476ea515-58c0-4232-b812-3f4d99c89ea4', 'DRIVER073', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Enrique Ruiz', 'enrique.ruiz@example.com', '+34910562236', 'ES68190213', '41.345391', '2.155136', 'active', 'enrique-ruiz-73', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_74', '9753af3b-d7ab-4ce1-8b31-8cded28fc881', 'DRIVER074', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'f990982a-1b7a-48cc-89a8-7766bc978200', 'Óscar Jiménez', 'óscar.jiménez@example.com', '+34959320277', 'ES51828434', '37.239246', '-3.693712', 'active', 'óscar-jiménez-74', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_75', '73064771-03bc-4af5-b004-5462b4b7b2a5', 'DRIVER075', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e309eedb-0fe7-4b9d-9052-0dfee4f87456', 'Patricia Gil', 'patricia.gil@example.com', '+34931164483', 'ES37961013', '28.091896', '-15.500614', 'active', 'patricia-gil-75', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_76', '56b01889-ef06-45a6-a7cb-dcfb14600ef1', 'DRIVER076', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'José Alonso', 'josé.alonso@example.com', '+34937180652', 'ES74318815', '40.404127', '-3.704973', 'active', 'josé-alonso-76', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_77', 'f623a834-2f4c-4194-8c5f-30bcf26da51a', 'DRIVER077', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Sara Marín', 'sara.marín@example.com', '+34999716469', 'ES23358609', '42.777222', '-2.576444', 'active', 'sara-marín-77', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_78', '387c111c-5c3c-4b8d-ad00-45457acacdd4', 'DRIVER078', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Pedro Vázquez', 'pedro.vázquez@example.com', '+34952263344', 'ES14403223', '43.309581', '-2.997924', 'active', 'pedro-vázquez-78', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_79', '6c45492b-913a-4e97-b0c3-3570efacf2eb', 'DRIVER079', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Óscar Gutiérrez', 'óscar.gutiérrez@example.com', '+34922131371', 'ES34501538', '37.905972', '-4.755613', 'active', 'óscar-gutiérrez-79', NOW(), NOW());

INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, email, phone, drivers_license_number, latitude, longitude, status, slug, created_at, updated_at) VALUES
('driver_80', '4251aaf7-3a02-43a9-b24c-9df5fb04345b', 'DRIVER080', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Sergio Romero', 'sergio.romero@example.com', '+34968714708', 'ES25078302', '43.535473', '-5.659400', 'active', 'sergio-romero-80', NOW(), NOW());

-- ========================================
-- 6. VEHÍCULOS (Vehicles)
-- ========================================
INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_1', '74bbccbb-9b82-42bb-b4f4-97439b6c8f7a', 'VEH001', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '91ea8440-22ac-4443-a25e-5bd0ebe31dec', 'Renault', 'Kangoo ZE', '2020', 'Eléctrico', '4048BVD', 'AVAS2DY7A7H6GW385', 'active', false, '37.456832', '-6.081853', 'renault-kangoo ze-1', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_2', 'e695b368-ccf0-4720-866d-9eb1a339c5f6', 'VEH002', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Scania', 'R500', '2020', 'Camión', '1278YJR', '9G9HLBY259HYJXCXV', 'active', false, '38.373669', '-0.385007', 'scania-r500-2', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_3', '25487c75-d6b1-4215-87ee-0053a01c6397', 'VEH003', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'f990982a-1b7a-48cc-89a8-7766bc978200', 'Honda', 'PCX', '2023', 'Moto', '8974RSY', 'BWWZSHKS8CY0HE0HD', 'active', false, '41.578713', '-0.916499', 'honda-pcx-3', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_4', '8a0739bb-42ac-4182-ac31-837d4cb41e0f', 'VEH004', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'e309eedb-0fe7-4b9d-9052-0dfee4f87456', 'Renault', 'Kangoo ZE', '2023', 'Eléctrico', '0582VVJ', '4YD0YBN19YUCNBC99', 'active', false, '41.738502', '-4.723215', 'renault-kangoo ze-4', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_5', '0734df1e-28bd-48ab-906f-fa0206d316db', 'VEH005', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'f990982a-1b7a-48cc-89a8-7766bc978200', 'Iveco', 'Daily', '2018', 'Furgoneta', '7674SWT', 'CVY47P6A2VCHDJYPR', 'active', false, '42.297872', '-8.815549', 'iveco-daily-5', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_6', 'c37b633a-f620-4142-8a7f-72f96c31c7fb', 'VEH006', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e309eedb-0fe7-4b9d-9052-0dfee4f87456', 'Volkswagen', 'Crafter', '2017', 'Furgoneta', '9931WMZ', 'W1D7E0EK2C6F8GHMA', 'active', true, '38.439026', '-0.410520', 'volkswagen-crafter-6', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_7', 'b4db2131-da59-48d0-9276-e59e11b9801c', 'VEH007', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e309eedb-0fe7-4b9d-9052-0dfee4f87456', 'Man', 'TGX', '2016', 'Camión', '5454VFY', '8V19XSM6Z4PLWBTZ4', 'active', true, '41.386994', '2.094995', 'man-tgx-7', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_8', 'deea4f80-7fc9-4470-a7b7-be3f362a6b9b', 'VEH008', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Man', 'TGX', '2016', 'Camión', '8424SRY', 'X0CNJHE0BTJNLYRD3', 'active', false, '37.942290', '-4.773802', 'man-tgx-8', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_9', 'be761f6c-d6cd-40d8-802b-8de10e008418', 'VEH009', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Volkswagen', 'Crafter', '2024', 'Furgoneta', '5271WBV', 'XZC5TRSDSX3PS5DUJ', 'active', false, '40.474898', '-3.734195', 'volkswagen-crafter-9', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_10', 'd7747fbc-50b8-4bb8-a7a3-c8a4a354f3b0', 'VEH010', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'cdeb0703-2496-4125-9c26-6e9f81cf8a9c', 'Ford', 'Transit', '2015', 'Furgoneta', '5592DBL', 'LT4KU01Z76JU8RT32', 'active', false, '37.226210', '-3.558547', 'ford-transit-10', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_11', 'aec2bc29-693d-4d48-b9c6-4097127af368', 'VEH011', '3bc9ef59-698b-4859-878a-ce336f2c022d', '91ea8440-22ac-4443-a25e-5bd0ebe31dec', 'Nissan', 'e-NV200', '2020', 'Eléctrico', '8119ZDS', '5030VJ0F33C7VYN7Z', 'active', false, '40.469297', '-3.693030', 'nissan-e-nv200-11', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_12', 'a22875f2-fa6b-4b56-a3c8-2300c05ef37a', 'VEH012', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Renault', 'Kangoo ZE', '2017', 'Eléctrico', '1388DBX', 'E2YS794HZWXUKNJ8M', 'active', false, '37.899360', '-4.790474', 'renault-kangoo ze-12', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_13', 'abfeeb25-6ea5-4075-ba36-d4c101187ca7', 'VEH013', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5c1bc265-58ac-4063-b4dd-db743377985f', 'Nissan', 'e-NV200', '2020', 'Eléctrico', '7082CST', 'FT938P86V3Y5NBH7K', 'active', false, '37.177789', '-3.515265', 'nissan-e-nv200-13', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_14', 'a6bcef81-f789-47b1-b352-904c2718f860', 'VEH014', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Nissan', 'e-NV200', '2019', 'Eléctrico', '7283NYP', '2M4K4FUTV160PN8VJ', 'active', false, '43.504786', '-5.722126', 'nissan-e-nv200-14', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_15', '8eedd4ac-5bc1-4bf9-9b06-f53d387a9b40', 'VEH015', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Yamaha', 'NMAX', '2018', 'Moto', '0959VSB', 'XF8S9GD2DU02HJH69', 'active', false, '42.767652', '-2.770956', 'yamaha-nmax-15', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_16', '550b3837-2d16-4506-ac64-8128815ecc48', 'VEH016', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Volkswagen', 'Crafter', '2015', 'Furgoneta', '9635WTJ', 'ENKM2710RS5R1JTX4', 'active', false, '37.976405', '-4.733347', 'volkswagen-crafter-16', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_17', '2af74ca3-88be-46ca-813f-695b26a98d0a', 'VEH017', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Honda', 'PCX', '2022', 'Moto', '7777TXP', '1U5P1TJSE3145DF1G', 'active', true, '41.698627', '-4.630092', 'honda-pcx-17', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_18', 'ab54a2db-4938-4c76-89b1-c0eb5e43d4f7', 'VEH018', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Renault', 'Kangoo ZE', '2023', 'Eléctrico', '9721BFR', 'GGAJ3ZAPPYWBTVPLY', 'active', true, '41.424278', '2.124076', 'renault-kangoo ze-18', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_19', '497b9693-7c26-49f1-8aab-606e9640d2da', 'VEH019', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Nissan', 'e-NV200', '2021', 'Eléctrico', '0550MBK', '67FUE7UN3GPHF0ZX0', 'active', true, '41.453494', '2.135780', 'nissan-e-nv200-19', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_20', '35888847-1565-4281-af4f-9a6a43ceca2a', 'VEH020', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'f990982a-1b7a-48cc-89a8-7766bc978200', 'Scania', 'R500', '2015', 'Camión', '1254NZN', 'P09NSV0EU758JPJ2V', 'active', false, '41.688839', '-4.769537', 'scania-r500-20', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_21', '33195784-d3e3-47cf-9f86-4a99529dd611', 'VEH021', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Man', 'TGX', '2023', 'Camión', '8973FJH', '9JRR46GS5HXV5MYWP', 'active', false, '43.295368', '-8.326055', 'man-tgx-21', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_22', 'd6942ca1-2c31-4820-ba16-c2a246435b6d', 'VEH022', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '9e9afca0-e00d-4263-92cc-e140de9971eb', 'Scania', 'R500', '2017', 'Camión', '2318RLY', 'RAR9LTL59BF5JPF9D', 'active', true, '37.830810', '-4.719423', 'scania-r500-22', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_23', '2a744e14-26b3-4884-bc66-638452eb1168', 'VEH023', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Volvo', 'FH', '2024', 'Camión', '2696BWP', 'EXZL0W9TSCKA203DM', 'active', true, '43.215188', '-2.917370', 'volvo-fh-23', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_24', 'd908da62-a86c-4f2b-b69b-133791060b8b', 'VEH024', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Man', 'TGX', '2018', 'Camión', '1501VGW', 'ZX81VA1CKJUUJ5FV9', 'active', true, '43.273636', '-3.024068', 'man-tgx-24', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_25', 'c55f2db4-c542-41b1-9872-f532ad0fbe52', 'VEH025', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'df81316b-5c4d-4dc9-93bf-2e0f91e0c652', 'Renault', 'Kangoo ZE', '2020', 'Eléctrico', '1460MRS', 'AKDVK2BTAS97N5Z7L', 'active', false, '41.560241', '-0.877980', 'renault-kangoo ze-25', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_26', '1b239127-c1f9-4fcf-9bb0-89030c70e6cc', 'VEH026', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Volkswagen', 'Crafter', '2017', 'Furgoneta', '0328MLJ', '1WRBDS5J3429BY76G', 'active', true, '43.607225', '-5.691871', 'volkswagen-crafter-26', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_27', 'a3d8d96e-e956-4279-80b8-843110743acc', 'VEH027', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Nissan', 'e-NV200', '2024', 'Eléctrico', '3440TYJ', '78RL23R6JGMWD433B', 'active', true, '41.625202', '-0.954103', 'nissan-e-nv200-27', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_28', 'fa45f076-7288-4420-a6e3-e67a9fab6a98', 'VEH028', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Nissan', 'e-NV200', '2016', 'Eléctrico', '9606YYB', 'F1VDJKAFJ68TL5RFV', 'active', false, '43.315385', '-8.483643', 'nissan-e-nv200-28', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_29', '9d9897af-558c-4c9b-a3b2-dfa82d279258', 'VEH029', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'f990982a-1b7a-48cc-89a8-7766bc978200', 'Ford', 'Transit', '2018', 'Furgoneta', '5092RZV', 'D5EGLE90NYKM425KS', 'active', false, '37.264306', '-3.689330', 'ford-transit-29', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_30', '91a7e3d2-d8f0-4ea0-9fcf-28a358847f16', 'VEH030', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Nissan', 'e-NV200', '2022', 'Eléctrico', '6104LZH', '39ALJELXE58JPUAUC', 'active', false, '41.391929', '2.054913', 'nissan-e-nv200-30', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_31', '213e26da-991e-48fd-9562-c4af2a2933d9', 'VEH031', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ccd08f51-67c3-423e-ba7f-550881ef4c9e', 'Honda', 'PCX', '2022', 'Moto', '7849FHH', 'NKX03H24PUTWW2R7W', 'active', true, '41.563833', '-4.743769', 'honda-pcx-31', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_32', '279eb670-713a-460b-aeae-e5952d632067', 'VEH032', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Mercedes', 'Actros', '2024', 'Camión', '6791ZZJ', '6381FNZTE4VUEHLM2', 'active', true, '28.107704', '-15.484073', 'mercedes-actros-32', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_33', 'c5746061-beaf-43c4-aa55-417ba55f267f', 'VEH033', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Renault', 'Kangoo ZE', '2019', 'Eléctrico', '0293WCX', '9ZCVPX7KDDUYXWM6E', 'active', false, '37.314571', '-5.916643', 'renault-kangoo ze-33', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_34', 'c77c307e-7bb5-4742-a3ec-cca979e868ef', 'VEH034', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'e309eedb-0fe7-4b9d-9052-0dfee4f87456', 'Honda', 'PCX', '2022', 'Moto', '0926SMM', '12CVUWXK9JS49MAH8', 'active', true, '38.333254', '-0.657248', 'honda-pcx-34', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_35', 'ab0b935e-2c93-4381-9098-10d9c1cd6279', 'VEH035', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Iveco', 'Daily', '2017', 'Furgoneta', '1927KJN', 'CBWZAXAWZ5X3WNSCW', 'active', true, '37.248605', '-3.583809', 'iveco-daily-35', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_36', 'd13dfa1b-a091-4e4e-998e-6d214f6c23cb', 'VEH036', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5c1bc265-58ac-4063-b4dd-db743377985f', 'Renault', 'Kangoo ZE', '2023', 'Eléctrico', '4368PXX', 'YYRHULA3B0L39KTW0', 'active', false, '43.365326', '-8.366481', 'renault-kangoo ze-36', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_37', '7a1e3bdb-975e-4333-bde5-0f165803b2be', 'VEH037', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Ford', 'Transit', '2015', 'Furgoneta', '2215KTV', '8HHDTC6LJ80XTE2EF', 'active', true, '40.403436', '-3.708838', 'ford-transit-37', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_38', '665cc78f-ebfa-454a-9c20-df64a516aa23', 'VEH038', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5c1bc265-58ac-4063-b4dd-db743377985f', 'Mercedes', 'Sprinter', '2021', 'Furgoneta', '5709ZYP', 'RZFE8V0HTYMJV2FAU', 'active', true, '38.315077', '-0.534804', 'mercedes-sprinter-38', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_39', 'c634cae6-2fff-463c-8aaf-cdf7b9534a57', 'VEH039', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'cdeb0703-2496-4125-9c26-6e9f81cf8a9c', 'Iveco', 'Daily', '2019', 'Furgoneta', '6312NXD', '1LMG16SM33EUW80XV', 'active', false, '42.767161', '-2.574503', 'iveco-daily-39', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_40', '18ba2353-1548-4bce-addc-3734ed5cb4f5', 'VEH040', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Iveco', 'Daily', '2016', 'Furgoneta', '4944YJP', 'PHLKLNRT6ADB71HX5', 'active', false, '37.963384', '-1.173827', 'iveco-daily-40', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_41', 'dcb5a0d9-1aaf-4443-9334-364a2cd07fe5', 'VEH041', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Yamaha', 'NMAX', '2019', 'Moto', '7304VWG', '5T1FSGJ0AUM3NWV0B', 'active', true, '39.664128', '2.722802', 'yamaha-nmax-41', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_42', '7b090f8e-d359-49e8-a203-d8142c5f1be5', 'VEH042', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'e309eedb-0fe7-4b9d-9052-0dfee4f87456', 'Ford', 'Transit', '2019', 'Furgoneta', '5002PXJ', 'JH78DK94SC80A6DS4', 'active', true, '37.966484', '-1.175517', 'ford-transit-42', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_43', '47d250db-fa99-4053-a068-7561003abc15', 'VEH043', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Volvo', 'FH', '2019', 'Camión', '2978BGV', '25LELC62ZMSR5G3X7', 'active', false, '43.502135', '-5.591606', 'volvo-fh-43', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_44', 'ca7b2f65-1ac5-45bd-9055-7f896fbf9549', 'VEH044', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Volvo', 'FH', '2018', 'Camión', '7066KJC', 'XDHK52YD8G3Y6P80D', 'active', true, '37.964469', '-1.060626', 'volvo-fh-44', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_45', 'b9302436-3e94-4617-b135-1c0dc2b39090', 'VEH045', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Nissan', 'e-NV200', '2020', 'Eléctrico', '7824RMJ', '1RB0ZDFCEW4NKDJ2X', 'active', false, '43.597330', '-5.609199', 'nissan-e-nv200-45', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_46', '3329b323-8111-422d-ad9c-ff8033a6d7ed', 'VEH046', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'b2e8d860-e6bd-4b15-b910-1bbddf3f86e1', 'Nissan', 'e-NV200', '2021', 'Eléctrico', '4565MJG', '7835V0K2CECDTM25R', 'active', true, '39.413895', '-0.289565', 'nissan-e-nv200-46', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_47', 'c9211e62-d18a-46eb-8153-cd98e134b870', 'VEH047', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Honda', 'PCX', '2022', 'Moto', '9601XXB', 'LN56KWLFA3S796S8T', 'active', false, '41.396460', '2.066641', 'honda-pcx-47', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_48', '653320cb-850c-4bd5-8490-5f5e56401005', 'VEH048', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Iveco', 'Daily', '2023', 'Furgoneta', '1660WVY', 'YDXEPVAF0UAU4WFE8', 'active', false, '36.716316', '-4.393699', 'iveco-daily-48', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_49', '9436f497-4ab7-40f1-bf3c-7f4e1178bdec', 'VEH049', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Renault', 'Master', '2020', 'Furgoneta', '5822ZHV', 'ZDFWAFHLZMRA7CRHM', 'active', true, '41.334232', '2.127951', 'renault-master-49', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_50', 'b84f1528-bde5-4f96-a55f-aa2648cfab4f', 'VEH050', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Mercedes', 'Sprinter', '2015', 'Furgoneta', '9028SNG', 'DYCYWEZXTB1CX6ECT', 'active', true, '37.833284', '-4.686977', 'mercedes-sprinter-50', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_51', 'a1e82599-001c-4f4b-82cc-e5510efb9b09', 'VEH051', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'f990982a-1b7a-48cc-89a8-7766bc978200', 'Yamaha', 'NMAX', '2024', 'Moto', '9860ZFZ', 'P6KJS9VPVTE9CNBBC', 'active', true, '43.174261', '-2.881251', 'yamaha-nmax-51', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_52', 'c8e930af-2f90-40a1-a3f6-44e2d41aaca5', 'VEH052', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Scania', 'R500', '2019', 'Camión', '4022HTV', 'PYKSB7NRJR7TNPFUY', 'active', false, '43.273142', '-8.399283', 'scania-r500-52', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_53', 'a3313836-a6de-4182-b0fb-ee53b134dcec', 'VEH053', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Volkswagen', 'Crafter', '2020', 'Furgoneta', '8149YRL', 'TG53RJ5GJK9U9BDSZ', 'active', false, '41.582313', '-4.768953', 'volkswagen-crafter-53', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_54', 'ca3a3922-0030-49ab-a1a7-119801556931', 'VEH054', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'df81316b-5c4d-4dc9-93bf-2e0f91e0c652', 'Yamaha', 'NMAX', '2019', 'Moto', '2075NYT', '7K6637M3F1D3X3EZ1', 'active', true, '39.546893', '-0.312276', 'yamaha-nmax-54', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_55', '9334e704-dc2d-464b-aeff-ea53fd6876c7', 'VEH055', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Man', 'TGX', '2020', 'Camión', '4934HLM', 'K28YR9W6J9LXAMR8G', 'active', true, '41.386617', '2.086255', 'man-tgx-55', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_56', '7d9218c0-6acb-4c8f-8998-2812c4abfe99', 'VEH056', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Yamaha', 'NMAX', '2019', 'Moto', '4709MSG', 'N00KWWEFSLDSU3YYK', 'active', true, '42.906320', '-2.590612', 'yamaha-nmax-56', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_57', 'bef6bfad-0d94-4e5e-b398-1dad4f191f2b', 'VEH057', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Nissan', 'e-NV200', '2015', 'Eléctrico', '9210VZJ', 'LH4E47Z7335JUEHAE', 'active', false, '37.922006', '-4.797721', 'nissan-e-nv200-57', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_58', 'c6d6e5dc-4a75-4ec3-9248-3cb02090d6fd', 'VEH058', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'df81316b-5c4d-4dc9-93bf-2e0f91e0c652', 'Man', 'TGX', '2021', 'Camión', '1752CPC', 'ZANWTDR38WTPMDP9X', 'active', true, '41.320404', '2.242427', 'man-tgx-58', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_59', '9ad8a4cc-edf4-4a5f-9b6f-dd8a511246b3', 'VEH059', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Mercedes', 'Sprinter', '2023', 'Furgoneta', '8365RXC', 'GDZ978FZ113HEWR31', 'active', true, '39.617854', '2.623030', 'mercedes-sprinter-59', NOW(), NOW());

INSERT INTO vehicles (_key, uuid, public_id, company_uuid, vendor_uuid, make, model, year, type, plate_number, vin, status, online, latitude, longitude, slug, created_at, updated_at) VALUES
('vehicle_60', 'cdeb788e-7409-4239-9836-56bfdae71747', 'VEH060', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Scania', 'R500', '2021', 'Camión', '6695YZS', 'LCXHNJ54L2UMKJKPA', 'active', false, '37.864332', '-4.763299', 'scania-r500-60', NOW(), NOW());

-- ========================================
-- 7. RELACIÓN FLOTA-CONDUCTORES (Fleet Drivers)
-- ========================================
INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_1', '036d17dc-7969-41a2-8d3a-0d184ddf6bc4', 'dee565d8-1eb3-4363-ba25-90d1ab5dc6b6', '41a53b11-4f2c-4ac2-910b-e2d19d71ad1b', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_2', '552f54fc-4c64-4cbb-84c8-5ef3148a3038', '293891ee-f0ba-45f8-8a61-6a8dfc03f1bc', '43ad9ea3-7d19-454d-ae95-6a7b0cbe81da', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_3', '52562850-4912-487a-91b4-2ef534f1610e', 'c8591701-2003-4dfc-a9f4-f28975c185b0', 'e9813b0b-0680-4d59-9d7f-7ad5ed690c91', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_4', 'cecfcde4-7911-479e-848c-b019544ced5a', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', '65215931-7bbf-4c4c-8ec9-12af635bbf7f', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_5', '01aa5476-6c48-4cad-ba22-f5470c493241', '6cafeb70-3162-4e35-ac5a-89ce43fdd1d2', 'd4516faa-23ea-4895-9477-a0ff77dd1535', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_6', '301d9324-886e-46c0-83d7-be5db80f8766', 'dee565d8-1eb3-4363-ba25-90d1ab5dc6b6', '4730e4c9-46b9-48bc-817f-3e8e31ed94cb', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_7', '5b446dee-56db-4dc1-8f4a-f25537b543b4', '4014b2f6-0aa5-44a7-961c-00a47e811110', '5b4652f1-9c32-4429-ba6a-04b4295215b8', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_8', 'f2fa10f5-7b77-4dab-aacc-8c57eb1a1331', '11c46b56-fab5-4c95-ac78-55698c14b381', '03c5d78e-4c4f-4281-ac9c-b4af784c3821', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_9', 'd3ef1cbf-f5ca-4c21-868c-a907ec45873f', '434bc1d8-93c0-43eb-9bfa-953a5359b8a7', 'e31d1c29-1754-4cd7-9166-8a0380fe3202', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_10', '68f47544-f9b4-447e-9d0e-45297a93eba4', 'a31ef3dc-bbfd-46cd-b255-36e4eff2b956', 'fbbeed09-de67-4270-bdce-a1d43a650f85', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_11', '8c809c9a-0e6e-4b94-bcd2-24e9392e9cf6', 'a31ef3dc-bbfd-46cd-b255-36e4eff2b956', '105f897f-4160-411f-a730-f004b2e2b6e4', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_12', 'b37dd474-df25-4b9f-af3c-6d2bef2ba531', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', '9f9b2e1f-0c91-497a-9901-7054f3747119', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_13', '53521454-517e-4eb9-b1d7-3e14ebcc0afd', 'dee565d8-1eb3-4363-ba25-90d1ab5dc6b6', '70c04768-2c72-4d82-83ee-75d5246344bc', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_14', '33963f6b-3bf3-4d30-8572-246baab0b5ed', 'a27e4d3f-370a-4050-a001-e89f69df6c8d', '1fcea0f2-0251-4b12-bf77-b50d9d363df4', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_15', '5203f29c-dc65-4d82-a5da-5aae10a01995', '6cafeb70-3162-4e35-ac5a-89ce43fdd1d2', '5b29752f-098a-4fc4-859a-26505711fbb6', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_16', 'e2ed66b9-5132-468b-bba5-f2c749d5a196', 'c8591701-2003-4dfc-a9f4-f28975c185b0', 'ae04ba30-c338-444d-a5ad-2349e39dc189', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_17', '768f530e-ebfa-4e0a-b51d-e53d9674063a', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', 'b3be37d3-b17e-4b87-8ae3-80fde85042c5', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_18', 'da200e41-4211-4ffc-86b8-2aa1a134b6a9', '4014b2f6-0aa5-44a7-961c-00a47e811110', '391c34e6-b519-4cb7-8592-b86ac664b8ec', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_19', '7877005f-2272-47e9-a060-dd2fcf2d964d', 'a31ef3dc-bbfd-46cd-b255-36e4eff2b956', 'f5dd443b-223e-4d78-a340-0478ff44a66b', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_20', '5c301fe6-88a6-4dcd-9e3a-92fac1fa72e9', '4014b2f6-0aa5-44a7-961c-00a47e811110', 'f550fc5a-3ca3-48b8-b57b-5dcd3b3bd2d4', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_21', 'a117ca10-85a9-417c-ab26-d7883a08f4e5', '293891ee-f0ba-45f8-8a61-6a8dfc03f1bc', '2bc6d0e7-aaac-48cb-89d2-7cb74a54375a', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_22', 'd290c522-620f-4553-bb50-b4c413587d51', '4014b2f6-0aa5-44a7-961c-00a47e811110', '3084563c-0d94-454e-8adf-d85100582946', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_23', 'b36ca33d-2164-473d-b2c5-b95d9bbb9248', 'c66faf32-c43c-4291-bc3c-8e02a224528d', 'a4d61a8f-74e4-43fa-a3f2-b011a968469e', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_24', 'e1dac8ad-693e-4c7c-a85b-be32b68fcbfb', 'f032308b-f3c8-4718-9291-bcf838ca1207', 'c456d9df-baad-4511-98d6-b1bc0b9963a9', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_25', 'ed417a96-c03d-46e3-8ce3-223773700e17', '4014b2f6-0aa5-44a7-961c-00a47e811110', 'e5523494-e835-48be-87e2-f003080e6dbd', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_26', 'bdf68c78-d7a4-430a-87ef-94f1aed85254', 'a27e4d3f-370a-4050-a001-e89f69df6c8d', 'da1a69e3-e434-42d1-b393-224bbda40a32', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_27', '61d447a5-ed1c-4c2c-b8a6-5a1f724e2221', '11c46b56-fab5-4c95-ac78-55698c14b381', '90e7a4de-e453-45b2-97a4-d5caa26c25f8', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_28', '81e6443e-db03-490c-b88f-1753bde0b520', 'a31ef3dc-bbfd-46cd-b255-36e4eff2b956', '05857931-8db8-4923-b471-97fd1aba42e5', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_29', '2235d617-2061-49ea-9eb3-1535db2511a6', '46d170dc-d163-45dd-848a-6c9a2ad6f9cd', '4f77e647-7646-4b30-a7a7-d4c299e98e71', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_30', '03f077a0-d84a-4413-935b-eac72396f56b', 'c66faf32-c43c-4291-bc3c-8e02a224528d', 'b613c1e7-fcca-4ddc-a87c-026887281a8b', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_31', 'd22d1691-c96e-4000-9fca-b2d40da7f853', '11c46b56-fab5-4c95-ac78-55698c14b381', '572c8b69-f75d-44db-9f7a-d0e2f8f833ea', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_32', '01bd40f2-e28b-4c0e-825b-ba9a9baff03f', '9e2c14b8-c650-4b4c-8291-c5fa08055097', 'f99e759e-f25c-4308-a6c3-7a2203eb77fa', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_33', 'fd3f5725-cdec-490b-b915-9f38354377cc', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', '16823146-eee1-46af-a809-15767c3c2486', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_34', 'f9669e16-b29b-48f1-bbec-e1880d52006f', 'c8591701-2003-4dfc-a9f4-f28975c185b0', '621bfdad-36e7-4f0b-9aeb-dd451849dc3d', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_35', '07723943-5334-4b3b-a80e-42f02091bbba', '434bc1d8-93c0-43eb-9bfa-953a5359b8a7', '2588e8d0-a05a-4070-a585-ba79aadb88c6', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_36', 'f8f32664-0f11-4731-85e2-65280aff6811', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', 'ed22ee37-28f4-4fe0-ac64-44e4e174e5c6', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_37', 'd39ba76b-1a40-4139-bdfd-39065f91ce5f', '293891ee-f0ba-45f8-8a61-6a8dfc03f1bc', 'f3e1a540-3f44-4b2f-80c9-b893a627c1dd', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_38', '35f253a2-daa5-4630-b440-64eff887bbc0', 'c8591701-2003-4dfc-a9f4-f28975c185b0', '6ec285e6-d62b-464e-a059-777707e38ca8', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_39', '689b4bd7-7068-4aea-87cc-45b80081fa9f', '11c46b56-fab5-4c95-ac78-55698c14b381', '14db45a6-c04b-49d7-ad51-ae75d11a934e', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_40', '19e0e87a-0518-403c-8379-484f7dcb25ee', 'c66faf32-c43c-4291-bc3c-8e02a224528d', 'b4764ca7-deb6-4a47-913f-3a5143d56c98', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_41', '6c0b0779-8e97-4378-9f24-33d7ce26df31', '4014b2f6-0aa5-44a7-961c-00a47e811110', '497b8716-bdfa-48dc-8cd4-9d4dcb1a6341', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_42', '5928e32c-8a11-47c9-b60c-1fbde9f67eba', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', '42a645d2-bf1f-42c0-957c-09500c74060f', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_43', '4e845342-1a18-41a4-85fc-1f63066a3676', 'a31ef3dc-bbfd-46cd-b255-36e4eff2b956', '697c52a5-31d0-4864-acb7-683615d366ec', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_44', '9469156c-aef5-423d-9e02-c5c3fb5a4a58', 'dee565d8-1eb3-4363-ba25-90d1ab5dc6b6', '7c8bf8a1-a0e8-41bc-a531-794563607aff', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_45', 'd0587766-0e85-4c1c-b413-44f0c4307fa2', '4014b2f6-0aa5-44a7-961c-00a47e811110', '6ff944e5-425c-4be5-954a-2be796586cf8', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_46', '4493a570-adb0-4e92-a38b-eab1dfa1cfe1', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', '85f97c62-7282-4dc1-997b-a34ff13ac9b7', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_47', 'b9526668-8e1c-48c2-a39f-4300cd5b906e', 'f032308b-f3c8-4718-9291-bcf838ca1207', 'c83af5f4-9301-44ae-bb66-32b8c8f61e2e', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_48', 'e918974a-367c-49b9-93c0-030c9c678755', '6cafeb70-3162-4e35-ac5a-89ce43fdd1d2', 'bedf125d-f52e-401a-9703-49a54fa2528b', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_49', '6a94ff7e-1df5-461d-96ed-941867637c62', '9e2c14b8-c650-4b4c-8291-c5fa08055097', '7568650d-b0a8-423a-bcdf-84d8098ed77f', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_50', 'e1d5d4c0-f65d-4586-91ef-85cd0a7f7148', 'c66faf32-c43c-4291-bc3c-8e02a224528d', 'c3aa6ff4-de59-4a70-82a8-06d1b54c6c22', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_51', '3e271b68-8c8e-4406-92a6-6ca3b4adb35f', '293891ee-f0ba-45f8-8a61-6a8dfc03f1bc', 'a88d16bc-aada-46e3-883b-3610f19a4e4b', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_52', '197dddb6-7408-4264-a9fb-11bd3dc8aabe', '4014b2f6-0aa5-44a7-961c-00a47e811110', '2ccf82a0-402b-4d48-92c6-c95d44950480', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_53', '73465335-169a-4181-918e-cbf257efa61b', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', '57d13c60-2757-4c6b-b346-535ec6cc07b7', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_54', '240240d8-b59e-4cc5-b768-16aadd5056b5', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', '1b0c14af-edcf-4ead-b768-83e35989eb0d', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_55', 'e53b22d4-f78b-46d2-9792-7bd856ca7be7', '11c46b56-fab5-4c95-ac78-55698c14b381', 'a3b8b9da-3d60-4995-91de-c20da5ecc600', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_56', 'eae7cb16-ceb3-4056-9e06-4bdaedb991c1', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', '117a319a-56a6-4c16-9cb9-c1a1c8a7c778', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_57', '6c445638-b7da-4885-9869-a07af21be366', '11c46b56-fab5-4c95-ac78-55698c14b381', 'd4067654-8d8a-48e3-9719-1d73de6f4baa', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_58', '7c94b0f1-c670-46f9-a156-f4de908fc404', 'c8591701-2003-4dfc-a9f4-f28975c185b0', '36d07950-d06a-4369-ab88-bbe023d3959f', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_59', '5b8e2f82-71d3-4067-ad93-52af853dd567', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', '7a2c5607-248b-48ed-b433-ba9656743b7c', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_60', '33450953-493f-4ca8-a391-3aee9b23f1e3', '434bc1d8-93c0-43eb-9bfa-953a5359b8a7', '8a053a76-b603-4ff8-8887-7fb4e38356d3', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_61', 'eccf071d-c7ac-4a16-b27b-06b8674c3855', '434bc1d8-93c0-43eb-9bfa-953a5359b8a7', 'dd41aea7-d1f9-4465-8573-60a2902fd422', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_62', '023067ac-f20c-42b7-aeef-b04479b6a4ca', 'dee565d8-1eb3-4363-ba25-90d1ab5dc6b6', '504d43ae-540b-4a73-89b7-bc011244556d', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_63', 'b75e2385-f051-4ee7-8c60-454bb2c7a36e', 'f032308b-f3c8-4718-9291-bcf838ca1207', '4228b2c3-0267-4e76-b3a3-def30ae82a22', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_64', 'ad425fc2-bdb9-4c63-96f3-45c775d48319', 'c8591701-2003-4dfc-a9f4-f28975c185b0', '7c5012c1-d38a-4370-ac45-2191a0d1c35b', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_65', '8161d270-6570-47e7-8f92-6f3efee9d193', '6cafeb70-3162-4e35-ac5a-89ce43fdd1d2', '6d941154-4b46-432d-9e24-f1de269b532c', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_66', '4c8d52f5-cb3c-4609-87d5-9b22652e4895', '46d170dc-d163-45dd-848a-6c9a2ad6f9cd', '950c612b-3775-4102-b1c5-d529e6e76349', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_67', 'fd77631a-d983-44a3-ba04-f70e609f5bbc', '6cafeb70-3162-4e35-ac5a-89ce43fdd1d2', 'ffe8b58d-e0d4-44b3-b63b-fca6d5f50e23', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_68', '1437dd96-efaa-4ed2-b01d-24c8571526ff', '46d170dc-d163-45dd-848a-6c9a2ad6f9cd', '92d39d43-ecf4-4db5-8a6e-fd9d75c9af1d', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_69', '93aeb343-4fc5-4c9c-bdab-23423624986d', 'dee565d8-1eb3-4363-ba25-90d1ab5dc6b6', '543fb08b-9a78-4b77-9c95-dc6cb36020c4', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_70', '82cc6395-f38c-49c6-a30e-cbd0f094602a', '434bc1d8-93c0-43eb-9bfa-953a5359b8a7', 'de3a152d-e14d-4225-8ea2-9187e3cbb2c7', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_71', '91665292-04fb-4838-a6c5-35569bcf32a3', 'c66faf32-c43c-4291-bc3c-8e02a224528d', 'ffe3505b-83bd-4405-8350-865d522ed2c4', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_72', 'f4646338-9fb4-41a7-89f0-fdae5cf0c1f7', '434bc1d8-93c0-43eb-9bfa-953a5359b8a7', 'cf5b29d1-3bf9-4aff-acc6-04755dd57519', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_73', '8e2d40af-4609-4b61-ada5-338f88bb6880', 'dee565d8-1eb3-4363-ba25-90d1ab5dc6b6', '476ea515-58c0-4232-b812-3f4d99c89ea4', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_74', '710132bc-dce5-4be3-aa49-05845e3499b9', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', '9753af3b-d7ab-4ce1-8b31-8cded28fc881', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_75', '57cf245a-cf0d-4988-9f95-b0877becd284', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', '73064771-03bc-4af5-b004-5462b4b7b2a5', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_76', '8a37733c-f194-43e4-b1ec-d97c9d54c817', '6cafeb70-3162-4e35-ac5a-89ce43fdd1d2', '56b01889-ef06-45a6-a7cb-dcfb14600ef1', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_77', '18cf577a-3d4a-46f6-8032-da369c5335aa', 'dee565d8-1eb3-4363-ba25-90d1ab5dc6b6', 'f623a834-2f4c-4194-8c5f-30bcf26da51a', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_78', '263434bc-e06b-44f7-b8e2-26101395f093', '6cafeb70-3162-4e35-ac5a-89ce43fdd1d2', '387c111c-5c3c-4b8d-ad00-45457acacdd4', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_79', '783a7282-eb23-442b-b037-91a8e9c56820', 'a27e4d3f-370a-4050-a001-e89f69df6c8d', '6c45492b-913a-4e97-b0c3-3570efacf2eb', NOW(), NOW());

INSERT INTO fleet_drivers (_key, uuid, fleet_uuid, driver_uuid, created_at, updated_at) VALUES
('fleet_driver_80', '37911d74-a147-4747-bd52-601d5f834959', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', '4251aaf7-3a02-43a9-b24c-9df5fb04345b', NOW(), NOW());

-- ========================================
-- 8. RELACIÓN FLOTA-VEHÍCULOS (Fleet Vehicles)
-- ========================================
INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_1', 'e76d56a3-e87d-4d37-a29c-4b50fa04d04e', '46d170dc-d163-45dd-848a-6c9a2ad6f9cd', '74bbccbb-9b82-42bb-b4f4-97439b6c8f7a', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_2', '25156cc2-5a1f-45a3-a4e8-e5f2112f5a62', '11c46b56-fab5-4c95-ac78-55698c14b381', 'e695b368-ccf0-4720-866d-9eb1a339c5f6', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_3', '9d3012cd-6081-4369-9f53-0cbc5db19288', '6cafeb70-3162-4e35-ac5a-89ce43fdd1d2', '25487c75-d6b1-4215-87ee-0053a01c6397', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_4', '40733c8c-5462-4cea-8657-d13851546384', '434bc1d8-93c0-43eb-9bfa-953a5359b8a7', '8a0739bb-42ac-4182-ac31-837d4cb41e0f', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_5', '0ed051aa-9546-43da-978e-696e03f7387a', '4014b2f6-0aa5-44a7-961c-00a47e811110', '0734df1e-28bd-48ab-906f-fa0206d316db', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_6', 'c2a12f25-a7ed-4c53-bd7b-a64f52576afc', 'a31ef3dc-bbfd-46cd-b255-36e4eff2b956', 'c37b633a-f620-4142-8a7f-72f96c31c7fb', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_7', '36f474bb-98c5-46ce-aa82-aa40bd2f6d8a', '4014b2f6-0aa5-44a7-961c-00a47e811110', 'b4db2131-da59-48d0-9276-e59e11b9801c', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_8', '86cf9b1e-35e4-4356-8831-cd616f254510', '11c46b56-fab5-4c95-ac78-55698c14b381', 'deea4f80-7fc9-4470-a7b7-be3f362a6b9b', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_9', '28aa68b0-96d0-461e-84b5-c4f5373c87e7', '6cafeb70-3162-4e35-ac5a-89ce43fdd1d2', 'be761f6c-d6cd-40d8-802b-8de10e008418', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_10', 'c8a46086-99aa-4bad-889a-1a44c5e34aeb', 'dee565d8-1eb3-4363-ba25-90d1ab5dc6b6', 'd7747fbc-50b8-4bb8-a7a3-c8a4a354f3b0', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_11', '791b8eee-3ac6-401b-9a4d-250f4a7ab984', 'a31ef3dc-bbfd-46cd-b255-36e4eff2b956', 'aec2bc29-693d-4d48-b9c6-4097127af368', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_12', '9bff6a99-7824-4e6e-8c1b-a21956288ab5', '4014b2f6-0aa5-44a7-961c-00a47e811110', 'a22875f2-fa6b-4b56-a3c8-2300c05ef37a', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_13', '17d1a756-d29b-4214-93c5-8a90c734f039', '293891ee-f0ba-45f8-8a61-6a8dfc03f1bc', 'abfeeb25-6ea5-4075-ba36-d4c101187ca7', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_14', 'f3302099-12f2-44d0-8a19-62a6f5df7523', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', 'a6bcef81-f789-47b1-b352-904c2718f860', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_15', '622917ca-c260-4df0-9210-0e2f17923b76', '11c46b56-fab5-4c95-ac78-55698c14b381', '8eedd4ac-5bc1-4bf9-9b06-f53d387a9b40', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_16', 'ce508075-8ae6-4de2-afb8-a7e8f524c43d', 'c66faf32-c43c-4291-bc3c-8e02a224528d', '550b3837-2d16-4506-ac64-8128815ecc48', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_17', '33de5708-4f8f-483c-a9d7-1f4c61b6d2c3', '434bc1d8-93c0-43eb-9bfa-953a5359b8a7', '2af74ca3-88be-46ca-813f-695b26a98d0a', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_18', '8742c4fa-c2f7-4b3a-a676-66534d777ed2', '46d170dc-d163-45dd-848a-6c9a2ad6f9cd', 'ab54a2db-4938-4c76-89b1-c0eb5e43d4f7', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_19', 'df410c2e-7f0f-4f5a-8ca0-8872cc9a371e', '46d170dc-d163-45dd-848a-6c9a2ad6f9cd', '497b9693-7c26-49f1-8aab-606e9640d2da', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_20', 'eac65272-a7ec-416d-aec2-9ee0c781dab8', '11c46b56-fab5-4c95-ac78-55698c14b381', '35888847-1565-4281-af4f-9a6a43ceca2a', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_21', '4db9599b-6260-4fda-a7f8-f3f557a08886', '11c46b56-fab5-4c95-ac78-55698c14b381', '33195784-d3e3-47cf-9f86-4a99529dd611', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_22', '36fe7dc8-ab0a-4609-8988-c18bfba4bd19', '6cafeb70-3162-4e35-ac5a-89ce43fdd1d2', 'd6942ca1-2c31-4820-ba16-c2a246435b6d', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_23', '982854e5-7223-49f8-86f9-432bc44ba994', '293891ee-f0ba-45f8-8a61-6a8dfc03f1bc', '2a744e14-26b3-4884-bc66-638452eb1168', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_24', '4253e46b-e8c5-4545-9db9-818addc6813c', '9e2c14b8-c650-4b4c-8291-c5fa08055097', 'd908da62-a86c-4f2b-b69b-133791060b8b', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_25', 'f108d383-0895-4e59-855d-8792f6891755', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', 'c55f2db4-c542-41b1-9872-f532ad0fbe52', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_26', '8b99b144-ea28-4739-9314-6fe404419c7e', '4014b2f6-0aa5-44a7-961c-00a47e811110', '1b239127-c1f9-4fcf-9bb0-89030c70e6cc', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_27', '5f1f8c6e-69f0-46e4-a132-2a3cdd7ad6a7', '4014b2f6-0aa5-44a7-961c-00a47e811110', 'a3d8d96e-e956-4279-80b8-843110743acc', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_28', 'b4cd14c9-7a4e-41f9-9a6e-86942e1dcaf9', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', 'fa45f076-7288-4420-a6e3-e67a9fab6a98', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_29', '1c5c170d-0693-4795-ad6c-a55b95defdc0', 'dee565d8-1eb3-4363-ba25-90d1ab5dc6b6', '9d9897af-558c-4c9b-a3b2-dfa82d279258', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_30', 'b0812a25-0b33-4fba-bfdf-d41583813655', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', '91a7e3d2-d8f0-4ea0-9fcf-28a358847f16', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_31', 'c46e0da7-cc86-485f-9ae7-26e646c0c7e2', '4014b2f6-0aa5-44a7-961c-00a47e811110', '213e26da-991e-48fd-9562-c4af2a2933d9', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_32', 'ad06a2e6-2cd9-413a-b00d-77af5aa12e11', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', '279eb670-713a-460b-aeae-e5952d632067', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_33', 'caacdaa2-7376-4af7-886f-1a8c69040da8', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', 'c5746061-beaf-43c4-aa55-417ba55f267f', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_34', '58f50bdb-b0ba-4b22-883b-e4721f7ac12f', 'a31ef3dc-bbfd-46cd-b255-36e4eff2b956', 'c77c307e-7bb5-4742-a3ec-cca979e868ef', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_35', '3a031da7-8069-49e0-bb3e-49271232167c', 'f032308b-f3c8-4718-9291-bcf838ca1207', 'ab0b935e-2c93-4381-9098-10d9c1cd6279', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_36', 'a6b8cac8-263e-4feb-b650-015358c67112', 'a27e4d3f-370a-4050-a001-e89f69df6c8d', 'd13dfa1b-a091-4e4e-998e-6d214f6c23cb', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_37', 'b7cfb44f-b1ca-4e37-a75a-95cdb0189cef', '293891ee-f0ba-45f8-8a61-6a8dfc03f1bc', '7a1e3bdb-975e-4333-bde5-0f165803b2be', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_38', '7c08f6b6-37da-4d7a-95df-d7df863937c1', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', '665cc78f-ebfa-454a-9c20-df64a516aa23', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_39', '1897bbd8-aa1c-490f-b457-6aed44a46e99', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', 'c634cae6-2fff-463c-8aaf-cdf7b9534a57', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_40', 'cec86b21-d971-448f-bc35-eb534b7c4a18', '293891ee-f0ba-45f8-8a61-6a8dfc03f1bc', '18ba2353-1548-4bce-addc-3734ed5cb4f5', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_41', '5e5f1210-8bda-4890-99f4-d27eaa352dcc', '46d170dc-d163-45dd-848a-6c9a2ad6f9cd', 'dcb5a0d9-1aaf-4443-9334-364a2cd07fe5', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_42', 'c55264e6-14fe-462c-9eeb-226f6af22ac4', '434bc1d8-93c0-43eb-9bfa-953a5359b8a7', '7b090f8e-d359-49e8-a203-d8142c5f1be5', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_43', '3b6267a8-dacd-46f0-973d-098d150740b6', '11c46b56-fab5-4c95-ac78-55698c14b381', '47d250db-fa99-4053-a068-7561003abc15', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_44', 'fbbda0b3-4d4e-4dbb-bb47-1b352738f5f5', '46d170dc-d163-45dd-848a-6c9a2ad6f9cd', 'ca7b2f65-1ac5-45bd-9055-7f896fbf9549', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_45', 'dcb2a6ba-eeb4-4113-80c7-66ec97e47a67', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', 'b9302436-3e94-4617-b135-1c0dc2b39090', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_46', 'c02ecad8-64af-4970-ac9c-55478dfd796f', '6cafeb70-3162-4e35-ac5a-89ce43fdd1d2', '3329b323-8111-422d-ad9c-ff8033a6d7ed', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_47', '8d5f27c2-7af9-4de0-83d3-a988950cbfcb', 'ec225d1e-0823-4f0d-9acb-9c41f0c2d417', 'c9211e62-d18a-46eb-8153-cd98e134b870', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_48', '807ef16b-1b09-4579-bbf7-34f688a33ff8', 'a31ef3dc-bbfd-46cd-b255-36e4eff2b956', '653320cb-850c-4bd5-8490-5f5e56401005', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_49', '286729b1-dc41-4b84-b149-e09ed613cc04', '11c46b56-fab5-4c95-ac78-55698c14b381', '9436f497-4ab7-40f1-bf3c-7f4e1178bdec', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_50', '4e9f0402-b6a0-46a2-b7c4-d5451f5c267f', '293891ee-f0ba-45f8-8a61-6a8dfc03f1bc', 'b84f1528-bde5-4f96-a55f-aa2648cfab4f', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_51', '8b8235f0-43ad-4cc6-bd85-ce3cb9ea2f5e', '434bc1d8-93c0-43eb-9bfa-953a5359b8a7', 'a1e82599-001c-4f4b-82cc-e5510efb9b09', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_52', 'c38fbace-4954-4125-9484-369dfc881bb1', '434bc1d8-93c0-43eb-9bfa-953a5359b8a7', 'c8e930af-2f90-40a1-a3f6-44e2d41aaca5', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_53', 'e7b594ce-6f72-4e95-a48d-da3aa45060c2', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', 'a3313836-a6de-4182-b0fb-ee53b134dcec', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_54', 'd2ee8531-116e-4320-9510-f5497ce295b1', '11c46b56-fab5-4c95-ac78-55698c14b381', 'ca3a3922-0030-49ab-a1a7-119801556931', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_55', 'f30b6d69-af78-41f9-af4f-3786677571ac', '46d170dc-d163-45dd-848a-6c9a2ad6f9cd', '9334e704-dc2d-464b-aeff-ea53fd6876c7', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_56', 'c7fa4098-d02e-41fe-945b-6c9d1b498df6', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', '7d9218c0-6acb-4c8f-8998-2812c4abfe99', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_57', 'd91b0f23-3506-432b-8a56-4cd80fe5416f', '4014b2f6-0aa5-44a7-961c-00a47e811110', 'bef6bfad-0d94-4e5e-b398-1dad4f191f2b', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_58', '7551174f-9d4c-4fab-a29d-b31dc4a0e3c9', '11c46b56-fab5-4c95-ac78-55698c14b381', 'c6d6e5dc-4a75-4ec3-9248-3cb02090d6fd', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_59', '094dc15a-a97b-4b7b-a820-90ecf37e52e3', '1d5c5758-99d2-46bc-8891-92dfe0d529f0', '9ad8a4cc-edf4-4a5f-9b6f-dd8a511246b3', NOW(), NOW());

INSERT INTO fleet_vehicles (_key, uuid, fleet_uuid, vehicle_uuid, created_at, updated_at) VALUES
('fleet_vehicle_60', 'e522f5dd-90f5-4e60-9b48-828c89a109c5', 'dee565d8-1eb3-4363-ba25-90d1ab5dc6b6', 'cdeb788e-7409-4239-9836-56bfdae71747', NOW(), NOW());

-- ========================================
-- 9. NÚMEROS DE SEGUIMIENTO (Tracking Numbers)
-- ========================================
INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_1', 'f3757075-c81a-4170-9917-97945db7acf9', 'TRK001', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK469003', 'ES', 'TRK469003_QR', 'TRK469003_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_2', 'b68b77ee-da97-455f-806f-74d339a319d4', 'TRK002', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK467530', 'ES', 'TRK467530_QR', 'TRK467530_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_3', 'fb3357e6-6045-4ca9-b726-2a01ffb8172c', 'TRK003', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK484725', 'ES', 'TRK484725_QR', 'TRK484725_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_4', '33eee731-8046-4b53-a60b-8c07886dd347', 'TRK004', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK246944', 'ES', 'TRK246944_QR', 'TRK246944_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_5', '829c6647-f926-4cc3-b695-35cbfa822468', 'TRK005', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK864968', 'ES', 'TRK864968_QR', 'TRK864968_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_6', 'a3dd079f-8c27-43ac-ba70-c744211f6a72', 'TRK006', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK784675', 'ES', 'TRK784675_QR', 'TRK784675_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_7', '20bb0599-e636-433d-ad9d-c810d223eaef', 'TRK007', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK283922', 'ES', 'TRK283922_QR', 'TRK283922_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_8', 'af94f915-2ad8-4e83-a384-5318435712e2', 'TRK008', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK240430', 'ES', 'TRK240430_QR', 'TRK240430_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_9', 'eba25f8b-ca9c-474e-b477-a22b2cb03e99', 'TRK009', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK429830', 'ES', 'TRK429830_QR', 'TRK429830_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_10', '80343a0b-b67b-45c0-a060-1b2798b18624', 'TRK010', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK350531', 'ES', 'TRK350531_QR', 'TRK350531_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_11', '58422cb3-7c78-4095-acb9-5352983e547a', 'TRK011', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK210311', 'ES', 'TRK210311_QR', 'TRK210311_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_12', '0be2a059-0fc0-4e97-93b2-735b31f22ebb', 'TRK012', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK793822', 'ES', 'TRK793822_QR', 'TRK793822_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_13', 'e03fe0dd-26b8-4315-a638-411161b80d33', 'TRK013', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK313940', 'ES', 'TRK313940_QR', 'TRK313940_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_14', '4f260c73-f7ca-4ec3-be02-69272a302fbc', 'TRK014', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK531551', 'ES', 'TRK531551_QR', 'TRK531551_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_15', '235de295-8d1e-4e89-8998-ea99d8695c11', 'TRK015', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK949381', 'ES', 'TRK949381_QR', 'TRK949381_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_16', 'd2303a10-ff0b-4319-b17d-d0a71a8d6568', 'TRK016', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK671287', 'ES', 'TRK671287_QR', 'TRK671287_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_17', '19a79810-8a9d-46c8-aa92-ae7af1d52149', 'TRK017', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK171698', 'ES', 'TRK171698_QR', 'TRK171698_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_18', '9a09f766-1614-4d67-afac-778152cef96a', 'TRK018', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK991508', 'ES', 'TRK991508_QR', 'TRK991508_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_19', '9a11d561-8793-4b2d-9747-eb649798d39a', 'TRK019', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK559892', 'ES', 'TRK559892_QR', 'TRK559892_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_20', '771e076b-2ce3-46c0-a842-6f66fc16ca3f', 'TRK020', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK420857', 'ES', 'TRK420857_QR', 'TRK420857_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_21', '2d99b2b6-4344-4b3b-9799-e4d3c68e24ad', 'TRK021', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK619751', 'ES', 'TRK619751_QR', 'TRK619751_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_22', 'ac4d31b4-5f7a-45c6-a954-64d6bd4f784d', 'TRK022', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK776646', 'ES', 'TRK776646_QR', 'TRK776646_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_23', '60bcf3c1-5b23-4754-8a3b-566976860ac2', 'TRK023', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK349008', 'ES', 'TRK349008_QR', 'TRK349008_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_24', '6c7120e6-268b-4c43-aaa7-8f9d88df43be', 'TRK024', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK539163', 'ES', 'TRK539163_QR', 'TRK539163_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_25', '3f9ee02d-f8e9-4bb4-a730-610e038a4d11', 'TRK025', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK410630', 'ES', 'TRK410630_QR', 'TRK410630_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_26', '18eda3b6-4355-4ca7-9912-9a4385e6b1a3', 'TRK026', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK807957', 'ES', 'TRK807957_QR', 'TRK807957_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_27', 'ac9059ac-70e0-42b2-bc49-848e820d67af', 'TRK027', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK488955', 'ES', 'TRK488955_QR', 'TRK488955_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_28', '6cf756c7-a9f7-4a89-a79f-af88c33f734e', 'TRK028', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK189415', 'ES', 'TRK189415_QR', 'TRK189415_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_29', '0fbdc6a5-eb43-4b7a-bb0d-75d7f91a1045', 'TRK029', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK741256', 'ES', 'TRK741256_QR', 'TRK741256_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_30', 'c38002a4-793f-4407-88ca-315f063f8498', 'TRK030', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK123029', 'ES', 'TRK123029_QR', 'TRK123029_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_31', '9f3a8e27-102d-4090-99f2-31ad12f5431d', 'TRK031', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK541455', 'ES', 'TRK541455_QR', 'TRK541455_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_32', 'c3826d33-176f-4d39-b5fe-d07bbaf7a941', 'TRK032', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK257124', 'ES', 'TRK257124_QR', 'TRK257124_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_33', '92b531d7-9349-4837-a2c0-5d173c89aea7', 'TRK033', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK396170', 'ES', 'TRK396170_QR', 'TRK396170_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_34', '3d5dd5e0-52e8-4eda-a56b-9bacace8a6bd', 'TRK034', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK973398', 'ES', 'TRK973398_QR', 'TRK973398_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_35', '26467f8f-0386-4ee0-a112-19ce10fb4338', 'TRK035', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK958494', 'ES', 'TRK958494_QR', 'TRK958494_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_36', '47378033-5c10-4c46-beea-03cca7acb066', 'TRK036', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK225054', 'ES', 'TRK225054_QR', 'TRK225054_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_37', '8602befd-beaf-4254-bd6b-65732c52dd04', 'TRK037', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK314922', 'ES', 'TRK314922_QR', 'TRK314922_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_38', '5d8940f5-0b40-4a8f-918e-b2838114bdcf', 'TRK038', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK287787', 'ES', 'TRK287787_QR', 'TRK287787_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_39', '2d016db9-9d18-4a2a-9fd4-72c2426aa7ef', 'TRK039', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK592524', 'ES', 'TRK592524_QR', 'TRK592524_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_40', '1dd16f95-060a-411c-9a5e-346544b9cbfb', 'TRK040', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK266108', 'ES', 'TRK266108_QR', 'TRK266108_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_41', '112d8f72-6552-467c-a69c-bd395dc93bdd', 'TRK041', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK149388', 'ES', 'TRK149388_QR', 'TRK149388_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_42', '8bc680d8-1ea4-4910-b773-f0d30eb46ceb', 'TRK042', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK531399', 'ES', 'TRK531399_QR', 'TRK531399_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_43', 'e51be0fe-7027-4b64-b11a-0ff8e6e7866c', 'TRK043', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK227602', 'ES', 'TRK227602_QR', 'TRK227602_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_44', 'fc492f63-5e2c-4b67-b96f-b25d4d39dcec', 'TRK044', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK353581', 'ES', 'TRK353581_QR', 'TRK353581_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_45', '4cff679b-8e58-4d08-aaf2-3fb11c41f5fc', 'TRK045', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK226052', 'ES', 'TRK226052_QR', 'TRK226052_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_46', '7975205e-1831-4cc1-9e6c-ebff80db893d', 'TRK046', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK265056', 'ES', 'TRK265056_QR', 'TRK265056_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_47', 'ca6ce417-23a8-48e8-b641-aa2074337c6a', 'TRK047', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK977971', 'ES', 'TRK977971_QR', 'TRK977971_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_48', 'c2d9a84e-e4d3-4bb9-899c-ffabdf7a8b55', 'TRK048', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK211255', 'ES', 'TRK211255_QR', 'TRK211255_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_49', 'f5faae0c-e082-4f94-85f0-f88d45f7340e', 'TRK049', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK842562', 'ES', 'TRK842562_QR', 'TRK842562_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_50', 'cb7fe9dd-5a69-438a-89a3-5cd82bcd09b2', 'TRK050', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK311229', 'ES', 'TRK311229_QR', 'TRK311229_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_51', 'b58e6548-253e-4c25-82a9-7296c297292d', 'TRK051', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK517107', 'ES', 'TRK517107_QR', 'TRK517107_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_52', 'ab6f45a9-e641-4a37-862a-d2a97bdd9ee6', 'TRK052', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK583654', 'ES', 'TRK583654_QR', 'TRK583654_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_53', '413fe588-11fb-454e-b448-30d433cd5442', 'TRK053', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK831800', 'ES', 'TRK831800_QR', 'TRK831800_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_54', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', 'TRK054', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK993573', 'ES', 'TRK993573_QR', 'TRK993573_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_55', 'd55b002c-26bb-42d0-bf34-e60a9818867e', 'TRK055', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK262245', 'ES', 'TRK262245_QR', 'TRK262245_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_56', 'f5e8470a-9809-489e-9a71-fd5560ec57cb', 'TRK056', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK209563', 'ES', 'TRK209563_QR', 'TRK209563_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_57', '0f29b004-4409-45db-97c6-ae0c1b3be16b', 'TRK057', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK463493', 'ES', 'TRK463493_QR', 'TRK463493_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_58', 'd6135ea4-b842-4131-a5aa-c3c8e88b90f6', 'TRK058', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK238973', 'ES', 'TRK238973_QR', 'TRK238973_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_59', '3cb604b8-604f-4f68-abc0-99d20e38e2a4', 'TRK059', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK112826', 'ES', 'TRK112826_QR', 'TRK112826_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_60', '5178d19d-406f-4cb0-b35e-3349a8622e8f', 'TRK060', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK731928', 'ES', 'TRK731928_QR', 'TRK731928_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_61', 'f2653e05-577e-4bad-8f6c-4d611b7ad2b0', 'TRK061', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK510141', 'ES', 'TRK510141_QR', 'TRK510141_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_62', '1fc3794b-05a8-46f1-b7cc-47c5e1bc5588', 'TRK062', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK431033', 'ES', 'TRK431033_QR', 'TRK431033_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_63', '8c0174d7-fd52-490b-ba2f-237af65b1337', 'TRK063', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK395041', 'ES', 'TRK395041_QR', 'TRK395041_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_64', 'abaca1f4-6207-41f7-8010-7327a4c9f4e1', 'TRK064', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK521177', 'ES', 'TRK521177_QR', 'TRK521177_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_65', 'a8e2a5a0-987a-4d83-98b8-30772e81342d', 'TRK065', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK663870', 'ES', 'TRK663870_QR', 'TRK663870_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_66', '6d6ef5e2-65b6-4ac0-8073-bf50e08d66f6', 'TRK066', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK195702', 'ES', 'TRK195702_QR', 'TRK195702_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_67', '01389971-4c76-49f2-9e05-a947a516f933', 'TRK067', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK541555', 'ES', 'TRK541555_QR', 'TRK541555_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_68', '3d39df3a-5d57-4cae-aece-2399e5b63020', 'TRK068', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK535413', 'ES', 'TRK535413_QR', 'TRK535413_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_69', 'dfec63f8-e2ef-4fad-8311-50f4e7bde399', 'TRK069', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK958475', 'ES', 'TRK958475_QR', 'TRK958475_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_70', '593fe5b2-3ab6-4ad1-bbd9-7ef27335a043', 'TRK070', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK514646', 'ES', 'TRK514646_QR', 'TRK514646_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_71', '0576ee4a-0f50-4097-857f-e2c67dc37e43', 'TRK071', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK416113', 'ES', 'TRK416113_QR', 'TRK416113_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_72', 'cc322eff-714d-42dc-85c0-56012c8808d3', 'TRK072', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK653174', 'ES', 'TRK653174_QR', 'TRK653174_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_73', '1d6ddde7-e577-4361-bbf1-5c20c2623b92', 'TRK073', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK926990', 'ES', 'TRK926990_QR', 'TRK926990_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_74', '289d407c-4eca-4a38-b115-369be7a1557c', 'TRK074', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK377200', 'ES', 'TRK377200_QR', 'TRK377200_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_75', 'c855920d-802b-43da-9bc7-8ff4d75ffce8', 'TRK075', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK844712', 'ES', 'TRK844712_QR', 'TRK844712_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_76', '9eb5df03-24f2-43a0-a393-b52b53428e14', 'TRK076', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK783889', 'ES', 'TRK783889_QR', 'TRK783889_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_77', '91b139e4-3ac6-4e38-9b79-b26627cac7dd', 'TRK077', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK786237', 'ES', 'TRK786237_QR', 'TRK786237_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_78', 'e33aaef7-5e0c-4aa3-84a0-f9b95f030443', 'TRK078', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK342739', 'ES', 'TRK342739_QR', 'TRK342739_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_79', '8ea7d389-b5df-41b6-bb33-07dfab52610f', 'TRK079', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK442479', 'ES', 'TRK442479_QR', 'TRK442479_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_80', '4e4a4500-29ff-4089-a43f-167558f12e9e', 'TRK080', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK393921', 'ES', 'TRK393921_QR', 'TRK393921_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_81', 'd00fbe89-70b9-4dd0-b080-92e40c992bbf', 'TRK081', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK330847', 'ES', 'TRK330847_QR', 'TRK330847_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_82', 'b5d0128b-488b-47cf-854a-ea33b830f9d7', 'TRK082', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK152171', 'ES', 'TRK152171_QR', 'TRK152171_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_83', '66bfeae3-cb41-4652-b4f7-131cc990cacb', 'TRK083', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK568174', 'ES', 'TRK568174_QR', 'TRK568174_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_84', 'f061c057-a8a5-45df-95db-5a8195f0a0c7', 'TRK084', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK646428', 'ES', 'TRK646428_QR', 'TRK646428_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_85', '4b5d6263-4bea-4ffe-8be5-98ed9a960727', 'TRK085', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK583992', 'ES', 'TRK583992_QR', 'TRK583992_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_86', 'b93e2e74-c7be-4186-a0c0-ff3410e31d49', 'TRK086', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK110446', 'ES', 'TRK110446_QR', 'TRK110446_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_87', '9a208ee1-9ba3-472d-9c12-f258220facd3', 'TRK087', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK751243', 'ES', 'TRK751243_QR', 'TRK751243_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_88', 'c305ce1d-cb5d-414d-adac-5cd2fd7cde29', 'TRK088', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK613948', 'ES', 'TRK613948_QR', 'TRK613948_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_89', '8fa50595-26d6-4228-9205-545174aedb0c', 'TRK089', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK655993', 'ES', 'TRK655993_QR', 'TRK655993_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_90', 'e80b5643-73b1-427d-beeb-e36af746da56', 'TRK090', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK340938', 'ES', 'TRK340938_QR', 'TRK340938_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_91', 'a3cf4849-2713-4bb9-b448-4e4837b4af5d', 'TRK091', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK971689', 'ES', 'TRK971689_QR', 'TRK971689_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_92', '979f103a-7b9d-4083-a42e-81d16ad57418', 'TRK092', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK623765', 'ES', 'TRK623765_QR', 'TRK623765_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_93', '343cff16-5b38-40b0-8340-63974b7fcb3a', 'TRK093', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK977797', 'ES', 'TRK977797_QR', 'TRK977797_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_94', '7f422f08-6559-4f13-8853-0168fabe9e53', 'TRK094', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK475083', 'ES', 'TRK475083_QR', 'TRK475083_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_95', '8c60d8e3-53a8-4a2e-8404-22499ed8cf7b', 'TRK095', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK188418', 'ES', 'TRK188418_QR', 'TRK188418_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_96', '17b983c6-e449-45dc-a9ea-7f4fe8e4b29f', 'TRK096', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'TRK449725', 'ES', 'TRK449725_QR', 'TRK449725_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_97', 'ed5baa14-2209-479c-9a9d-88882e6e4f0b', 'TRK097', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK849792', 'ES', 'TRK849792_QR', 'TRK849792_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_98', '489f1090-95eb-47bb-9e5a-598d19ed2713', 'TRK098', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'TRK401959', 'ES', 'TRK401959_QR', 'TRK401959_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_99', '2d9c7416-22bb-414e-b5e5-32b0745cfc7f', 'TRK099', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK284535', 'ES', 'TRK284535_QR', 'TRK284535_BAR', 'active', NOW(), NOW());

INSERT INTO tracking_numbers (_key, uuid, public_id, company_uuid, tracking_number, region, qr_code, barcode, status, created_at, updated_at) VALUES
('tracking_100', '5d69b7a0-b7c0-4b59-82c6-f76a8aed2b2b', 'TRK100', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'TRK608871', 'ES', 'TRK608871_QR', 'TRK608871_BAR', 'active', NOW(), NOW());

-- ========================================
-- 10. CARGAS (Payloads)
-- ========================================
INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_1', '7b92d439-6d4c-4b46-86f0-1944cef23c65', 'PAYLOAD001', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_2', 'fb7fe258-5eab-48b8-ba9c-83e80a983d9a', 'PAYLOAD002', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'fc71b2a8-6f9e-4a8d-b1f8-7f19ebeb0d3b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_3', 'fb5bd06d-94d8-42f0-8a80-803a39157f50', 'PAYLOAD003', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '901d53fc-35d8-40e4-b286-0775962a71cf', 'c3b928d8-da55-4b7a-b299-d04beb2f74ef', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_4', '8959a0e3-c693-4bab-a5c1-3f36998dc41f', 'PAYLOAD004', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', '772d3990-e93c-43e7-adc2-c5caf440152b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_5', '66e28443-3c13-416c-8679-6593aa9de1ee', 'PAYLOAD005', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', 'aed9db3a-3526-42b9-adfc-0e7c0c56c69b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_6', 'c9b9eca4-03f5-4774-8b98-a2134e589c1b', 'PAYLOAD006', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '636b48df-57ee-41fe-beb0-dae75d9eef0b', '4c30105a-5f1a-4959-be07-94480a3d68d7', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_7', 'e26678bd-549a-4717-8588-94edaa81baa3', 'PAYLOAD007', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'c3b928d8-da55-4b7a-b299-d04beb2f74ef', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_8', '7e788dfd-49a1-439a-9008-46687f01cdc2', 'PAYLOAD008', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'd55d5300-ad11-41f3-a7ef-0bf4b022fc36', '4c30105a-5f1a-4959-be07-94480a3d68d7', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_9', 'df54cd81-373d-449c-a326-c3cba0b392c1', 'PAYLOAD009', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_10', '13f2b61a-f6b7-4e1d-bd7b-d370aa5766fc', 'PAYLOAD010', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '3389c354-331f-4372-9030-d2bbaf7a3de9', 'a1a01c17-edd5-4745-a829-ecfbe82160f0', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_11', '341c27c0-81a3-4afc-a393-77797d8dcd2b', 'PAYLOAD011', '3bc9ef59-698b-4859-878a-ce336f2c022d', '59d02c09-a36d-48b1-bea2-34b028fdc0fb', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_12', '42a795fa-e040-4e87-b56f-216ca347b5f5', 'PAYLOAD012', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '43b00464-b32e-4c51-8389-e85b85083333', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_13', '0196a29a-4e76-4921-870e-35a059bbbcf7', 'PAYLOAD013', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_14', 'dee13063-f937-419e-bf61-25753e390b2c', 'PAYLOAD014', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'e6b4d03e-fbc7-4f69-8f6c-6d7699ff34c6', '804a5b86-7693-4109-804f-1c973c00d5b5', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_15', 'b949c8ab-5388-4eda-be2f-1c4a21fc3c57', 'PAYLOAD015', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_16', 'e6abbf0c-bf16-40b3-a23e-4fbd4359de89', 'PAYLOAD016', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'c3b928d8-da55-4b7a-b299-d04beb2f74ef', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_17', '0f82bfad-8373-4455-a9ad-ea9740bfa411', 'PAYLOAD017', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_18', '2e15048f-904f-4a3c-acbf-a542fc4c2915', 'PAYLOAD018', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'dd53bf5a-50be-41c1-ab4c-176641358247', 'e6b4d03e-fbc7-4f69-8f6c-6d7699ff34c6', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_19', '38b92cc6-0837-4b62-8a4c-d4e39db3cccb', 'PAYLOAD019', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'a3945835-3668-4d98-ba7d-fe95e38980b8', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_20', '39b57b40-def2-4ab7-bd2d-a9237a3e7046', 'PAYLOAD020', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_21', '6cca4960-2c74-4a50-b953-e0492f46e8fe', 'PAYLOAD021', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'd7a66ccf-0ac0-4070-ad67-2618c70f7b90', '0d083d50-9054-41ab-a96f-1821f3d45d0d', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_22', 'ab3f3701-849e-4aa2-8645-12a12fe38aed', 'PAYLOAD022', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '693836f9-4dd4-4947-982f-5bd1dcaf717d', '772d3990-e93c-43e7-adc2-c5caf440152b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_23', '78b6f730-d868-49a2-b08f-66faa1bda5f0', 'PAYLOAD023', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '0d083d50-9054-41ab-a96f-1821f3d45d0d', 'fc71b2a8-6f9e-4a8d-b1f8-7f19ebeb0d3b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_24', '94998f67-38ab-40f2-941b-f9a8e9107553', 'PAYLOAD024', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'dd53bf5a-50be-41c1-ab4c-176641358247', 'a1a01c17-edd5-4745-a829-ecfbe82160f0', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_25', '74045a03-3bea-4bb9-8bd0-2eda13db27f5', 'PAYLOAD025', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', '693836f9-4dd4-4947-982f-5bd1dcaf717d', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_26', '7af055ce-f51e-4860-88df-656ae7ab5c79', 'PAYLOAD026', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'a3945835-3668-4d98-ba7d-fe95e38980b8', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_27', 'a974e85b-8cf2-41b1-ad2b-f21e72d5f45e', 'PAYLOAD027', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '33d445a1-6944-4107-b316-23c3580ae4f0', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_28', '5045c61f-18dc-4db8-a77c-ff7afbccc70b', 'PAYLOAD028', '3bc9ef59-698b-4859-878a-ce336f2c022d', '674c8ba3-0b11-4497-b77d-239226fcb94c', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_29', '220c9bdd-3f69-45eb-b33f-e25c67488b4c', 'PAYLOAD029', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '4c30105a-5f1a-4959-be07-94480a3d68d7', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_30', '9d4006a9-a037-4a69-aca6-cbdebdf5828b', 'PAYLOAD030', '3bc9ef59-698b-4859-878a-ce336f2c022d', '59d02c09-a36d-48b1-bea2-34b028fdc0fb', 'dd53bf5a-50be-41c1-ab4c-176641358247', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_31', 'ea18e705-e1d0-4246-a05c-c24de2849560', 'PAYLOAD031', '3bc9ef59-698b-4859-878a-ce336f2c022d', '33d445a1-6944-4107-b316-23c3580ae4f0', '011f19e3-f1bb-4ae9-bd41-c101da82fa1d', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_32', 'e9fcefae-2ed6-48a6-872f-1f8cec5db8c9', 'PAYLOAD032', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_33', 'e643c9f6-827a-4793-b7ca-a71b7e99a49a', 'PAYLOAD033', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '0d083d50-9054-41ab-a96f-1821f3d45d0d', '72d0e1d7-063c-4f05-b105-f83026137da4', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_34', '4b460cb2-3aec-4142-b295-52c45ddff094', 'PAYLOAD034', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'be9c8675-eae0-488b-9c5d-66fe2eb01452', '4984261e-b398-4bc3-9a45-3b6e9872c854', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_35', '5b6cdf51-64f9-40c8-9cd5-312e514aac47', 'PAYLOAD035', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'c3b928d8-da55-4b7a-b299-d04beb2f74ef', 'be9c8675-eae0-488b-9c5d-66fe2eb01452', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_36', 'a79384a5-3344-4823-bfc2-ac5583c09e28', 'PAYLOAD036', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_37', 'f3703967-8963-4449-89f6-93e48f74531a', 'PAYLOAD037', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', 'd7a66ccf-0ac0-4070-ad67-2618c70f7b90', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_38', '14fa0b8c-c37d-4fb2-9e66-ce014db85145', 'PAYLOAD038', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_39', '045d0c42-b613-42f2-bac9-c6883e42b192', 'PAYLOAD039', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', '72d0e1d7-063c-4f05-b105-f83026137da4', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_40', '1ef23503-e07b-4c07-a2ac-a8129917a53c', 'PAYLOAD040', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '43b00464-b32e-4c51-8389-e85b85083333', '5eea587f-5fdf-4e21-9493-189f21805f43', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_41', 'a7f2d0d3-7f6f-49c8-a5cd-78833d444837', 'PAYLOAD041', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', '0d083d50-9054-41ab-a96f-1821f3d45d0d', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_42', 'cb97d7db-a1f3-414e-b509-8712e7acfc36', 'PAYLOAD042', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '0bac3346-ca40-4ade-ab39-82dca62f0876', '823171c3-335c-438a-9e67-2d6a4c1e9571', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_43', 'a77d17e2-581f-401a-bc38-670e957c6d02', 'PAYLOAD043', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '4984261e-b398-4bc3-9a45-3b6e9872c854', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_44', '27d5e354-622d-444d-8403-b0e9c806f3a8', 'PAYLOAD044', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5eea587f-5fdf-4e21-9493-189f21805f43', '011f19e3-f1bb-4ae9-bd41-c101da82fa1d', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_45', '672a75b3-d482-4187-8318-3980f8a175c0', 'PAYLOAD045', '3bc9ef59-698b-4859-878a-ce336f2c022d', '8086cfa9-a6f1-4d23-b3ac-b1df0c425953', '674c8ba3-0b11-4497-b77d-239226fcb94c', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_46', '964f631a-5440-468e-b67c-a145a3af41e6', 'PAYLOAD046', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'dd53bf5a-50be-41c1-ab4c-176641358247', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_47', '6186806a-b939-476d-9760-7931de34d428', 'PAYLOAD047', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'e6b4d03e-fbc7-4f69-8f6c-6d7699ff34c6', '823171c3-335c-438a-9e67-2d6a4c1e9571', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_48', '4b831fd3-3241-4c4e-b5a3-ae3dac94d20b', 'PAYLOAD048', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_49', 'e5e7b595-04e1-4f31-a215-d9b857e7e76e', 'PAYLOAD049', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8086cfa9-a6f1-4d23-b3ac-b1df0c425953', 'fc71b2a8-6f9e-4a8d-b1f8-7f19ebeb0d3b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_50', 'c52048ff-19a7-4272-8bd5-5fac5d7d8552', 'PAYLOAD050', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_51', '2abe2e5f-4ec2-4eee-9fc8-893c52316f7a', 'PAYLOAD051', '3bc9ef59-698b-4859-878a-ce336f2c022d', '6abb8c4c-cc69-47f8-9000-6c250e679d08', '0d083d50-9054-41ab-a96f-1821f3d45d0d', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_52', '5433a755-02a7-484f-8b93-609346466277', 'PAYLOAD052', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'aed9db3a-3526-42b9-adfc-0e7c0c56c69b', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_53', 'b4724d93-8134-4b4e-843f-d2a8a5aa3969', 'PAYLOAD053', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '8086cfa9-a6f1-4d23-b3ac-b1df0c425953', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_54', '8132bd2e-5dc2-4117-9881-c0f4889f80fc', 'PAYLOAD054', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'c3b928d8-da55-4b7a-b299-d04beb2f74ef', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_55', 'eff05495-c722-4e98-9d8f-51230bfd03ea', 'PAYLOAD055', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '5eea587f-5fdf-4e21-9493-189f21805f43', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_56', 'c046280b-50df-42ba-865e-a3dccd3d7299', 'PAYLOAD056', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'd55d5300-ad11-41f3-a7ef-0bf4b022fc36', 'a3945835-3668-4d98-ba7d-fe95e38980b8', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_57', '71c1cbe5-d94d-4653-9276-71b475b36453', 'PAYLOAD057', '3bc9ef59-698b-4859-878a-ce336f2c022d', '59d02c09-a36d-48b1-bea2-34b028fdc0fb', 'ef674ca0-a652-4081-997b-afa4125b0362', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_58', '5c722d2c-51cb-4674-936f-ddf2d7f1251e', 'PAYLOAD058', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '5247e6eb-fab2-4d9d-b975-31b50d00b670', '6abb8c4c-cc69-47f8-9000-6c250e679d08', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_59', 'ab5a325c-0d57-48fb-b57f-4e633ad6b7bc', 'PAYLOAD059', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5247e6eb-fab2-4d9d-b975-31b50d00b670', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_60', '2decab24-8c36-410e-a44e-acb1346e72d4', 'PAYLOAD060', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', '5eea587f-5fdf-4e21-9493-189f21805f43', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_61', 'b2870504-3cd8-469c-8fa0-e731f6d4a66b', 'PAYLOAD061', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', '011f19e3-f1bb-4ae9-bd41-c101da82fa1d', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_62', 'bb93fc28-44c9-41a3-9984-cf1f29cdd6bc', 'PAYLOAD062', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_63', '785175e1-63c2-4128-b2c0-d1c2c526bdef', 'PAYLOAD063', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '6abb8c4c-cc69-47f8-9000-6c250e679d08', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_64', '6365b041-4047-41c2-8a24-f986083fb501', 'PAYLOAD064', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8086cfa9-a6f1-4d23-b3ac-b1df0c425953', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_65', 'a6e0f689-4e45-4932-85a7-46693dc1e4c6', 'PAYLOAD065', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_66', '4772b81e-f598-4a7f-9665-3f2a6ee47eae', 'PAYLOAD066', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'd229c27a-1e52-4532-8f0b-b7b3d82188be', 'd55d5300-ad11-41f3-a7ef-0bf4b022fc36', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_67', '66b461a4-c487-43cb-aff5-3ec2c0bb7ff3', 'PAYLOAD067', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_68', '5e227f42-0c98-4a73-8157-a2d2f88ae5ac', 'PAYLOAD068', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'ef674ca0-a652-4081-997b-afa4125b0362', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_69', '993a1f21-524f-4549-9e03-ce63f6951252', 'PAYLOAD069', '3bc9ef59-698b-4859-878a-ce336f2c022d', '0bac3346-ca40-4ade-ab39-82dca62f0876', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_70', '43b1783a-5c1e-419e-845f-54fa305e4545', 'PAYLOAD070', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_71', 'ba92d763-32e1-42c5-b56c-6c42a5b4c5cc', 'PAYLOAD071', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', '8086cfa9-a6f1-4d23-b3ac-b1df0c425953', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_72', '77e38942-1130-4f5a-89af-77cc77d433ac', 'PAYLOAD072', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '59d02c09-a36d-48b1-bea2-34b028fdc0fb', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_73', '0f0a923d-0740-49f2-b74d-8ef39c5bfd58', 'PAYLOAD073', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_74', '1cf8ebcc-1dc8-48be-9879-a46c89c195d9', 'PAYLOAD074', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', '00bc721a-d79a-4223-8ea7-19c2d1772684', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_75', 'ddc40057-7bde-4e97-a78f-2bb77f0eab14', 'PAYLOAD075', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', '823171c3-335c-438a-9e67-2d6a4c1e9571', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_76', 'fcd024c9-7be0-4326-908c-5c5d9ca27006', 'PAYLOAD076', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'd229c27a-1e52-4532-8f0b-b7b3d82188be', 'fc71b2a8-6f9e-4a8d-b1f8-7f19ebeb0d3b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_77', '01f495f1-69a6-471d-955e-82cee5b97c52', 'PAYLOAD077', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6abb8c4c-cc69-47f8-9000-6c250e679d08', 'a3945835-3668-4d98-ba7d-fe95e38980b8', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_78', '2fb08b47-0cda-4925-81bd-f3c06db30f95', 'PAYLOAD078', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_79', 'ae8ad85b-f51c-45c7-a04a-0a992342631b', 'PAYLOAD079', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '43b00464-b32e-4c51-8389-e85b85083333', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_80', 'a710b0aa-3d58-4833-93a5-4506decd48dd', 'PAYLOAD080', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '901d53fc-35d8-40e4-b286-0775962a71cf', '0d083d50-9054-41ab-a96f-1821f3d45d0d', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_81', '9c3092bf-9e4f-4919-a47a-2e587a2b6612', 'PAYLOAD081', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8086cfa9-a6f1-4d23-b3ac-b1df0c425953', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_82', 'adb45209-7e80-4e00-84a6-e82df285586c', 'PAYLOAD082', '3bc9ef59-698b-4859-878a-ce336f2c022d', '8c153eab-552a-4986-b1bb-d781b92dc91a', '59d02c09-a36d-48b1-bea2-34b028fdc0fb', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_83', 'c0afff4c-6e2c-4dbb-a920-1c24d5ce4605', 'PAYLOAD083', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_84', 'f5f258f1-a0d0-4ec9-94fc-ff18affd67db', 'PAYLOAD084', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', '901d53fc-35d8-40e4-b286-0775962a71cf', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_85', 'df855ce8-7132-405f-81bd-1b3bb521bf75', 'PAYLOAD085', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '011f19e3-f1bb-4ae9-bd41-c101da82fa1d', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_86', '1c483db1-b0f0-4610-bffb-552bce6a929f', 'PAYLOAD086', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '901d53fc-35d8-40e4-b286-0775962a71cf', '823171c3-335c-438a-9e67-2d6a4c1e9571', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_87', '3d12244a-c99b-4b48-a8cf-0d543696fa0f', 'PAYLOAD087', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '4c30105a-5f1a-4959-be07-94480a3d68d7', 'dd53bf5a-50be-41c1-ab4c-176641358247', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_88', 'e75505bd-9fe2-4928-abab-3526241c7ac6', 'PAYLOAD088', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5eea587f-5fdf-4e21-9493-189f21805f43', 'ef674ca0-a652-4081-997b-afa4125b0362', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_89', 'ad5644d9-5dc5-4ca4-ac02-69da029d3241', 'PAYLOAD089', '3bc9ef59-698b-4859-878a-ce336f2c022d', '011f19e3-f1bb-4ae9-bd41-c101da82fa1d', '8c153eab-552a-4986-b1bb-d781b92dc91a', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_90', 'e6d08fc6-d966-4fcd-ba18-3b653066007f', 'PAYLOAD090', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '772d3990-e93c-43e7-adc2-c5caf440152b', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_91', 'be60c476-45cc-4bb4-8fe3-d281321836bf', 'PAYLOAD091', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '33d445a1-6944-4107-b316-23c3580ae4f0', 'dd53bf5a-50be-41c1-ab4c-176641358247', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_92', 'b175286e-de08-43b0-b880-04c1d0149407', 'PAYLOAD092', '3bc9ef59-698b-4859-878a-ce336f2c022d', '00bc721a-d79a-4223-8ea7-19c2d1772684', '72d0e1d7-063c-4f05-b105-f83026137da4', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_93', '7d0506cb-875d-470a-b820-00ae57061b5f', 'PAYLOAD093', '3bc9ef59-698b-4859-878a-ce336f2c022d', '4984261e-b398-4bc3-9a45-3b6e9872c854', '5247e6eb-fab2-4d9d-b975-31b50d00b670', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_94', 'ca566db6-d111-42ba-894d-5f9f3474dd5e', 'PAYLOAD094', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '4c30105a-5f1a-4959-be07-94480a3d68d7', 'c3b928d8-da55-4b7a-b299-d04beb2f74ef', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_95', '96715eb5-2e3d-4afe-af3e-cbefdfd9cacb', 'PAYLOAD095', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', '72d0e1d7-063c-4f05-b105-f83026137da4', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_96', 'df92c1ed-cae9-4cfa-82d8-39acb46eea63', 'PAYLOAD096', '3bc9ef59-698b-4859-878a-ce336f2c022d', '00bc721a-d79a-4223-8ea7-19c2d1772684', '0d083d50-9054-41ab-a96f-1821f3d45d0d', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_97', '78e617a1-708f-4b4f-9c67-d1cf44cde54a', 'PAYLOAD097', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', '0d083d50-9054-41ab-a96f-1821f3d45d0d', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_98', '83fa6855-22aa-415a-9f7b-a9729f2a5fcc', 'PAYLOAD098', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '3389c354-331f-4372-9030-d2bbaf7a3de9', '00bc721a-d79a-4223-8ea7-19c2d1772684', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_99', '161d5c53-9a01-44af-93cf-0f68add1f7a7', 'PAYLOAD099', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ef674ca0-a652-4081-997b-afa4125b0362', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', 'delivery', NOW(), NOW());

INSERT INTO payloads (_key, uuid, public_id, company_uuid, pickup_uuid, dropoff_uuid, type, created_at, updated_at) VALUES
('payload_100', '4a50e7fa-7171-4ff5-9eba-38e3bcab41d3', 'PAYLOAD100', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'a3945835-3668-4d98-ba7d-fe95e38980b8', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'delivery', NOW(), NOW());

-- ========================================
-- 11. ENTIDADES (Entities)
-- ========================================
INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_1', '8c2cfb2e-8f79-46e5-bd4a-7e9a0113b4d8', 'ENT001', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ca566db6-d111-42ba-894d-5f9f3474dd5e', 'a8e2a5a0-987a-4d83-98b8-30772e81342d', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', 'Palet Europeo 1', 'package', '97.41', 'kg', '52', '70', '33', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_2', 'a95b281e-35eb-42f7-bcef-7f5edae84247', 'ENT002', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'a974e85b-8cf2-41b1-ad2b-f21e72d5f45e', '1fc3794b-05a8-46f1-b7cc-47c5e1bc5588', 'a1a01c17-edd5-4745-a829-ecfbe82160f0', 'Caja Mediana 2', 'package', '5.36', 'kg', '47', '37', '27', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_3', '5a9b8c1e-74df-4069-9cc0-6351eaec3f11', 'ENT003', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '2fb08b47-0cda-4925-81bd-f3c06db30f95', '489f1090-95eb-47bb-9e5a-598d19ed2713', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', 'Paquete Estándar 3', 'package', '87.70', 'kg', '45', '81', '97', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_4', 'f14cba3b-3aae-4620-bff7-6ee87d9ffb25', 'ENT004', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ab3f3701-849e-4aa2-8645-12a12fe38aed', 'af94f915-2ad8-4e83-a384-5318435712e2', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'Repuestos Automotriz 4', 'package', '10.62', 'kg', '78', '80', '84', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_5', 'a8792c62-021b-4103-a541-4d7c37b49972', 'ENT005', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ab5a325c-0d57-48fb-b57f-4e633ad6b7bc', 'f3757075-c81a-4170-9917-97945db7acf9', '011f19e3-f1bb-4ae9-bd41-c101da82fa1d', 'Repuestos Automotriz 5', 'package', '90.10', 'kg', '96', '87', '44', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_6', 'c7628d7a-0188-41b6-92a3-8ff3b5441b60', 'ENT006', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6365b041-4047-41c2-8a24-f986083fb501', 'abaca1f4-6207-41f7-8010-7327a4c9f4e1', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', 'Electrodoméstico 6', 'package', '57.35', 'kg', '22', '99', '97', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_7', 'bd259ccb-6927-43d4-9bb0-8ea440ade9e4', 'ENT007', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'c52048ff-19a7-4272-8bd5-5fac5d7d8552', '6c7120e6-268b-4c43-aaa7-8f9d88df43be', '0d083d50-9054-41ab-a96f-1821f3d45d0d', 'Ropa y Textiles 7', 'package', '25.82', 'kg', '84', '34', '90', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_8', 'da7c8460-3608-41f7-aeb7-8e6745ffcfa8', 'ENT008', '3bc9ef59-698b-4859-878a-ce336f2c022d', '341c27c0-81a3-4afc-a393-77797d8dcd2b', '0fbdc6a5-eb43-4b7a-bb0d-75d7f91a1045', 'd7a66ccf-0ac0-4070-ad67-2618c70f7b90', 'Alimentos Frescos 8', 'package', '15.87', 'kg', '52', '35', '69', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_9', 'c3b2c7a7-f7e8-4c66-8eac-5b9758be8daf', 'ENT009', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ca566db6-d111-42ba-894d-5f9f3474dd5e', '4f260c73-f7ca-4ec3-be02-69272a302fbc', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', 'Sobre Documentos 9', 'package', '28.46', 'kg', '51', '94', '96', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_10', '43d7a24b-46e2-431e-916d-19b630723ae6', 'ENT010', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5433a755-02a7-484f-8b93-609346466277', 'abaca1f4-6207-41f7-8010-7327a4c9f4e1', '5247e6eb-fab2-4d9d-b975-31b50d00b670', 'Palet Europeo 10', 'package', '24.56', 'kg', '57', '48', '84', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_11', 'e7221c3f-ebee-4367-815f-eaedcd707949', 'ENT011', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e26678bd-549a-4717-8588-94edaa81baa3', '4f260c73-f7ca-4ec3-be02-69272a302fbc', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', 'Material de Construcción 11', 'package', '26.31', 'kg', '50', '53', '38', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_12', '6dada762-0472-4df4-8398-3efd0b35371b', 'ENT012', '3bc9ef59-698b-4859-878a-ce336f2c022d', '2abe2e5f-4ec2-4eee-9fc8-893c52316f7a', 'c38002a4-793f-4407-88ca-315f063f8498', '8086cfa9-a6f1-4d23-b3ac-b1df0c425953', 'Caja Grande 12', 'package', '27.51', 'kg', '90', '81', '25', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_13', '1f6c5abc-60f0-4474-80be-2033693d9c26', 'ENT013', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e75505bd-9fe2-4928-abab-3526241c7ac6', 'c855920d-802b-43da-9bc7-8ff4d75ffce8', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', 'Electrodoméstico 13', 'package', '9.63', 'kg', '17', '76', '67', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_14', 'f118e1a5-3c5b-4fb0-b7df-05f96413a056', 'ENT014', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ca566db6-d111-42ba-894d-5f9f3474dd5e', 'eba25f8b-ca9c-474e-b477-a22b2cb03e99', '796eb698-e7f9-4337-87aa-45a5b5ae8e52', 'Productos Químicos 14', 'package', '9.84', 'kg', '51', '14', '14', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_15', '2057b2fd-3326-4228-aa44-d5beaee42dd9', 'ENT015', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '77e38942-1130-4f5a-89af-77cc77d433ac', 'b68b77ee-da97-455f-806f-74d339a319d4', '72d0e1d7-063c-4f05-b105-f83026137da4', 'Libros y Papelería 15', 'package', '28.26', 'kg', '34', '52', '60', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_16', '095e431d-18a6-49e4-9d46-8918ec2cd181', 'ENT016', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'adb45209-7e80-4e00-84a6-e82df285586c', '9a09f766-1614-4d67-afac-778152cef96a', '72d0e1d7-063c-4f05-b105-f83026137da4', 'Libros y Papelería 16', 'package', '35.33', 'kg', '100', '86', '75', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_17', '486c6b38-4115-474a-a1dc-150249992ac4', 'ENT017', '3bc9ef59-698b-4859-878a-ce336f2c022d', '4a50e7fa-7171-4ff5-9eba-38e3bcab41d3', '3d39df3a-5d57-4cae-aece-2399e5b63020', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', 'Caja Mediana 17', 'package', '84.35', 'kg', '66', '24', '54', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_18', '10565187-cbc7-4758-a29f-caaaa17eea80', 'ENT018', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'be60c476-45cc-4bb4-8fe3-d281321836bf', '1fc3794b-05a8-46f1-b7cc-47c5e1bc5588', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', 'Caja Grande 18', 'package', '95.58', 'kg', '45', '40', '86', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_19', 'dfdb59f5-510f-4919-af05-7ca5de40aa1f', 'ENT019', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'b2870504-3cd8-469c-8fa0-e731f6d4a66b', 'cb7fe9dd-5a69-438a-89a3-5cd82bcd09b2', '59d02c09-a36d-48b1-bea2-34b028fdc0fb', 'Caja Pequeña 19', 'package', '33.64', 'kg', '100', '42', '27', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_20', '8805dfc9-ec80-4973-a522-6fcdb44a59a1', 'ENT020', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '1c483db1-b0f0-4610-bffb-552bce6a929f', 'ed5baa14-2209-479c-9a9d-88882e6e4f0b', '804a5b86-7693-4109-804f-1c973c00d5b5', 'Electrónica 20', 'package', '73.31', 'kg', '50', '83', '59', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_21', 'e118ff06-b603-48cd-bf52-687cf66d087a', 'ENT021', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e9fcefae-2ed6-48a6-872f-1f8cec5db8c9', '9a11d561-8793-4b2d-9747-eb649798d39a', 'd229c27a-1e52-4532-8f0b-b7b3d82188be', 'Palet Europeo 21', 'package', '26.50', 'kg', '39', '88', '59', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_22', '104d11d8-4d04-4b04-b270-c1543e90aaea', 'ENT022', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '0196a29a-4e76-4921-870e-35a059bbbcf7', '66bfeae3-cb41-4652-b4f7-131cc990cacb', '8086cfa9-a6f1-4d23-b3ac-b1df0c425953', 'Productos Químicos 22', 'package', '50.82', 'kg', '97', '55', '48', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_23', '5e8adf1a-aa13-4fc4-89d1-2c9ebc159aec', 'ENT023', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '0196a29a-4e76-4921-870e-35a059bbbcf7', '8ea7d389-b5df-41b6-bb33-07dfab52610f', '5eea587f-5fdf-4e21-9493-189f21805f43', 'Libros y Papelería 23', 'package', '15.31', 'kg', '24', '48', '43', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_24', 'cabef846-a387-403f-9f74-84c3379ccab0', 'ENT024', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ba92d763-32e1-42c5-b56c-6c42a5b4c5cc', '8bc680d8-1ea4-4910-b773-f0d30eb46ceb', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', 'Productos Frágiles 24', 'package', '32.06', 'kg', '66', '50', '60', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_25', '40c27895-6ef1-4a05-a0d3-c31473999cd2', 'ENT025', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'f5f258f1-a0d0-4ec9-94fc-ff18affd67db', '3cb604b8-604f-4f68-abc0-99d20e38e2a4', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', 'Palet Europeo 25', 'package', '87.21', 'kg', '94', '100', '44', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_26', 'ee0569c0-0fb0-4685-905d-07d9c335085b', 'ENT026', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ab5a325c-0d57-48fb-b57f-4e633ad6b7bc', '1d6ddde7-e577-4361-bbf1-5c20c2623b92', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', 'Caja Mediana 26', 'package', '73.16', 'kg', '37', '52', '97', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_27', 'ae0c0dbf-44f4-48c4-ad15-f8a9b8319182', 'ENT027', '3bc9ef59-698b-4859-878a-ce336f2c022d', '7d0506cb-875d-470a-b820-00ae57061b5f', '17b983c6-e449-45dc-a9ea-7f4fe8e4b29f', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'Material de Construcción 27', 'package', '21.68', 'kg', '54', '43', '62', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_28', '10551e11-e4d4-4ace-b390-56b707ea2b97', 'ENT028', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'eff05495-c722-4e98-9d8f-51230bfd03ea', 'a3cf4849-2713-4bb9-b448-4e4837b4af5d', '3389c354-331f-4372-9030-d2bbaf7a3de9', 'Libros y Papelería 28', 'package', '1.80', 'kg', '31', '49', '49', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_29', '07d4a7eb-66bf-45cf-9016-c1b471f508c4', 'ENT029', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'adb45209-7e80-4e00-84a6-e82df285586c', 'cb7fe9dd-5a69-438a-89a3-5cd82bcd09b2', 'c3b928d8-da55-4b7a-b299-d04beb2f74ef', 'Electrodoméstico 29', 'package', '84.35', 'kg', '71', '10', '14', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_30', '997d97ed-f1f1-4dc9-b8c6-d4fa8d54d6d8', 'ENT030', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'fb7fe258-5eab-48b8-ba9c-83e80a983d9a', '4cff679b-8e58-4d08-aaf2-3fb11c41f5fc', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', 'Alimentos Frescos 30', 'package', '31.81', 'kg', '41', '50', '66', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_31', '422135d2-a973-4d51-80c5-05ee53d20fd2', 'ENT031', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ad5644d9-5dc5-4ca4-ac02-69da029d3241', '47378033-5c10-4c46-beea-03cca7acb066', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', 'Plantas y Flores 31', 'package', '34.63', 'kg', '89', '19', '93', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_32', '365406e8-fd0b-4992-8903-e616cc662682', 'ENT032', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5b6cdf51-64f9-40c8-9cd5-312e514aac47', 'b68b77ee-da97-455f-806f-74d339a319d4', 'd7a66ccf-0ac0-4070-ad67-2618c70f7b90', 'Electrónica 32', 'package', '24.54', 'kg', '40', '66', '30', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_33', '570837e0-233c-48b9-879a-f31d76d504fe', 'ENT033', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '77e38942-1130-4f5a-89af-77cc77d433ac', '9f3a8e27-102d-4090-99f2-31ad12f5431d', 'aed9db3a-3526-42b9-adfc-0e7c0c56c69b', 'Juguetes 33', 'package', '8.29', 'kg', '97', '24', '69', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_34', '92f83ec4-b34b-42df-8117-b795d2a760ec', 'ENT034', '3bc9ef59-698b-4859-878a-ce336f2c022d', '77e38942-1130-4f5a-89af-77cc77d433ac', 'd2303a10-ff0b-4319-b17d-d0a71a8d6568', '4c30105a-5f1a-4959-be07-94480a3d68d7', 'Palet Europeo 34', 'package', '34.30', 'kg', '18', '48', '59', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_35', 'be0a469c-2f50-4437-9c3d-e0e28f7999bd', 'ENT035', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'e9fcefae-2ed6-48a6-872f-1f8cec5db8c9', '6d6ef5e2-65b6-4ac0-8073-bf50e08d66f6', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', 'Repuestos Automotriz 35', 'package', '18.35', 'kg', '71', '29', '62', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_36', '1aa1e7e4-e756-440e-ab8b-216a496c2d48', 'ENT036', '3bc9ef59-698b-4859-878a-ce336f2c022d', '6186806a-b939-476d-9760-7931de34d428', '2d99b2b6-4344-4b3b-9799-e4d3c68e24ad', '772d3990-e93c-43e7-adc2-c5caf440152b', 'Caja Grande 36', 'package', '6.95', 'kg', '85', '40', '62', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_37', '1b79c050-c4de-44a1-a1ff-41ce106b9ba3', 'ENT037', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ab3f3701-849e-4aa2-8645-12a12fe38aed', '2d016db9-9d18-4a2a-9fd4-72c2426aa7ef', 'a3945835-3668-4d98-ba7d-fe95e38980b8', 'Caja Pequeña 37', 'package', '27.42', 'kg', '12', '33', '29', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_38', '0846566e-f5ea-42c2-914d-915bba288149', 'ENT038', '3bc9ef59-698b-4859-878a-ce336f2c022d', '71c1cbe5-d94d-4653-9276-71b475b36453', 'a3dd079f-8c27-43ac-ba70-c744211f6a72', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', 'Electrónica 38', 'package', '75.81', 'kg', '61', '13', '84', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_39', '6bcb982c-8189-4ea1-aa07-6370f4f32676', 'ENT039', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'adb45209-7e80-4e00-84a6-e82df285586c', 'b93e2e74-c7be-4186-a0c0-ff3410e31d49', '5247e6eb-fab2-4d9d-b975-31b50d00b670', 'Palet Europeo 39', 'package', '47.52', 'kg', '30', '32', '58', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_40', '0021c585-4252-42bb-b82b-1d5334836bc0', 'ENT040', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '7e788dfd-49a1-439a-9008-46687f01cdc2', '4f260c73-f7ca-4ec3-be02-69272a302fbc', '8c153eab-552a-4986-b1bb-d781b92dc91a', 'Caja Pequeña 40', 'package', '82.94', 'kg', '34', '19', '27', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_41', '921e477a-4483-469b-89f2-e4d6ffcfe1e5', 'ENT041', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e5e7b595-04e1-4f31-a215-d9b857e7e76e', '26467f8f-0386-4ee0-a112-19ce10fb4338', '00bc721a-d79a-4223-8ea7-19c2d1772684', 'Caja Grande 41', 'package', '43.56', 'kg', '16', '11', '58', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_42', '3640993b-4761-4bad-8293-ec9810ae8ad5', 'ENT042', '3bc9ef59-698b-4859-878a-ce336f2c022d', '2abe2e5f-4ec2-4eee-9fc8-893c52316f7a', '2d99b2b6-4344-4b3b-9799-e4d3c68e24ad', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'Material de Construcción 42', 'package', '35.89', 'kg', '89', '92', '45', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_43', 'e2cb589d-ee6d-4180-bf7e-53d4738d98fb', 'ENT043', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'e75505bd-9fe2-4928-abab-3526241c7ac6', 'b93e2e74-c7be-4186-a0c0-ff3410e31d49', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'Paquete Estándar 43', 'package', '76.77', 'kg', '91', '83', '22', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_44', 'a89c4b85-5903-49eb-9887-e51b45ef26ca', 'ENT044', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '27d5e354-622d-444d-8403-b0e9c806f3a8', '7f422f08-6559-4f13-8853-0168fabe9e53', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'Libros y Papelería 44', 'package', '19.02', 'kg', '26', '26', '98', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_45', 'd5e29a72-ef82-4f01-8437-e6ed3997ba29', 'ENT045', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'df855ce8-7132-405f-81bd-1b3bb521bf75', '6c7120e6-268b-4c43-aaa7-8f9d88df43be', 'a1a01c17-edd5-4745-a829-ecfbe82160f0', 'Caja Grande 45', 'package', '90.61', 'kg', '32', '31', '15', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_46', '82cb9c0b-b612-4072-9830-6ec3df79efe8', 'ENT046', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '94998f67-38ab-40f2-941b-f9a8e9107553', '0be2a059-0fc0-4e97-93b2-735b31f22ebb', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'Ropa y Textiles 46', 'package', '1.63', 'kg', '42', '72', '32', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_47', 'd786fb59-87a5-48ee-b536-5535da6a48fe', 'ENT047', '3bc9ef59-698b-4859-878a-ce336f2c022d', '7e788dfd-49a1-439a-9008-46687f01cdc2', 'd6135ea4-b842-4131-a5aa-c3c8e88b90f6', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', 'Bebidas 47', 'package', '78.69', 'kg', '33', '70', '24', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_48', 'f5055b24-91d7-4759-acde-ecc6365fd92a', 'ENT048', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '785175e1-63c2-4128-b2c0-d1c2c526bdef', '01389971-4c76-49f2-9e05-a947a516f933', '4c30105a-5f1a-4959-be07-94480a3d68d7', 'Plantas y Flores 48', 'package', '62.41', 'kg', '65', '13', '11', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_49', '93558216-c55a-4bde-a150-45acb62fab46', 'ENT049', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '220c9bdd-3f69-45eb-b33f-e25c67488b4c', '3d39df3a-5d57-4cae-aece-2399e5b63020', '5247e6eb-fab2-4d9d-b975-31b50d00b670', 'Productos Frágiles 49', 'package', '23.25', 'kg', '75', '36', '39', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_50', '37854f82-0b92-41e0-bfdb-cc38540a2feb', 'ENT050', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'c0afff4c-6e2c-4dbb-a920-1c24d5ce4605', 'fc492f63-5e2c-4b67-b96f-b25d4d39dcec', 'd229c27a-1e52-4532-8f0b-b7b3d82188be', 'Palet Europeo 50', 'package', '48.33', 'kg', '54', '49', '33', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_51', 'd8dc6d24-4814-4469-a057-069ff2c08d3d', 'ENT051', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'be60c476-45cc-4bb4-8fe3-d281321836bf', 'eba25f8b-ca9c-474e-b477-a22b2cb03e99', '33d445a1-6944-4107-b316-23c3580ae4f0', 'Medicamentos 51', 'package', '92.99', 'kg', '32', '72', '52', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_52', 'dfa4908e-7fc7-470f-b3b7-dc9c6cb9247a', 'ENT052', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '38b92cc6-0837-4b62-8a4c-d4e39db3cccb', 'c305ce1d-cb5d-414d-adac-5cd2fd7cde29', '5247e6eb-fab2-4d9d-b975-31b50d00b670', 'Plantas y Flores 52', 'package', '71.76', 'kg', '93', '66', '47', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_53', 'f289bea3-a74f-4135-aa00-d89cfc2ab071', 'ENT053', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ab3f3701-849e-4aa2-8645-12a12fe38aed', 'a3dd079f-8c27-43ac-ba70-c744211f6a72', '8086cfa9-a6f1-4d23-b3ac-b1df0c425953', 'Alimentos Frescos 53', 'package', '95.26', 'kg', '89', '14', '45', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_54', '2fa98284-4af9-4b43-bafc-e3e2a3ff4c8a', 'ENT054', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'e5e7b595-04e1-4f31-a215-d9b857e7e76e', 'e03fe0dd-26b8-4315-a638-411161b80d33', '804a5b86-7693-4109-804f-1c973c00d5b5', 'Juguetes 54', 'package', '54.15', 'kg', '44', '72', '21', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_55', 'f647d352-072f-43f6-afe8-c0ddbaafe4b7', 'ENT055', '3bc9ef59-698b-4859-878a-ce336f2c022d', '2e15048f-904f-4a3c-acbf-a542fc4c2915', 'c2d9a84e-e4d3-4bb9-899c-ffabdf7a8b55', '772d3990-e93c-43e7-adc2-c5caf440152b', 'Material de Construcción 55', 'package', '18.60', 'kg', '45', '36', '85', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_56', '8c77b43c-041e-42f3-901a-0228b962573d', 'ENT056', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e643c9f6-827a-4793-b7ca-a71b7e99a49a', 'ca6ce417-23a8-48e8-b641-aa2074337c6a', '804a5b86-7693-4109-804f-1c973c00d5b5', 'Bebidas 56', 'package', '45.68', 'kg', '77', '89', '60', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_57', '91e1cd3a-6da4-4bc9-bb46-fdd8db500fc2', 'ENT057', '3bc9ef59-698b-4859-878a-ce336f2c022d', '785175e1-63c2-4128-b2c0-d1c2c526bdef', '2d9c7416-22bb-414e-b5e5-32b0745cfc7f', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'Caja Mediana 57', 'package', '54.90', 'kg', '52', '73', '67', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_58', 'e2bd06cd-2c1e-4d88-b7d0-6d4f9df67c5f', 'ENT058', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'a77d17e2-581f-401a-bc38-670e957c6d02', 'c3826d33-176f-4d39-b5fe-d07bbaf7a941', '43b00464-b32e-4c51-8389-e85b85083333', 'Productos Químicos 58', 'package', '9.37', 'kg', '72', '78', '42', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_59', '85fb70d1-0dd0-4a00-98f8-42960e49ee5a', 'ENT059', '3bc9ef59-698b-4859-878a-ce336f2c022d', '4b460cb2-3aec-4142-b295-52c45ddff094', '1fc3794b-05a8-46f1-b7cc-47c5e1bc5588', '68475596-0480-46bc-b453-de5d5c10a298', 'Ropa y Textiles 59', 'package', '94.32', 'kg', '29', '46', '25', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_60', 'efeb3bf9-3258-4749-9ec2-3f9ba7bf3bf0', 'ENT060', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e5e7b595-04e1-4f31-a215-d9b857e7e76e', '2d016db9-9d18-4a2a-9fd4-72c2426aa7ef', '796eb698-e7f9-4337-87aa-45a5b5ae8e52', 'Muebles 60', 'package', '46.04', 'kg', '11', '97', '88', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_61', '81235a63-5b92-46f3-a9c9-9dcbc3b0c198', 'ENT061', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e9fcefae-2ed6-48a6-872f-1f8cec5db8c9', '0be2a059-0fc0-4e97-93b2-735b31f22ebb', 'fc71b2a8-6f9e-4a8d-b1f8-7f19ebeb0d3b', 'Repuestos Automotriz 61', 'package', '2.66', 'kg', '28', '66', '26', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_62', 'e0626f17-b264-4737-bd8d-19fbff71a590', 'ENT062', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'a6e0f689-4e45-4932-85a7-46693dc1e4c6', '17b983c6-e449-45dc-a9ea-7f4fe8e4b29f', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'Ropa y Textiles 62', 'package', '22.58', 'kg', '52', '70', '21', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_63', '9c5466e0-d82f-40d5-aaea-e90a4c1990dd', 'ENT063', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '39b57b40-def2-4ab7-bd2d-a9237a3e7046', '8ea7d389-b5df-41b6-bb33-07dfab52610f', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', 'Caja Pequeña 63', 'package', '81.99', 'kg', '62', '77', '89', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_64', '19cc71d1-ca25-41bc-9b0a-f9c169069ee2', 'ENT064', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '7d0506cb-875d-470a-b820-00ae57061b5f', '4e4a4500-29ff-4089-a43f-167558f12e9e', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', 'Caja Grande 64', 'package', '28.40', 'kg', '98', '68', '72', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_65', '535ad5fa-4562-46bf-ba9f-389162aeee91', 'ENT065', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5e227f42-0c98-4a73-8157-a2d2f88ae5ac', '2d9c7416-22bb-414e-b5e5-32b0745cfc7f', '43b00464-b32e-4c51-8389-e85b85083333', 'Libros y Papelería 65', 'package', '53.44', 'kg', '48', '39', '61', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_66', '76285600-b397-47fe-ad20-95ef6e01c259', 'ENT066', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '78e617a1-708f-4b4f-9c67-d1cf44cde54a', '9a11d561-8793-4b2d-9747-eb649798d39a', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', 'Caja Grande 66', 'package', '54.96', 'kg', '97', '28', '73', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_67', '6741efab-5e15-4cb3-8ac4-73b5e617890d', 'ENT067', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'f5f258f1-a0d0-4ec9-94fc-ff18affd67db', 'a8e2a5a0-987a-4d83-98b8-30772e81342d', '772d3990-e93c-43e7-adc2-c5caf440152b', 'Productos Frágiles 67', 'package', '26.07', 'kg', '41', '70', '95', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_68', '225fdc99-5de4-4573-8597-6ba5c62c99cc', 'ENT068', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6cca4960-2c74-4a50-b953-e0492f46e8fe', 'b58e6548-253e-4c25-82a9-7296c297292d', 'd55d5300-ad11-41f3-a7ef-0bf4b022fc36', 'Ropa y Textiles 68', 'package', '44.75', 'kg', '86', '34', '88', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_69', '62ab411a-7d3a-43e8-909e-ba95a930b6eb', 'ENT069', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6365b041-4047-41c2-8a24-f986083fb501', '0f29b004-4409-45db-97c6-ae0c1b3be16b', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', 'Libros y Papelería 69', 'package', '30.92', 'kg', '45', '18', '18', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_70', '9455c474-f586-4274-9de9-af331f82069d', 'ENT070', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'e6abbf0c-bf16-40b3-a23e-4fbd4359de89', 'f3757075-c81a-4170-9917-97945db7acf9', '00bc721a-d79a-4223-8ea7-19c2d1772684', 'Material de Construcción 70', 'package', '53.51', 'kg', '89', '89', '35', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_71', '9c2d87cc-e930-42e5-9a26-e8bcc9861aa6', 'ENT071', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '5433a755-02a7-484f-8b93-609346466277', '26467f8f-0386-4ee0-a112-19ce10fb4338', '8086cfa9-a6f1-4d23-b3ac-b1df0c425953', 'Productos Frágiles 71', 'package', '30.21', 'kg', '68', '42', '60', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_72', '0c861165-1fdf-4e50-84bc-ea82292b8869', 'ENT072', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e5e7b595-04e1-4f31-a215-d9b857e7e76e', '343cff16-5b38-40b0-8340-63974b7fcb3a', '59d02c09-a36d-48b1-bea2-34b028fdc0fb', 'Ropa y Textiles 72', 'package', '6.82', 'kg', '100', '78', '78', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_73', 'b9b40c94-882d-4ff4-a569-d0c44da77bcb', 'ENT073', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '8959a0e3-c693-4bab-a5c1-3f36998dc41f', '593fe5b2-3ab6-4ad1-bbd9-7ef27335a043', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', 'Medicamentos 73', 'package', '26.90', 'kg', '16', '26', '81', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_74', '4e5fbdf3-24a6-4c05-823d-496cb768cd86', 'ENT074', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e9fcefae-2ed6-48a6-872f-1f8cec5db8c9', '18eda3b6-4355-4ca7-9912-9a4385e6b1a3', '6abb8c4c-cc69-47f8-9000-6c250e679d08', 'Muebles 74', 'package', '12.81', 'kg', '62', '18', '51', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_75', 'fabea8ed-2c06-45cd-a0f7-344fb2920240', 'ENT075', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'fcd024c9-7be0-4326-908c-5c5d9ca27006', '2d9c7416-22bb-414e-b5e5-32b0745cfc7f', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', 'Caja Pequeña 75', 'package', '41.92', 'kg', '74', '41', '89', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_76', 'c3df307d-3d34-4538-8379-176145e48e58', 'ENT076', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5045c61f-18dc-4db8-a77c-ff7afbccc70b', '343cff16-5b38-40b0-8340-63974b7fcb3a', '0bac3346-ca40-4ade-ab39-82dca62f0876', 'Caja Pequeña 76', 'package', '99.25', 'kg', '81', '90', '61', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_77', '49ca8bfe-179d-4086-9106-037fcc1c616f', 'ENT077', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '77e38942-1130-4f5a-89af-77cc77d433ac', '8602befd-beaf-4254-bd6b-65732c52dd04', '6abb8c4c-cc69-47f8-9000-6c250e679d08', 'Material de Construcción 77', 'package', '16.67', 'kg', '14', '55', '15', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_78', '560388ef-7f4b-41dc-817c-cb849d7cc164', 'ENT078', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5b6cdf51-64f9-40c8-9cd5-312e514aac47', '66bfeae3-cb41-4652-b4f7-131cc990cacb', '68475596-0480-46bc-b453-de5d5c10a298', 'Caja Pequeña 78', 'package', '92.76', 'kg', '76', '31', '20', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_79', 'af2a78a5-86e6-4a8e-a4cc-019bfd86e063', 'ENT079', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '161d5c53-9a01-44af-93cf-0f68add1f7a7', '0576ee4a-0f50-4097-857f-e2c67dc37e43', 'dd53bf5a-50be-41c1-ab4c-176641358247', 'Libros y Papelería 79', 'package', '60.44', 'kg', '78', '37', '87', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_80', 'a8a513f4-3b69-4b47-bd45-2a48522818ef', 'ENT080', '3bc9ef59-698b-4859-878a-ce336f2c022d', '96715eb5-2e3d-4afe-af3e-cbefdfd9cacb', 'c3826d33-176f-4d39-b5fe-d07bbaf7a941', '0bac3346-ca40-4ade-ab39-82dca62f0876', 'Electrónica 80', 'package', '40.87', 'kg', '48', '73', '82', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_81', 'f26d23af-be74-44e8-90d1-06d04928916f', 'ENT081', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '94998f67-38ab-40f2-941b-f9a8e9107553', 'e33aaef7-5e0c-4aa3-84a0-f9b95f030443', '33d445a1-6944-4107-b316-23c3580ae4f0', 'Caja Mediana 81', 'package', '34.76', 'kg', '42', '80', '29', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_82', 'd327b21e-dd53-426e-959c-78a22f462b60', 'ENT082', '3bc9ef59-698b-4859-878a-ce336f2c022d', '7b92d439-6d4c-4b46-86f0-1944cef23c65', '01389971-4c76-49f2-9e05-a947a516f933', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', 'Plantas y Flores 82', 'package', '41.03', 'kg', '75', '44', '81', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_83', '72c175fe-7b16-4e6a-ac07-e68e570b1677', 'ENT083', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e5e7b595-04e1-4f31-a215-d9b857e7e76e', 'ab6f45a9-e641-4a37-862a-d2a97bdd9ee6', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', 'Caja Grande 83', 'package', '71.82', 'kg', '44', '30', '44', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_84', 'b5cc12a3-b605-40ef-b1d1-706bc4fdf759', 'ENT084', '3bc9ef59-698b-4859-878a-ce336f2c022d', '14fa0b8c-c37d-4fb2-9e66-ce014db85145', '1dd16f95-060a-411c-9a5e-346544b9cbfb', '4984261e-b398-4bc3-9a45-3b6e9872c854', 'Productos Químicos 84', 'package', '78.11', 'kg', '45', '45', '94', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_85', 'a64152fc-593a-4cc4-b18c-50e8fc4a3679', 'ENT085', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'a77d17e2-581f-401a-bc38-670e957c6d02', 'f5e8470a-9809-489e-9a71-fd5560ec57cb', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', 'Alimentos Frescos 85', 'package', '20.01', 'kg', '65', '26', '93', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_86', '0cd56f7e-01b0-49f9-9271-633336e8f76d', 'ENT086', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '14fa0b8c-c37d-4fb2-9e66-ce014db85145', 'dfec63f8-e2ef-4fad-8311-50f4e7bde399', '823171c3-335c-438a-9e67-2d6a4c1e9571', 'Paquete Estándar 86', 'package', '96.32', 'kg', '32', '85', '67', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_87', '1314416a-dcdd-492d-bf75-a4db2edc9de6', 'ENT087', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'c52048ff-19a7-4272-8bd5-5fac5d7d8552', 'c2d9a84e-e4d3-4bb9-899c-ffabdf7a8b55', 'd7a66ccf-0ac0-4070-ad67-2618c70f7b90', 'Repuestos Automotriz 87', 'package', '15.21', 'kg', '95', '82', '46', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_88', '2540c7e0-8e73-41a8-8e9a-bdf3df514611', 'ENT088', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '964f631a-5440-468e-b67c-a145a3af41e6', '413fe588-11fb-454e-b448-30d433cd5442', '3389c354-331f-4372-9030-d2bbaf7a3de9', 'Electrónica 88', 'package', '44.70', 'kg', '93', '66', '88', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_89', '9c9ed5a7-306f-4564-aa00-23bef01ba680', 'ENT089', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'eff05495-c722-4e98-9d8f-51230bfd03ea', '8ea7d389-b5df-41b6-bb33-07dfab52610f', '4984261e-b398-4bc3-9a45-3b6e9872c854', 'Caja Pequeña 89', 'package', '6.63', 'kg', '48', '53', '60', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_90', '0ae80d8f-8037-498f-9a2d-9489d9b07882', 'ENT090', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ae8ad85b-f51c-45c7-a04a-0a992342631b', '2d9c7416-22bb-414e-b5e5-32b0745cfc7f', 'fc71b2a8-6f9e-4a8d-b1f8-7f19ebeb0d3b', 'Medicamentos 90', 'package', '41.92', 'kg', '28', '68', '27', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_91', 'f7308a1e-1527-4ca4-af3c-8d23fdb7b081', 'ENT091', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '78b6f730-d868-49a2-b08f-66faa1bda5f0', 'd6135ea4-b842-4131-a5aa-c3c8e88b90f6', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', 'Ropa y Textiles 91', 'package', '88.50', 'kg', '10', '37', '47', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_92', '19f6c703-5f32-4985-b1fe-2693cd1e2b59', 'ENT092', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '66e28443-3c13-416c-8679-6593aa9de1ee', '829c6647-f926-4cc3-b695-35cbfa822468', '3389c354-331f-4372-9030-d2bbaf7a3de9', 'Bebidas 92', 'package', '42.56', 'kg', '44', '92', '23', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_93', 'cb8612e7-08e6-4077-b000-c15fdb281f4b', 'ENT093', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e9fcefae-2ed6-48a6-872f-1f8cec5db8c9', '5178d19d-406f-4cb0-b35e-3349a8622e8f', '5eea587f-5fdf-4e21-9493-189f21805f43', 'Caja Grande 93', 'package', '39.41', 'kg', '24', '17', '90', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_94', '728c04be-ef26-4dfb-b403-5141a4034549', 'ENT094', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'fb7fe258-5eab-48b8-ba9c-83e80a983d9a', '5d8940f5-0b40-4a8f-918e-b2838114bdcf', '3389c354-331f-4372-9030-d2bbaf7a3de9', 'Electrodoméstico 94', 'package', '69.21', 'kg', '57', '22', '46', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_95', '8bde621b-94b8-4e1e-ada7-f25cc8da8a2c', 'ENT095', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '045d0c42-b613-42f2-bac9-c6883e42b192', 'a3cf4849-2713-4bb9-b448-4e4837b4af5d', 'd7a66ccf-0ac0-4070-ad67-2618c70f7b90', 'Electrodoméstico 95', 'package', '89.22', 'kg', '86', '79', '64', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_96', '47b72623-dcc7-4f6c-b0b5-15343eb6d4e5', 'ENT096', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'c52048ff-19a7-4272-8bd5-5fac5d7d8552', 'a3dd079f-8c27-43ac-ba70-c744211f6a72', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'Palet Europeo 96', 'package', '65.61', 'kg', '96', '80', '16', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_97', '720ac1f8-1cc2-42eb-be6d-72e1a2d19824', 'ENT097', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ddc40057-7bde-4e97-a78f-2bb77f0eab14', '489f1090-95eb-47bb-9e5a-598d19ed2713', '5eea587f-5fdf-4e21-9493-189f21805f43', 'Caja Mediana 97', 'package', '49.05', 'kg', '99', '69', '35', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_98', '04b3302f-39da-483b-a4bb-b2d277100f61', 'ENT098', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '220c9bdd-3f69-45eb-b33f-e25c67488b4c', 'f061c057-a8a5-45df-95db-5a8195f0a0c7', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', 'Sobre Documentos 98', 'package', '46.77', 'kg', '47', '60', '42', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_99', '6f2edfd8-b8ac-43a7-87bb-9dabcd9ddaab', 'ENT099', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '5b6cdf51-64f9-40c8-9cd5-312e514aac47', 'f2653e05-577e-4bad-8f6c-4d611b7ad2b0', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', 'Electrodoméstico 99', 'package', '30.93', 'kg', '49', '15', '74', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_100', 'b0a730a4-4d68-44a8-9ca6-74964b75ff46', 'ENT100', '3bc9ef59-698b-4859-878a-ce336f2c022d', '7af055ce-f51e-4860-88df-656ae7ab5c79', 'a3cf4849-2713-4bb9-b448-4e4837b4af5d', '68475596-0480-46bc-b453-de5d5c10a298', 'Bebidas 100', 'package', '61.72', 'kg', '48', '88', '72', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_101', '2747e397-e7e9-462e-a2a0-f90aa400f0eb', 'ENT101', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '78e617a1-708f-4b4f-9c67-d1cf44cde54a', '6cf756c7-a9f7-4a89-a79f-af88c33f734e', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', 'Libros y Papelería 101', 'package', '51.09', 'kg', '83', '32', '35', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_102', '26b45797-95f7-4e17-9560-df2656e0b46d', 'ENT102', '3bc9ef59-698b-4859-878a-ce336f2c022d', '993a1f21-524f-4549-9e03-ce63f6951252', '593fe5b2-3ab6-4ad1-bbd9-7ef27335a043', 'd55d5300-ad11-41f3-a7ef-0bf4b022fc36', 'Material de Construcción 102', 'package', '89.19', 'kg', '54', '48', '51', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_103', '17b809b3-2223-422d-8dd7-d251c7393150', 'ENT103', '3bc9ef59-698b-4859-878a-ce336f2c022d', '78e617a1-708f-4b4f-9c67-d1cf44cde54a', '8ea7d389-b5df-41b6-bb33-07dfab52610f', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', 'Juguetes 103', 'package', '10.46', 'kg', '22', '75', '35', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_104', '732e0a3b-5919-431c-aa0b-b5a07e0f3894', 'ENT104', '3bc9ef59-698b-4859-878a-ce336f2c022d', '1cf8ebcc-1dc8-48be-9879-a46c89c195d9', 'b58e6548-253e-4c25-82a9-7296c297292d', '8c153eab-552a-4986-b1bb-d781b92dc91a', 'Electrónica 104', 'package', '10.14', 'kg', '94', '52', '98', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_105', '4ef60ba0-7c96-4ad6-b489-a63dd0a5670d', 'ENT105', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e9fcefae-2ed6-48a6-872f-1f8cec5db8c9', 'dfec63f8-e2ef-4fad-8311-50f4e7bde399', '8c153eab-552a-4986-b1bb-d781b92dc91a', 'Bebidas 105', 'package', '35.56', 'kg', '49', '79', '14', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_106', '86e61033-685e-43d7-af36-0766dead56f9', 'ENT106', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '74045a03-3bea-4bb9-8bd0-2eda13db27f5', '3cb604b8-604f-4f68-abc0-99d20e38e2a4', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', 'Ropa y Textiles 106', 'package', '75.37', 'kg', '42', '46', '44', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_107', '844835c9-62e3-4746-b7bd-e26040b7eff9', 'ENT107', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'b4724d93-8134-4b4e-843f-d2a8a5aa3969', '6c7120e6-268b-4c43-aaa7-8f9d88df43be', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', 'Plantas y Flores 107', 'package', '40.04', 'kg', '37', '49', '80', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_108', 'a79acacb-2774-4aa7-ad75-2fb64af0d4e0', 'ENT108', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '7e788dfd-49a1-439a-9008-46687f01cdc2', '1fc3794b-05a8-46f1-b7cc-47c5e1bc5588', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'Medicamentos 108', 'package', '35.05', 'kg', '46', '86', '33', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_109', 'f0e90c66-3983-4c43-9659-c2985d90bd84', 'ENT109', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'c9b9eca4-03f5-4774-8b98-a2134e589c1b', '17b983c6-e449-45dc-a9ea-7f4fe8e4b29f', 'fc71b2a8-6f9e-4a8d-b1f8-7f19ebeb0d3b', 'Caja Grande 109', 'package', '57.67', 'kg', '77', '33', '79', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_110', '14043ca0-31a9-415f-9fa4-7e367002e13f', 'ENT110', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'df54cd81-373d-449c-a326-c3cba0b392c1', 'd6135ea4-b842-4131-a5aa-c3c8e88b90f6', '804a5b86-7693-4109-804f-1c973c00d5b5', 'Libros y Papelería 110', 'package', '68.68', 'kg', '43', '35', '32', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_111', '2684b8d8-8869-43fd-8cb2-8bf68db07a13', 'ENT111', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '672a75b3-d482-4187-8318-3980f8a175c0', '19a79810-8a9d-46c8-aa92-ae7af1d52149', 'a1a01c17-edd5-4745-a829-ecfbe82160f0', 'Caja Mediana 111', 'package', '19.84', 'kg', '99', '41', '67', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_112', '3bc96793-902d-43a3-b62a-008b5fd0559b', 'ENT112', '3bc9ef59-698b-4859-878a-ce336f2c022d', '83fa6855-22aa-415a-9f7b-a9729f2a5fcc', '4b5d6263-4bea-4ffe-8be5-98ed9a960727', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'Productos Frágiles 112', 'package', '26.05', 'kg', '80', '19', '40', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_113', '8d9c7ff6-fa5c-4b48-aac9-9105bd596b78', 'ENT113', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ab3f3701-849e-4aa2-8645-12a12fe38aed', 'e03fe0dd-26b8-4315-a638-411161b80d33', 'ef674ca0-a652-4081-997b-afa4125b0362', 'Juguetes 113', 'package', '64.32', 'kg', '73', '92', '50', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_114', '57132b66-4e8b-4acb-903a-b0f66719b645', 'ENT114', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'df855ce8-7132-405f-81bd-1b3bb521bf75', '9f3a8e27-102d-4090-99f2-31ad12f5431d', '72d0e1d7-063c-4f05-b105-f83026137da4', 'Productos Frágiles 114', 'package', '70.65', 'kg', '84', '29', '57', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_115', '057a459d-d248-4ade-8c39-58a806cbe3b9', 'ENT115', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e5e7b595-04e1-4f31-a215-d9b857e7e76e', 'ac4d31b4-5f7a-45c6-a954-64d6bd4f784d', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', 'Alimentos Frescos 115', 'package', '23.13', 'kg', '77', '83', '98', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_116', 'f7c2e998-e2ef-4c68-a760-de4b95d7b4da', 'ENT116', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '672a75b3-d482-4187-8318-3980f8a175c0', '1d6ddde7-e577-4361-bbf1-5c20c2623b92', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', 'Caja Grande 116', 'package', '10.85', 'kg', '77', '51', '65', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_117', '3cfdb6ec-eecc-422c-b013-722b9d4995ab', 'ENT117', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '220c9bdd-3f69-45eb-b33f-e25c67488b4c', '6cf756c7-a9f7-4a89-a79f-af88c33f734e', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'Bebidas 117', 'package', '29.32', 'kg', '92', '58', '22', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_118', '68869f19-98d7-471f-8f62-075986326206', 'ENT118', '3bc9ef59-698b-4859-878a-ce336f2c022d', '7af055ce-f51e-4860-88df-656ae7ab5c79', '33eee731-8046-4b53-a60b-8c07886dd347', '43b00464-b32e-4c51-8389-e85b85083333', 'Muebles 118', 'package', '98.57', 'kg', '55', '93', '16', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_119', '9414838a-dd79-4858-ac60-9a3d71e9141a', 'ENT119', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ab5a325c-0d57-48fb-b57f-4e633ad6b7bc', '0fbdc6a5-eb43-4b7a-bb0d-75d7f91a1045', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'Repuestos Automotriz 119', 'package', '11.97', 'kg', '56', '59', '10', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_120', 'beda62cc-d278-439a-b3bd-0bde3be3fa65', 'ENT120', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '96715eb5-2e3d-4afe-af3e-cbefdfd9cacb', 'e03fe0dd-26b8-4315-a638-411161b80d33', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'Plantas y Flores 120', 'package', '91.22', 'kg', '56', '30', '84', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_121', '746fdc3f-475e-4a95-99ac-de8f0a5ad260', 'ENT121', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'b175286e-de08-43b0-b880-04c1d0149407', '6cf756c7-a9f7-4a89-a79f-af88c33f734e', '5eea587f-5fdf-4e21-9493-189f21805f43', 'Alimentos Frescos 121', 'package', '24.13', 'kg', '93', '19', '72', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_122', 'c662e573-ce85-4be3-a664-e1b8fab2302f', 'ENT122', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'c52048ff-19a7-4272-8bd5-5fac5d7d8552', 'a3cf4849-2713-4bb9-b448-4e4837b4af5d', '5247e6eb-fab2-4d9d-b975-31b50d00b670', 'Libros y Papelería 122', 'package', '71.05', 'kg', '40', '65', '81', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_123', 'cc74d1e7-4e21-48ca-a8d1-5d570dcbd8c5', 'ENT123', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'a7f2d0d3-7f6f-49c8-a5cd-78833d444837', 'e80b5643-73b1-427d-beeb-e36af746da56', '8c153eab-552a-4986-b1bb-d781b92dc91a', 'Alimentos Frescos 123', 'package', '18.33', 'kg', '46', '76', '49', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_124', '86b16446-e121-450c-b321-d50c0488548a', 'ENT124', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '66b461a4-c487-43cb-aff5-3ec2c0bb7ff3', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'Electrónica 124', 'package', '4.09', 'kg', '39', '18', '91', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_125', 'cf83ac90-3143-4a37-a563-a18a6c21f070', 'ENT125', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '4b831fd3-3241-4c4e-b5a3-ae3dac94d20b', '8c0174d7-fd52-490b-ba2f-237af65b1337', 'a1a01c17-edd5-4745-a829-ecfbe82160f0', 'Productos Frágiles 125', 'package', '14.10', 'kg', '47', '46', '79', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_126', '347c3674-52fa-47e5-a284-5509eb07d957', 'ENT126', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '2decab24-8c36-410e-a44e-acb1346e72d4', 'fc492f63-5e2c-4b67-b96f-b25d4d39dcec', 'dd53bf5a-50be-41c1-ab4c-176641358247', 'Caja Grande 126', 'package', '75.98', 'kg', '74', '96', '60', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_127', 'abcd77a3-609e-4ccb-ad90-339428d8550b', 'ENT127', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '9d4006a9-a037-4a69-aca6-cbdebdf5828b', '343cff16-5b38-40b0-8340-63974b7fcb3a', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'Medicamentos 127', 'package', '14.85', 'kg', '38', '12', '93', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_128', 'b1471690-e32c-4191-ab4b-f4d60829917c', 'ENT128', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'eff05495-c722-4e98-9d8f-51230bfd03ea', 'af94f915-2ad8-4e83-a384-5318435712e2', 'd229c27a-1e52-4532-8f0b-b7b3d82188be', 'Alimentos Frescos 128', 'package', '20.76', 'kg', '77', '23', '80', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_129', '16ddf451-b62f-45d4-9132-847cd1fcd0b0', 'ENT129', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5433a755-02a7-484f-8b93-609346466277', 'ca6ce417-23a8-48e8-b641-aa2074337c6a', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'Sobre Documentos 129', 'package', '35.29', 'kg', '52', '79', '100', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_130', '8d96c37d-b1d8-457d-9065-4c086646601d', 'ENT130', '3bc9ef59-698b-4859-878a-ce336f2c022d', '78e617a1-708f-4b4f-9c67-d1cf44cde54a', '829c6647-f926-4cc3-b695-35cbfa822468', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'Ropa y Textiles 130', 'package', '31.12', 'kg', '78', '29', '93', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_131', '52b91594-19d4-4ae8-a8aa-2b9b2352500c', 'ENT131', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'dee13063-f937-419e-bf61-25753e390b2c', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'Electrónica 131', 'package', '94.91', 'kg', '69', '82', '22', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_132', '5a75ce89-37d2-4792-90c1-8b87ddaaf31d', 'ENT132', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e6abbf0c-bf16-40b3-a23e-4fbd4359de89', '289d407c-4eca-4a38-b115-369be7a1557c', '8c153eab-552a-4986-b1bb-d781b92dc91a', 'Productos Frágiles 132', 'package', '16.42', 'kg', '23', '91', '71', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_133', '45894cec-f1af-49c2-a52c-b136bbcfa2f3', 'ENT133', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'a7f2d0d3-7f6f-49c8-a5cd-78833d444837', 'b68b77ee-da97-455f-806f-74d339a319d4', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', 'Productos Químicos 133', 'package', '83.01', 'kg', '43', '59', '46', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_134', 'eed97029-5a04-4eac-a123-869601634e26', 'ENT134', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '5045c61f-18dc-4db8-a77c-ff7afbccc70b', '80343a0b-b67b-45c0-a060-1b2798b18624', '693836f9-4dd4-4947-982f-5bd1dcaf717d', 'Material de Construcción 134', 'package', '77.65', 'kg', '64', '89', '92', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_135', '1d947798-37b5-40fb-9fcf-0c320c0043d7', 'ENT135', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8132bd2e-5dc2-4117-9881-c0f4889f80fc', '8602befd-beaf-4254-bd6b-65732c52dd04', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', 'Material de Construcción 135', 'package', '23.74', 'kg', '31', '40', '15', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_136', '8a28411c-750d-4a6d-bc04-a6f01a6201ad', 'ENT136', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'a7f2d0d3-7f6f-49c8-a5cd-78833d444837', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', '772d3990-e93c-43e7-adc2-c5caf440152b', 'Plantas y Flores 136', 'package', '37.47', 'kg', '50', '87', '100', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_137', '6beb00cf-7e57-4ebd-9a7c-dab78b662c56', 'ENT137', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'adb45209-7e80-4e00-84a6-e82df285586c', 'e03fe0dd-26b8-4315-a638-411161b80d33', 'c3b928d8-da55-4b7a-b299-d04beb2f74ef', 'Productos Frágiles 137', 'package', '6.02', 'kg', '91', '68', '46', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_138', '054dd49d-69f9-407b-a0af-b78bbab81a39', 'ENT138', '3bc9ef59-698b-4859-878a-ce336f2c022d', '0f82bfad-8373-4455-a9ad-ea9740bfa411', '0fbdc6a5-eb43-4b7a-bb0d-75d7f91a1045', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', 'Productos Frágiles 138', 'package', '27.42', 'kg', '10', '43', '14', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_139', '9e2a1c33-248b-4d46-afe4-cd40fb06ebea', 'ENT139', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ddc40057-7bde-4e97-a78f-2bb77f0eab14', 'fc492f63-5e2c-4b67-b96f-b25d4d39dcec', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'Repuestos Automotriz 139', 'package', '43.37', 'kg', '37', '91', '47', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_140', '6efa0e45-20a7-486f-b83e-77829f96712c', 'ENT140', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '14fa0b8c-c37d-4fb2-9e66-ce014db85145', '2d9c7416-22bb-414e-b5e5-32b0745cfc7f', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', 'Muebles 140', 'package', '48.22', 'kg', '47', '32', '30', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_141', 'f5618580-3269-4a52-a24a-31fab48608f8', 'ENT141', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ba92d763-32e1-42c5-b56c-6c42a5b4c5cc', '343cff16-5b38-40b0-8340-63974b7fcb3a', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'Alimentos Frescos 141', 'package', '92.45', 'kg', '36', '100', '61', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_142', '65d04604-571b-4cc8-b538-0bc868cc2870', 'ENT142', '3bc9ef59-698b-4859-878a-ce336f2c022d', '71c1cbe5-d94d-4653-9276-71b475b36453', '4b5d6263-4bea-4ffe-8be5-98ed9a960727', '772d3990-e93c-43e7-adc2-c5caf440152b', 'Bebidas 142', 'package', '50.36', 'kg', '70', '58', '74', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_143', '0cacfc18-e9d1-4012-9645-b342844003c0', 'ENT143', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e26678bd-549a-4717-8588-94edaa81baa3', 'f3757075-c81a-4170-9917-97945db7acf9', '011f19e3-f1bb-4ae9-bd41-c101da82fa1d', 'Alimentos Frescos 143', 'package', '69.07', 'kg', '18', '43', '52', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_144', '20c7bb54-b598-41cc-bc72-c5b1e9d3a4b6', 'ENT144', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '96715eb5-2e3d-4afe-af3e-cbefdfd9cacb', '0f29b004-4409-45db-97c6-ae0c1b3be16b', 'ef674ca0-a652-4081-997b-afa4125b0362', 'Productos Químicos 144', 'package', '39.16', 'kg', '98', '83', '83', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_145', '8d9a6ce2-0cb7-45c7-a12c-ab00f3b7f565', 'ENT145', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '01f495f1-69a6-471d-955e-82cee5b97c52', 'ca6ce417-23a8-48e8-b641-aa2074337c6a', 'd55d5300-ad11-41f3-a7ef-0bf4b022fc36', 'Electrodoméstico 145', 'package', '84.49', 'kg', '54', '23', '14', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_146', '0b62ccc8-9cf0-4a0b-b0cd-a50b6b69dbba', 'ENT146', '3bc9ef59-698b-4859-878a-ce336f2c022d', '341c27c0-81a3-4afc-a393-77797d8dcd2b', '9f3a8e27-102d-4090-99f2-31ad12f5431d', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', 'Ropa y Textiles 146', 'package', '46.74', 'kg', '11', '89', '48', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_147', 'ba28e5fa-8f73-4033-9747-2b0682072f7c', 'ENT147', '3bc9ef59-698b-4859-878a-ce336f2c022d', '94998f67-38ab-40f2-941b-f9a8e9107553', '91b139e4-3ac6-4e38-9b79-b26627cac7dd', '674c8ba3-0b11-4497-b77d-239226fcb94c', 'Caja Mediana 147', 'package', '81.33', 'kg', '29', '68', '25', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_148', 'bda8527b-cc31-47c4-9090-9b4a9f226612', 'ENT148', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'c52048ff-19a7-4272-8bd5-5fac5d7d8552', '20bb0599-e636-433d-ad9d-c810d223eaef', '674c8ba3-0b11-4497-b77d-239226fcb94c', 'Electrodoméstico 148', 'package', '96.88', 'kg', '17', '80', '58', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_149', 'b5fd3635-f834-454e-a0f3-ad5e5e72b9c4', 'ENT149', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'e643c9f6-827a-4793-b7ca-a71b7e99a49a', 'c305ce1d-cb5d-414d-adac-5cd2fd7cde29', 'e6b4d03e-fbc7-4f69-8f6c-6d7699ff34c6', 'Caja Pequeña 149', 'package', '24.77', 'kg', '46', '79', '29', 'cm', NOW(), NOW());

INSERT INTO entities (_key, uuid, public_id, company_uuid, payload_uuid, tracking_number_uuid, destination_uuid, name, type, weight, weight_unit, length, width, height, dimensions_unit, created_at, updated_at) VALUES
('entity_150', '35a6d63b-8836-4be4-a22b-56013024b26c', 'ENT150', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '66b461a4-c487-43cb-aff5-3ec2c0bb7ff3', '3d39df3a-5d57-4cae-aece-2399e5b63020', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'Material de Construcción 150', 'package', '52.22', 'kg', '94', '79', '28', 'cm', NOW(), NOW());

-- ========================================
-- 12. ÓRDENES (Orders)
-- ========================================
INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_1', '40f1f762-4cfe-4fcd-abf8-0a5c23cad71f', 'ORDER001', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-59489', '7b92d439-6d4c-4b46-86f0-1944cef23c65', 'f3757075-c81a-4170-9917-97945db7acf9', NULL, 'ca3a3922-0030-49ab-a1a7-119801556931', 'delivery', 'dispatched', false, false, 20341, 4944, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_2', 'e2b1e49d-7199-4fbd-8926-f33daf725d8c', 'ORDER002', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-39557', 'fb7fe258-5eab-48b8-ba9c-83e80a983d9a', 'b68b77ee-da97-455f-806f-74d339a319d4', 'ffe3505b-83bd-4405-8350-865d522ed2c4', '91a7e3d2-d8f0-4ea0-9fcf-28a358847f16', 'transfer', 'pending', false, false, 47574, 2558, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_3', 'f7a8b79a-a6a4-441a-8d80-4ac2cd83d10b', 'ORDER003', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-52043', 'fb5bd06d-94d8-42f0-8a80-803a39157f50', 'fb3357e6-6045-4ca9-b726-2a01ffb8172c', 'f550fc5a-3ca3-48b8-b57b-5dcd3b3bd2d4', 'fa45f076-7288-4420-a6e3-e67a9fab6a98', 'transfer', 'completed', true, true, 13724, 5067, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_4', '250f9582-d3c2-4f56-87a7-dfd857cacbf9', 'ORDER004', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-51579', '8959a0e3-c693-4bab-a5c1-3f36998dc41f', '33eee731-8046-4b53-a60b-8c07886dd347', 'ffe8b58d-e0d4-44b3-b63b-fca6d5f50e23', '9334e704-dc2d-464b-aeff-ea53fd6876c7', 'freight', 'dispatched', true, true, 5235, 1755, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_5', 'ae7fbe81-fb75-47aa-969a-03651b4b98db', 'ORDER005', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-35753', '66e28443-3c13-416c-8679-6593aa9de1ee', '829c6647-f926-4cc3-b695-35cbfa822468', NULL, '91a7e3d2-d8f0-4ea0-9fcf-28a358847f16', 'return', 'pending', false, false, 45022, 605, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_6', '20dd82f3-f37a-489e-bd68-8a5ea7b03400', 'ORDER006', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-42860', 'c9b9eca4-03f5-4774-8b98-a2134e589c1b', 'a3dd079f-8c27-43ac-ba70-c744211f6a72', '9f9b2e1f-0c91-497a-9901-7054f3747119', 'e695b368-ccf0-4720-866d-9eb1a339c5f6', 'transfer', 'pending', false, false, 15647, 5126, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_7', '9ffd6983-6768-4ad7-b5b2-46898562c11e', 'ORDER007', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-39076', 'e26678bd-549a-4717-8588-94edaa81baa3', '20bb0599-e636-433d-ad9d-c810d223eaef', NULL, 'fa45f076-7288-4420-a6e3-e67a9fab6a98', 'pickup', 'completed', false, false, 23612, 3561, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_8', '1a06c848-288c-4ffc-87e6-4d3eef4f237d', 'ORDER008', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-89198', '7e788dfd-49a1-439a-9008-46687f01cdc2', 'af94f915-2ad8-4e83-a384-5318435712e2', NULL, 'b84f1528-bde5-4f96-a55f-aa2648cfab4f', 'pickup', 'dispatched', true, true, 25678, 5145, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_9', '14ee1314-ba0c-4ac7-87e3-06c1ca948d8a', 'ORDER009', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-25291', 'df54cd81-373d-449c-a326-c3cba0b392c1', 'eba25f8b-ca9c-474e-b477-a22b2cb03e99', NULL, 'deea4f80-7fc9-4470-a7b7-be3f362a6b9b', 'freight', 'canceled', true, false, 6597, 4114, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_10', '834c674f-effa-4c20-bac5-441b88b74762', 'ORDER010', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-81609', '13f2b61a-f6b7-4e1d-bd7b-d370aa5766fc', '80343a0b-b67b-45c0-a060-1b2798b18624', NULL, '9334e704-dc2d-464b-aeff-ea53fd6876c7', 'transfer', 'pending', true, false, 4977, 6612, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_11', '88edba7f-f398-4aac-94b8-60235a8c5c71', 'ORDER011', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-21237', '341c27c0-81a3-4afc-a393-77797d8dcd2b', '58422cb3-7c78-4095-acb9-5352983e547a', NULL, '497b9693-7c26-49f1-8aab-606e9640d2da', 'transfer', 'completed', false, false, 9028, 5823, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_12', '877abebd-f651-41c6-b9e9-e08b267f9f8b', 'ORDER012', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-11267', '42a795fa-e040-4e87-b56f-216ca347b5f5', '0be2a059-0fc0-4e97-93b2-735b31f22ebb', '85f97c62-7282-4dc1-997b-a34ff13ac9b7', NULL, 'pickup', 'pending', true, true, 13619, 5270, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_13', '007c125a-98bf-4ecb-a5e7-f279ca134f7f', 'ORDER013', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-19747', '0196a29a-4e76-4921-870e-35a059bbbcf7', 'e03fe0dd-26b8-4315-a638-411161b80d33', NULL, NULL, 'freight', 'completed', false, true, 12542, 3642, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_14', 'bd67ff48-b93a-41f6-910d-7a2272d7f5b6', 'ORDER014', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-86948', 'dee13063-f937-419e-bf61-25753e390b2c', '4f260c73-f7ca-4ec3-be02-69272a302fbc', '36d07950-d06a-4369-ab88-bbe023d3959f', '35888847-1565-4281-af4f-9a6a43ceca2a', 'pickup', 'enroute', true, true, 7497, 6290, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_15', '7a170313-3df2-4323-9a2d-136eb8e98572', 'ORDER015', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-19245', 'b949c8ab-5388-4eda-be2f-1c4a21fc3c57', '235de295-8d1e-4e89-8998-ea99d8695c11', NULL, 'ab0b935e-2c93-4381-9098-10d9c1cd6279', 'return', 'canceled', false, false, 23810, 2285, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_16', 'f59d4734-f24a-4da5-9e3f-daa4d0888ee8', 'ORDER016', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-85423', 'e6abbf0c-bf16-40b3-a23e-4fbd4359de89', 'd2303a10-ff0b-4319-b17d-d0a71a8d6568', '7c8bf8a1-a0e8-41bc-a531-794563607aff', 'a1e82599-001c-4f4b-82cc-e5510efb9b09', 'transfer', 'completed', false, false, 21195, 679, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_17', 'a21a4fcd-46a5-4168-8463-7884dbd5c5a5', 'ORDER017', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-42052', '0f82bfad-8373-4455-a9ad-ea9740bfa411', '19a79810-8a9d-46c8-aa92-ae7af1d52149', 'd4516faa-23ea-4895-9477-a0ff77dd1535', 'dcb5a0d9-1aaf-4443-9334-364a2cd07fe5', 'return', 'canceled', false, true, 33740, 5126, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_18', 'd1b7f687-b3de-4e13-a1c5-ec71a82ef85d', 'ORDER018', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-35487', '2e15048f-904f-4a3c-acbf-a542fc4c2915', '9a09f766-1614-4d67-afac-778152cef96a', 'b4764ca7-deb6-4a47-913f-3a5143d56c98', NULL, 'return', 'completed', false, true, 15704, 1131, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_19', '7e2ef3c4-7530-4ede-933b-e30a569a3306', 'ORDER019', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-18692', '38b92cc6-0837-4b62-8a4c-d4e39db3cccb', '9a11d561-8793-4b2d-9747-eb649798d39a', NULL, '665cc78f-ebfa-454a-9c20-df64a516aa23', 'transfer', 'driver_assigned', false, false, 38725, 3231, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_20', '0182f32c-f2f5-464c-8399-1fed37255570', 'ORDER020', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-34971', '39b57b40-def2-4ab7-bd2d-a9237a3e7046', '771e076b-2ce3-46c0-a842-6f66fc16ca3f', '8a053a76-b603-4ff8-8887-7fb4e38356d3', NULL, 'delivery', 'pending', true, true, 19434, 2645, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_21', 'e1de9024-ba65-498b-8739-c68d664b2ed6', 'ORDER021', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-38265', '6cca4960-2c74-4a50-b953-e0492f46e8fe', '2d99b2b6-4344-4b3b-9799-e4d3c68e24ad', NULL, 'c5746061-beaf-43c4-aa55-417ba55f267f', 'pickup', 'pending', true, true, 40839, 3139, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_22', 'cede1494-a338-49c9-8332-3b168c9d35ab', 'ORDER022', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-62153', 'ab3f3701-849e-4aa2-8645-12a12fe38aed', 'ac4d31b4-5f7a-45c6-a954-64d6bd4f784d', '497b8716-bdfa-48dc-8cd4-9d4dcb1a6341', 'c9211e62-d18a-46eb-8153-cd98e134b870', 'transfer', 'dispatched', false, false, 43634, 4279, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_23', 'f663e747-8cef-424c-89f3-759e79feb096', 'ORDER023', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-32903', '78b6f730-d868-49a2-b08f-66faa1bda5f0', '60bcf3c1-5b23-4754-8a3b-566976860ac2', 'e5523494-e835-48be-87e2-f003080e6dbd', '7d9218c0-6acb-4c8f-8998-2812c4abfe99', 'freight', 'pending', true, true, 34984, 1530, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_24', '7eba0823-829a-4f13-98bd-8c156523474c', 'ORDER024', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-71043', '94998f67-38ab-40f2-941b-f9a8e9107553', '6c7120e6-268b-4c43-aaa7-8f9d88df43be', '1fcea0f2-0251-4b12-bf77-b50d9d363df4', NULL, 'return', 'completed', false, true, 20118, 996, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_25', 'da79320b-0afa-47bd-b7f9-0a408bba883c', 'ORDER025', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-50340', '74045a03-3bea-4bb9-8bd0-2eda13db27f5', '3f9ee02d-f8e9-4bb4-a730-610e038a4d11', '92d39d43-ecf4-4db5-8a6e-fd9d75c9af1d', NULL, 'pickup', 'enroute', true, true, 29414, 1345, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_26', '2e05c562-ccfa-4ffd-bd92-9dd73eb4e87b', 'ORDER026', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-86802', '7af055ce-f51e-4860-88df-656ae7ab5c79', '18eda3b6-4355-4ca7-9912-9a4385e6b1a3', NULL, '1b239127-c1f9-4fcf-9bb0-89030c70e6cc', 'transfer', 'completed', true, false, 34659, 4282, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_27', 'de8a7692-bb13-4d2f-acc8-5b0819f1b67c', 'ORDER027', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-17738', 'a974e85b-8cf2-41b1-ad2b-f21e72d5f45e', 'ac9059ac-70e0-42b2-bc49-848e820d67af', 'b4764ca7-deb6-4a47-913f-3a5143d56c98', '279eb670-713a-460b-aeae-e5952d632067', 'return', 'canceled', true, false, 15395, 7120, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_28', '3cba45a3-fea7-4e42-8115-923057d5761a', 'ORDER028', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-55103', '5045c61f-18dc-4db8-a77c-ff7afbccc70b', '6cf756c7-a9f7-4a89-a79f-af88c33f734e', 'd4516faa-23ea-4895-9477-a0ff77dd1535', 'b84f1528-bde5-4f96-a55f-aa2648cfab4f', 'transfer', 'driver_assigned', true, false, 46082, 1184, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_29', '78d4135e-b8e1-4a76-9206-fc8bbd0a5e2d', 'ORDER029', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-63452', '220c9bdd-3f69-45eb-b33f-e25c67488b4c', '0fbdc6a5-eb43-4b7a-bb0d-75d7f91a1045', NULL, 'a3d8d96e-e956-4279-80b8-843110743acc', 'delivery', 'pending', false, true, 5963, 5528, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_30', 'c5d8249e-6988-4e60-bfc2-3d90c286668d', 'ORDER030', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-19891', '9d4006a9-a037-4a69-aca6-cbdebdf5828b', 'c38002a4-793f-4407-88ca-315f063f8498', 'c83af5f4-9301-44ae-bb66-32b8c8f61e2e', 'a6bcef81-f789-47b1-b352-904c2718f860', 'return', 'pending', true, true, 5940, 524, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_31', 'ba570909-2d47-4533-9e2a-b4d4b4a7fb3e', 'ORDER031', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-11183', 'ea18e705-e1d0-4246-a05c-c24de2849560', '9f3a8e27-102d-4090-99f2-31ad12f5431d', 'f623a834-2f4c-4194-8c5f-30bcf26da51a', '7b090f8e-d359-49e8-a203-d8142c5f1be5', 'delivery', 'canceled', true, false, 40491, 6963, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_32', '489c7e3c-09ee-4576-b967-e8a58187ae2e', 'ORDER032', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-27600', 'e9fcefae-2ed6-48a6-872f-1f8cec5db8c9', 'c3826d33-176f-4d39-b5fe-d07bbaf7a941', 'd4067654-8d8a-48e3-9719-1d73de6f4baa', NULL, 'pickup', 'driver_assigned', true, false, 19442, 5180, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_33', '889bc269-4bd2-468b-b10c-b77062ea8ce7', 'ORDER033', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-60141', 'e643c9f6-827a-4793-b7ca-a71b7e99a49a', '92b531d7-9349-4837-a2c0-5d173c89aea7', NULL, '35888847-1565-4281-af4f-9a6a43ceca2a', 'freight', 'canceled', false, false, 31732, 5043, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_34', '22ef7a58-3fa7-47c7-a3c4-4f5be4cae868', 'ORDER034', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-65583', '4b460cb2-3aec-4142-b295-52c45ddff094', '3d5dd5e0-52e8-4eda-a56b-9bacace8a6bd', '92d39d43-ecf4-4db5-8a6e-fd9d75c9af1d', 'ab54a2db-4938-4c76-89b1-c0eb5e43d4f7', 'pickup', 'driver_assigned', true, false, 37365, 2352, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_35', 'a3d51036-9960-4e68-91ac-9b3add9137f5', 'ORDER035', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-72480', '5b6cdf51-64f9-40c8-9cd5-312e514aac47', '26467f8f-0386-4ee0-a112-19ce10fb4338', 'f623a834-2f4c-4194-8c5f-30bcf26da51a', 'fa45f076-7288-4420-a6e3-e67a9fab6a98', 'delivery', 'pending', true, true, 45967, 2169, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_36', 'fc39bbbc-9a6f-486c-92f6-9223fb47233f', 'ORDER036', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-67023', 'a79384a5-3344-4823-bfc2-ac5583c09e28', '47378033-5c10-4c46-beea-03cca7acb066', 'ae04ba30-c338-444d-a5ad-2349e39dc189', 'ab54a2db-4938-4c76-89b1-c0eb5e43d4f7', 'return', 'completed', true, false, 18523, 5691, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_37', 'bac49380-088b-4dd0-8176-e9e26f3851e0', 'ORDER037', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-67487', 'f3703967-8963-4449-89f6-93e48f74531a', '8602befd-beaf-4254-bd6b-65732c52dd04', NULL, 'a3d8d96e-e956-4279-80b8-843110743acc', 'freight', 'pending', true, false, 47019, 1810, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_38', '0e0a0e3a-20e7-43cb-a31a-6a5501b67aef', 'ORDER038', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-59665', '14fa0b8c-c37d-4fb2-9e66-ce014db85145', '5d8940f5-0b40-4a8f-918e-b2838114bdcf', 'de3a152d-e14d-4225-8ea2-9187e3cbb2c7', 'dcb5a0d9-1aaf-4443-9334-364a2cd07fe5', 'pickup', 'dispatched', false, true, 3322, 4344, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_39', '4f2c7709-9580-4ffb-adea-ed087bc755de', 'ORDER039', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-57406', '045d0c42-b613-42f2-bac9-c6883e42b192', '2d016db9-9d18-4a2a-9fd4-72c2426aa7ef', '5b4652f1-9c32-4429-ba6a-04b4295215b8', NULL, 'delivery', 'pending', false, true, 23305, 1483, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_40', 'a8f84a4f-d39f-4439-972f-a8578506898a', 'ORDER040', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-97424', '1ef23503-e07b-4c07-a2ac-a8129917a53c', '1dd16f95-060a-411c-9a5e-346544b9cbfb', 'f550fc5a-3ca3-48b8-b57b-5dcd3b3bd2d4', 'b84f1528-bde5-4f96-a55f-aa2648cfab4f', 'return', 'pending', false, true, 39765, 1030, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_41', 'a9690274-59ff-41a5-b4c6-0583ea2663cd', 'ORDER041', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-65632', 'a7f2d0d3-7f6f-49c8-a5cd-78833d444837', '112d8f72-6552-467c-a69c-bd395dc93bdd', NULL, '1b239127-c1f9-4fcf-9bb0-89030c70e6cc', 'delivery', 'completed', true, false, 49945, 2371, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_42', '21ef4860-4a43-4967-8421-0ad36af76a5f', 'ORDER042', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-21645', 'cb97d7db-a1f3-414e-b509-8712e7acfc36', '8bc680d8-1ea4-4910-b773-f0d30eb46ceb', '2588e8d0-a05a-4070-a585-ba79aadb88c6', NULL, 'return', 'enroute', true, false, 24851, 7158, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_43', '965d8c19-58d3-471a-9ebd-8eb892d23e15', 'ORDER043', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-90134', 'a77d17e2-581f-401a-bc38-670e957c6d02', 'e51be0fe-7027-4b64-b11a-0ff8e6e7866c', '6c45492b-913a-4e97-b0c3-3570efacf2eb', NULL, 'transfer', 'enroute', true, false, 45979, 2797, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_44', 'ed06dce1-1328-4581-b536-db728c61c14b', 'ORDER044', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-22538', '27d5e354-622d-444d-8403-b0e9c806f3a8', 'fc492f63-5e2c-4b67-b96f-b25d4d39dcec', '6c45492b-913a-4e97-b0c3-3570efacf2eb', NULL, 'transfer', 'driver_assigned', false, true, 34072, 5604, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_45', 'd7fa2a01-9474-4381-a6a1-afccd680e8b3', 'ORDER045', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-69388', '672a75b3-d482-4187-8318-3980f8a175c0', '4cff679b-8e58-4d08-aaf2-3fb11c41f5fc', 'f550fc5a-3ca3-48b8-b57b-5dcd3b3bd2d4', NULL, 'return', 'driver_assigned', false, false, 45725, 713, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_46', '1f46de53-2ca0-4354-b0c7-95b61b1b37f4', 'ORDER046', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-75589', '964f631a-5440-468e-b67c-a145a3af41e6', '7975205e-1831-4cc1-9e6c-ebff80db893d', 'a4d61a8f-74e4-43fa-a3f2-b011a968469e', '8eedd4ac-5bc1-4bf9-9b06-f53d387a9b40', 'delivery', 'enroute', false, true, 35248, 4653, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_47', 'da690bd8-b513-48e2-b4c8-de7021cc991e', 'ORDER047', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-16140', '6186806a-b939-476d-9760-7931de34d428', 'ca6ce417-23a8-48e8-b641-aa2074337c6a', 'e31d1c29-1754-4cd7-9166-8a0380fe3202', NULL, 'transfer', 'driver_assigned', false, false, 35684, 1499, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_48', '4349685d-bba2-4603-9b21-5188c54ef47b', 'ORDER048', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-31612', '4b831fd3-3241-4c4e-b5a3-ae3dac94d20b', 'c2d9a84e-e4d3-4bb9-899c-ffabdf7a8b55', 'c83af5f4-9301-44ae-bb66-32b8c8f61e2e', 'a22875f2-fa6b-4b56-a3c8-2300c05ef37a', 'transfer', 'pending', false, true, 4220, 6733, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_49', 'a3796502-4034-4292-8868-35bceda4f311', 'ORDER049', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-84812', 'e5e7b595-04e1-4f31-a215-d9b857e7e76e', 'f5faae0c-e082-4f94-85f0-f88d45f7340e', NULL, 'c37b633a-f620-4142-8a7f-72f96c31c7fb', 'transfer', 'driver_assigned', false, false, 20910, 1379, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_50', '04ddf63b-c64f-417c-8643-f4ad17892d3f', 'ORDER050', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-38979', 'c52048ff-19a7-4272-8bd5-5fac5d7d8552', 'cb7fe9dd-5a69-438a-89a3-5cd82bcd09b2', '697c52a5-31d0-4864-acb7-683615d366ec', '91a7e3d2-d8f0-4ea0-9fcf-28a358847f16', 'pickup', 'completed', false, true, 32394, 5752, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_51', '0cf827bb-f35a-40af-a8d1-d55f285c975d', 'ORDER051', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-22073', '2abe2e5f-4ec2-4eee-9fc8-893c52316f7a', 'b58e6548-253e-4c25-82a9-7296c297292d', '4228b2c3-0267-4e76-b3a3-def30ae82a22', '91a7e3d2-d8f0-4ea0-9fcf-28a358847f16', 'pickup', 'canceled', false, false, 16190, 5736, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_52', '7a1bbe26-50f0-4ea6-8b31-92ced60e5690', 'ORDER052', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-62377', '5433a755-02a7-484f-8b93-609346466277', 'ab6f45a9-e641-4a37-862a-d2a97bdd9ee6', '950c612b-3775-4102-b1c5-d529e6e76349', 'ca7b2f65-1ac5-45bd-9055-7f896fbf9549', 'pickup', 'completed', false, false, 15486, 4596, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_53', '9f3612fa-1fd2-4423-a472-2dbb2246011c', 'ORDER053', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-77350', 'b4724d93-8134-4b4e-843f-d2a8a5aa3969', '413fe588-11fb-454e-b448-30d433cd5442', '6ec285e6-d62b-464e-a059-777707e38ca8', '653320cb-850c-4bd5-8490-5f5e56401005', 'transfer', 'dispatched', false, true, 33058, 3426, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_54', 'b004eccd-ef89-4afe-b689-ca029dd7432e', 'ORDER054', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-68955', '8132bd2e-5dc2-4117-9881-c0f4889f80fc', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', '16823146-eee1-46af-a809-15767c3c2486', NULL, 'freight', 'dispatched', false, true, 40615, 1617, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_55', 'cc5f606c-1283-479d-ae00-d022d204f439', 'ORDER055', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-31947', 'eff05495-c722-4e98-9d8f-51230bfd03ea', 'd55b002c-26bb-42d0-bf34-e60a9818867e', '5b29752f-098a-4fc4-859a-26505711fbb6', NULL, 'pickup', 'pending', false, false, 11423, 6776, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_56', '8f649b3a-177a-4740-848b-e54cd00eda1d', 'ORDER056', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-67501', 'c046280b-50df-42ba-865e-a3dccd3d7299', 'f5e8470a-9809-489e-9a71-fd5560ec57cb', '1b0c14af-edcf-4ead-b768-83e35989eb0d', 'ab0b935e-2c93-4381-9098-10d9c1cd6279', 'freight', 'driver_assigned', false, true, 39006, 1738, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_57', '70172224-3645-4646-b095-c55172d720d2', 'ORDER057', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-41414', '71c1cbe5-d94d-4653-9276-71b475b36453', '0f29b004-4409-45db-97c6-ae0c1b3be16b', '8a053a76-b603-4ff8-8887-7fb4e38356d3', 'a3d8d96e-e956-4279-80b8-843110743acc', 'transfer', 'driver_assigned', true, false, 19229, 4729, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_58', '8401fb08-5825-4180-9fbc-cb20ce62d441', 'ORDER058', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-83316', '5c722d2c-51cb-4674-936f-ddf2d7f1251e', 'd6135ea4-b842-4131-a5aa-c3c8e88b90f6', '504d43ae-540b-4a73-89b7-bc011244556d', 'a3d8d96e-e956-4279-80b8-843110743acc', 'pickup', 'enroute', false, false, 15649, 6775, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_59', 'fc6ec9f8-0355-4162-99e3-5b2ac5028536', 'ORDER059', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-28288', 'ab5a325c-0d57-48fb-b57f-4e633ad6b7bc', '3cb604b8-604f-4f68-abc0-99d20e38e2a4', NULL, NULL, 'delivery', 'dispatched', true, true, 3619, 1447, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_60', '1923a936-6d89-40b5-857c-b72498e3a9fd', 'ORDER060', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-38736', '2decab24-8c36-410e-a44e-acb1346e72d4', '5178d19d-406f-4cb0-b35e-3349a8622e8f', 'd4067654-8d8a-48e3-9719-1d73de6f4baa', '9ad8a4cc-edf4-4a5f-9b6f-dd8a511246b3', 'pickup', 'driver_assigned', false, false, 15633, 5333, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_61', 'e0a56898-3adf-4032-8603-f2f4bea59bbf', 'ORDER061', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-49360', 'b2870504-3cd8-469c-8fa0-e731f6d4a66b', 'f2653e05-577e-4bad-8f6c-4d611b7ad2b0', NULL, 'c9211e62-d18a-46eb-8153-cd98e134b870', 'return', 'dispatched', true, false, 2483, 1199, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_62', '497e35f9-eccb-4839-b3b5-e0b4a705b4aa', 'ORDER062', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-51430', 'bb93fc28-44c9-41a3-9984-cf1f29cdd6bc', '1fc3794b-05a8-46f1-b7cc-47c5e1bc5588', NULL, 'ca7b2f65-1ac5-45bd-9055-7f896fbf9549', 'return', 'completed', false, true, 31581, 5174, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_63', 'd2e238be-17a9-47ff-9a4b-c76a63d913e9', 'ORDER063', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-59297', '785175e1-63c2-4128-b2c0-d1c2c526bdef', '8c0174d7-fd52-490b-ba2f-237af65b1337', 'a3b8b9da-3d60-4995-91de-c20da5ecc600', '0734df1e-28bd-48ab-906f-fa0206d316db', 'pickup', 'dispatched', false, false, 22612, 6575, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_64', '0f5061da-cfd9-4f55-bd06-75bbcf307743', 'ORDER064', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-51473', '6365b041-4047-41c2-8a24-f986083fb501', 'abaca1f4-6207-41f7-8010-7327a4c9f4e1', '65215931-7bbf-4c4c-8ec9-12af635bbf7f', 'a3313836-a6de-4182-b0fb-ee53b134dcec', 'pickup', 'driver_assigned', false, false, 14057, 4432, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_65', 'c7cfa7ab-ca2f-4540-a87c-d15c3f6c9d67', 'ORDER065', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-99406', 'a6e0f689-4e45-4932-85a7-46693dc1e4c6', 'a8e2a5a0-987a-4d83-98b8-30772e81342d', NULL, '9ad8a4cc-edf4-4a5f-9b6f-dd8a511246b3', 'pickup', 'dispatched', false, true, 48834, 2107, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_66', 'e0e85838-5fa9-46c6-8cec-b698f69ffacc', 'ORDER066', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-85971', '4772b81e-f598-4a7f-9665-3f2a6ee47eae', '6d6ef5e2-65b6-4ac0-8073-bf50e08d66f6', '387c111c-5c3c-4b8d-ad00-45457acacdd4', 'deea4f80-7fc9-4470-a7b7-be3f362a6b9b', 'return', 'canceled', false, true, 8881, 1115, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_67', '1ac92212-2077-4cdf-b897-f3eddab2633a', 'ORDER067', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-46532', '66b461a4-c487-43cb-aff5-3ec2c0bb7ff3', '01389971-4c76-49f2-9e05-a947a516f933', '4730e4c9-46b9-48bc-817f-3e8e31ed94cb', 'cdeb788e-7409-4239-9836-56bfdae71747', 'pickup', 'pending', false, false, 5658, 1599, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_68', '91c571fe-2dbb-486a-810a-ec5034b9706e', 'ORDER068', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-70062', '5e227f42-0c98-4a73-8157-a2d2f88ae5ac', '3d39df3a-5d57-4cae-aece-2399e5b63020', NULL, '91a7e3d2-d8f0-4ea0-9fcf-28a358847f16', 'return', 'canceled', false, false, 6169, 2296, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_69', '457aa77c-fd08-4add-8209-ccf44b812311', 'ORDER069', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-19521', '993a1f21-524f-4549-9e03-ce63f6951252', 'dfec63f8-e2ef-4fad-8311-50f4e7bde399', 'c83af5f4-9301-44ae-bb66-32b8c8f61e2e', NULL, 'transfer', 'enroute', true, true, 33426, 2745, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_70', '406c735c-6d4e-4b34-9f0d-0d97041ab410', 'ORDER070', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-19468', '43b1783a-5c1e-419e-845f-54fa305e4545', '593fe5b2-3ab6-4ad1-bbd9-7ef27335a043', 'b613c1e7-fcca-4ddc-a87c-026887281a8b', 'ca7b2f65-1ac5-45bd-9055-7f896fbf9549', 'freight', 'pending', false, true, 41814, 5749, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_71', '5e658a8d-a6ae-40f6-a9cb-ff6e4e69348e', 'ORDER071', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-16270', 'ba92d763-32e1-42c5-b56c-6c42a5b4c5cc', '0576ee4a-0f50-4097-857f-e2c67dc37e43', '90e7a4de-e453-45b2-97a4-d5caa26c25f8', '91a7e3d2-d8f0-4ea0-9fcf-28a358847f16', 'return', 'canceled', false, true, 40055, 3416, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_72', '8febf17a-6105-46ce-b6cc-5063abcbffa0', 'ORDER072', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-77725', '77e38942-1130-4f5a-89af-77cc77d433ac', 'cc322eff-714d-42dc-85c0-56012c8808d3', 'fbbeed09-de67-4270-bdce-a1d43a650f85', NULL, 'return', 'dispatched', true, true, 44402, 7184, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_73', '6e3a81fc-1045-4ca9-8700-6b7223d920e5', 'ORDER073', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-42735', '0f0a923d-0740-49f2-b74d-8ef39c5bfd58', '1d6ddde7-e577-4361-bbf1-5c20c2623b92', NULL, 'd13dfa1b-a091-4e4e-998e-6d214f6c23cb', 'pickup', 'dispatched', false, true, 22500, 7067, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_74', '01293e8c-a2c9-4c86-bdd2-b1be08455696', 'ORDER074', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-30616', '1cf8ebcc-1dc8-48be-9879-a46c89c195d9', '289d407c-4eca-4a38-b115-369be7a1557c', '14db45a6-c04b-49d7-ad51-ae75d11a934e', 'ca7b2f65-1ac5-45bd-9055-7f896fbf9549', 'freight', 'canceled', true, false, 30851, 4768, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_75', 'b64a7d97-e567-4947-a6fd-e4a9195bcc4e', 'ORDER075', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-47738', 'ddc40057-7bde-4e97-a78f-2bb77f0eab14', 'c855920d-802b-43da-9bc7-8ff4d75ffce8', '621bfdad-36e7-4f0b-9aeb-dd451849dc3d', 'a1e82599-001c-4f4b-82cc-e5510efb9b09', 'freight', 'canceled', false, false, 42766, 1295, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_76', 'cf0d0401-59b9-4cea-a304-bd3d816d12d9', 'ORDER076', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-59162', 'fcd024c9-7be0-4326-908c-5c5d9ca27006', '9eb5df03-24f2-43a0-a393-b52b53428e14', 'ed22ee37-28f4-4fe0-ac64-44e4e174e5c6', NULL, 'freight', 'enroute', false, true, 5701, 330, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_77', '01791cb6-7ede-4ea7-b6fb-63e9c04626ac', 'ORDER077', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-83603', '01f495f1-69a6-471d-955e-82cee5b97c52', '91b139e4-3ac6-4e38-9b79-b26627cac7dd', NULL, 'b84f1528-bde5-4f96-a55f-aa2648cfab4f', 'transfer', 'canceled', true, false, 14444, 1691, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_78', 'aed6ef95-c553-4918-8727-4094d2acaa75', 'ORDER078', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-70019', '2fb08b47-0cda-4925-81bd-f3c06db30f95', 'e33aaef7-5e0c-4aa3-84a0-f9b95f030443', '8a053a76-b603-4ff8-8887-7fb4e38356d3', 'ca3a3922-0030-49ab-a1a7-119801556931', 'return', 'dispatched', true, false, 26611, 6090, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_79', '54e803e5-48fd-4de5-bef9-c005dda43f96', 'ORDER079', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-97108', 'ae8ad85b-f51c-45c7-a04a-0a992342631b', '8ea7d389-b5df-41b6-bb33-07dfab52610f', NULL, '33195784-d3e3-47cf-9f86-4a99529dd611', 'transfer', 'dispatched', false, false, 29381, 5425, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_80', '9c89264a-4de3-49ad-b472-3517429efb65', 'ORDER080', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-22465', 'a710b0aa-3d58-4833-93a5-4506decd48dd', '4e4a4500-29ff-4089-a43f-167558f12e9e', NULL, '9d9897af-558c-4c9b-a3b2-dfa82d279258', 'transfer', 'completed', true, false, 43607, 1142, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_81', '580f7cf0-3e56-4e9f-bf0b-8c20f015d7a8', 'ORDER081', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-97998', '9c3092bf-9e4f-4919-a47a-2e587a2b6612', 'd00fbe89-70b9-4dd0-b080-92e40c992bbf', 'e9813b0b-0680-4d59-9d7f-7ad5ed690c91', '9ad8a4cc-edf4-4a5f-9b6f-dd8a511246b3', 'pickup', 'dispatched', false, false, 34598, 5528, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_82', '3f9e6f7d-1be6-4c7a-a82d-2846897587a4', 'ORDER082', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-45556', 'adb45209-7e80-4e00-84a6-e82df285586c', 'b5d0128b-488b-47cf-854a-ea33b830f9d7', NULL, '9ad8a4cc-edf4-4a5f-9b6f-dd8a511246b3', 'transfer', 'pending', true, true, 8415, 2023, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_83', '4d3d6f9e-8ded-4eda-833a-060600b4a822', 'ORDER083', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-51326', 'c0afff4c-6e2c-4dbb-a920-1c24d5ce4605', '66bfeae3-cb41-4652-b4f7-131cc990cacb', 'ae04ba30-c338-444d-a5ad-2349e39dc189', '2af74ca3-88be-46ca-813f-695b26a98d0a', 'freight', 'enroute', false, false, 5440, 2354, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_84', '02589882-d686-4cc4-89cc-9bf378451ad0', 'ORDER084', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-27027', 'f5f258f1-a0d0-4ec9-94fc-ff18affd67db', 'f061c057-a8a5-45df-95db-5a8195f0a0c7', '14db45a6-c04b-49d7-ad51-ae75d11a934e', '3329b323-8111-422d-ad9c-ff8033a6d7ed', 'delivery', 'dispatched', false, false, 25615, 3228, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_85', '6efb2ace-dcc6-4aad-8ff3-11c4d83fe0b4', 'ORDER085', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-96931', 'df855ce8-7132-405f-81bd-1b3bb521bf75', '4b5d6263-4bea-4ffe-8be5-98ed9a960727', NULL, NULL, 'delivery', 'canceled', true, false, 1750, 7029, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_86', '858c87de-f839-4b99-aec9-ac9729c342b8', 'ORDER086', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-21034', '1c483db1-b0f0-4610-bffb-552bce6a929f', 'b93e2e74-c7be-4186-a0c0-ff3410e31d49', '92d39d43-ecf4-4db5-8a6e-fd9d75c9af1d', 'd6942ca1-2c31-4820-ba16-c2a246435b6d', 'return', 'pending', true, false, 23759, 6283, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_87', '386b90e6-7e2b-47c1-9871-725e3f61c735', 'ORDER087', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-34464', '3d12244a-c99b-4b48-a8cf-0d543696fa0f', '9a208ee1-9ba3-472d-9c12-f258220facd3', '621bfdad-36e7-4f0b-9aeb-dd451849dc3d', 'a3313836-a6de-4182-b0fb-ee53b134dcec', 'pickup', 'enroute', false, true, 37042, 6728, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_88', '4cf12c5a-e080-4438-8345-3e8920bb5130', 'ORDER088', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-29888', 'e75505bd-9fe2-4928-abab-3526241c7ac6', 'c305ce1d-cb5d-414d-adac-5cd2fd7cde29', '6ff944e5-425c-4be5-954a-2be796586cf8', 'a1e82599-001c-4f4b-82cc-e5510efb9b09', 'freight', 'driver_assigned', false, true, 17014, 6550, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_89', '302b17a3-fa95-4f40-92e6-5d4ab15e64a0', 'ORDER089', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-66639', 'ad5644d9-5dc5-4ca4-ac02-69da029d3241', '8fa50595-26d6-4228-9205-545174aedb0c', 'c83af5f4-9301-44ae-bb66-32b8c8f61e2e', '25487c75-d6b1-4215-87ee-0053a01c6397', 'pickup', 'dispatched', false, true, 20124, 505, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_90', 'be8ee9ca-8100-45ce-9ad9-8c7241ace53f', 'ORDER090', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-45014', 'e6d08fc6-d966-4fcd-ba18-3b653066007f', 'e80b5643-73b1-427d-beeb-e36af746da56', NULL, 'ab54a2db-4938-4c76-89b1-c0eb5e43d4f7', 'transfer', 'dispatched', false, false, 39962, 2994, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_91', '7ebcc5f8-501e-437e-a40e-a33e4823bd7b', 'ORDER091', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-86987', 'be60c476-45cc-4bb4-8fe3-d281321836bf', 'a3cf4849-2713-4bb9-b448-4e4837b4af5d', '6d941154-4b46-432d-9e24-f1de269b532c', 'a1e82599-001c-4f4b-82cc-e5510efb9b09', 'transfer', 'completed', false, false, 13286, 599, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_92', '078d86b0-f424-416f-8bea-9a2ab33ec0dc', 'ORDER092', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-61225', 'b175286e-de08-43b0-b880-04c1d0149407', '979f103a-7b9d-4083-a42e-81d16ad57418', '4228b2c3-0267-4e76-b3a3-def30ae82a22', '0734df1e-28bd-48ab-906f-fa0206d316db', 'delivery', 'canceled', false, true, 22910, 2661, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_93', 'aaf1becd-f2f4-482f-bc60-ed44d2462595', 'ORDER093', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-36203', '7d0506cb-875d-470a-b820-00ae57061b5f', '343cff16-5b38-40b0-8340-63974b7fcb3a', '56b01889-ef06-45a6-a7cb-dcfb14600ef1', NULL, 'delivery', 'completed', true, false, 35775, 5499, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_94', '33228abc-0f40-4ad2-b8a3-d6902e445609', 'ORDER094', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-91686', 'ca566db6-d111-42ba-894d-5f9f3474dd5e', '7f422f08-6559-4f13-8853-0168fabe9e53', 'ae04ba30-c338-444d-a5ad-2349e39dc189', '665cc78f-ebfa-454a-9c20-df64a516aa23', 'transfer', 'enroute', true, false, 3653, 3923, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_95', 'adcd5d62-91ce-4ba5-ac62-4e5e5a02c343', 'ORDER095', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-81720', '96715eb5-2e3d-4afe-af3e-cbefdfd9cacb', '8c60d8e3-53a8-4a2e-8404-22499ed8cf7b', '105f897f-4160-411f-a730-f004b2e2b6e4', 'c37b633a-f620-4142-8a7f-72f96c31c7fb', 'pickup', 'canceled', true, true, 26644, 6462, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_96', '250802c7-c6d2-4dba-a308-7a19ff0fcaff', 'ORDER096', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-31829', 'df92c1ed-cae9-4cfa-82d8-39acb46eea63', '17b983c6-e449-45dc-a9ea-7f4fe8e4b29f', 'f3e1a540-3f44-4b2f-80c9-b893a627c1dd', NULL, 'transfer', 'dispatched', true, false, 49193, 1175, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_97', '6fb178a4-2929-4253-8277-8235c2452ce1', 'ORDER097', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-54649', '78e617a1-708f-4b4f-9c67-d1cf44cde54a', 'ed5baa14-2209-479c-9a9d-88882e6e4f0b', NULL, NULL, 'transfer', 'dispatched', true, true, 19417, 2828, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_98', '063d87f0-e919-4517-9dec-2fe6b87cb373', 'ORDER098', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ORD-57820', '83fa6855-22aa-415a-9f7b-a9729f2a5fcc', '489f1090-95eb-47bb-9e5a-598d19ed2713', NULL, NULL, 'return', 'canceled', true, true, 13097, 2448, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_99', 'f313ec54-d6b3-4046-b93b-6e950253db2e', 'ORDER099', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ORD-76646', '161d5c53-9a01-44af-93cf-0f68add1f7a7', '2d9c7416-22bb-414e-b5e5-32b0745cfc7f', '391c34e6-b519-4cb7-8592-b86ac664b8ec', '9436f497-4ab7-40f1-bf3c-7f4e1178bdec', 'return', 'pending', false, false, 17811, 4259, NOW(), NOW());

INSERT INTO orders (_key, uuid, public_id, company_uuid, internal_id, payload_uuid, tracking_number_uuid, driver_assigned_uuid, vehicle_assigned_uuid, type, status, dispatched, started, distance, time, created_at, updated_at) VALUES
('order_100', '868644b6-96c5-445e-9318-70610fb9c587', 'ORDER100', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ORD-71794', '4a50e7fa-7171-4ff5-9eba-38e3bcab41d3', '5d69b7a0-b7c0-4b59-82c6-f76a8aed2b2b', NULL, '9d9897af-558c-4c9b-a3b2-dfa82d279258', 'freight', 'pending', false, false, 14736, 6160, NOW(), NOW());

-- ========================================
-- 13. ESTADOS DE SEGUIMIENTO (Tracking Statuses)
-- ========================================
INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_1', '87c5f9d2-4631-4ed2-94b0-4265afc17df0', 'STATUS001', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'fc492f63-5e2c-4b67-b96f-b25d4d39dcec', 'Sevilla', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '6 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_2', 'd861496b-3ab8-4dd0-a1a1-5eccd9774f4e', 'STATUS002', '3bc9ef59-698b-4859-878a-ce336f2c022d', '7f422f08-6559-4f13-8853-0168fabe9e53', 'Valladolid', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '4 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_3', 'fb813d50-9cd4-46ee-a646-405957c97bf7', 'STATUS003', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'b58e6548-253e-4c25-82a9-7296c297292d', 'Málaga', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '21 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_4', 'db5646da-7260-45c8-8203-4e8fe558ea78', 'STATUS004', '3bc9ef59-698b-4859-878a-ce336f2c022d', '9a208ee1-9ba3-472d-9c12-f258220facd3', 'Córdoba', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '7 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_5', 'd29b7dd7-b8ce-4089-a60e-1229a54765e5', 'STATUS005', '3bc9ef59-698b-4859-878a-ce336f2c022d', '112d8f72-6552-467c-a69c-bd395dc93bdd', 'Palma', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '8 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_6', '23a30a02-6e25-4f14-9eac-4a3ced42b91d', 'STATUS006', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'fb3357e6-6045-4ca9-b726-2a01ffb8172c', 'Elche', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '0 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_7', '57398bb8-7607-44fd-9499-d159a6ebe10e', 'STATUS007', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', 'Las Palmas', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '16 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_8', 'b0d2f719-83ad-44b4-9b21-269de74c38fc', 'STATUS008', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'a3cf4849-2713-4bb9-b448-4e4837b4af5d', 'Vitoria', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '30 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_9', '5d07bf9c-ca52-4cdc-ad3b-dbe8a64b41ab', 'STATUS009', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '4cff679b-8e58-4d08-aaf2-3fb11c41f5fc', 'Málaga', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '5 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_10', 'c2e8a437-832c-47b0-9c95-2989a302b26d', 'STATUS010', '3bc9ef59-698b-4859-878a-ce336f2c022d', '91b139e4-3ac6-4e38-9b79-b26627cac7dd', 'Elche', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '6 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_11', 'd4448d58-1304-4a76-b6ef-aba051ccf5b6', 'STATUS011', '3bc9ef59-698b-4859-878a-ce336f2c022d', '58422cb3-7c78-4095-acb9-5352983e547a', 'Valencia', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '22 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_12', 'aaab15ac-67c1-4196-b1ce-3c17afd2cc65', 'STATUS012', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'd00fbe89-70b9-4dd0-b080-92e40c992bbf', 'Valencia', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '23 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_13', '749e668d-fd90-47fc-a26f-2721c099eb9f', 'STATUS013', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6d6ef5e2-65b6-4ac0-8073-bf50e08d66f6', 'Málaga', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '21 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_14', '4742baa3-f555-4ae4-8de3-7a13ff19e718', 'STATUS014', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '5d69b7a0-b7c0-4b59-82c6-f76a8aed2b2b', 'Las Palmas', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_15', '0a92e280-e732-4f46-b1ca-b86d84ad5efe', 'STATUS015', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8c0174d7-fd52-490b-ba2f-237af65b1337', 'Murcia', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '30 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_16', 'c8255bd5-68b5-40f8-afc8-41459c72ae06', 'STATUS016', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'f2653e05-577e-4bad-8f6c-4d611b7ad2b0', 'Málaga', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '11 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_17', '9f3727cd-cce6-42de-bde6-be1a06d68eac', 'STATUS017', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'd6135ea4-b842-4131-a5aa-c3c8e88b90f6', 'Gijón', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '22 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_18', '7cd9b8f6-4262-49e7-9084-a5190bd5821a', 'STATUS018', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6cf756c7-a9f7-4a89-a79f-af88c33f734e', 'Palma', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '4 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_19', 'f068a084-bd21-4f1d-a7f4-9dc5c03d2d34', 'STATUS019', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'f061c057-a8a5-45df-95db-5a8195f0a0c7', 'Elche', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '15 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_20', 'a0ff7665-ae11-4461-b022-832e82c4cef2', 'STATUS020', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ab6f45a9-e641-4a37-862a-d2a97bdd9ee6', 'Murcia', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '6 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_21', '0740044b-cfb2-4bc9-abd9-fb951215558d', 'STATUS021', '3bc9ef59-698b-4859-878a-ce336f2c022d', '235de295-8d1e-4e89-8998-ea99d8695c11', 'Elche', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '13 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_22', '68f5e58f-eb69-4789-a34f-33811827663f', 'STATUS022', '3bc9ef59-698b-4859-878a-ce336f2c022d', '9f3a8e27-102d-4090-99f2-31ad12f5431d', 'Málaga', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '6 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_23', '1de229e0-88bc-458e-9556-b3a1e7e3f97c', 'STATUS023', '3bc9ef59-698b-4859-878a-ce336f2c022d', '01389971-4c76-49f2-9e05-a947a516f933', 'Zaragoza', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '11 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_24', '124e4e0d-160d-4817-9f14-fd64dc415771', 'STATUS024', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', 'Vigo', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '27 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_25', '7bcedbf9-c9e6-4961-a139-af09216e84eb', 'STATUS025', '3bc9ef59-698b-4859-878a-ce336f2c022d', '979f103a-7b9d-4083-a42e-81d16ad57418', 'Barcelona', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '8 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_26', 'fe9f3714-6a16-413c-801f-63ba8bc3b298', 'STATUS026', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'eba25f8b-ca9c-474e-b477-a22b2cb03e99', 'Córdoba', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '19 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_27', 'f19d1b28-3857-416a-8385-85b764bdd2c7', 'STATUS027', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '8bc680d8-1ea4-4910-b773-f0d30eb46ceb', 'Elche', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '14 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_28', '44241bf7-148c-4570-8dfb-1a12e81edcfd', 'STATUS028', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8fa50595-26d6-4228-9205-545174aedb0c', 'Valladolid', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '19 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_29', 'ca5b560d-a870-429c-8432-544cbda9ea04', 'STATUS029', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '92b531d7-9349-4837-a2c0-5d173c89aea7', 'Córdoba', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '14 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_30', '47aec153-98a2-4676-b2ef-690c88f73c60', 'STATUS030', '3bc9ef59-698b-4859-878a-ce336f2c022d', '2d9c7416-22bb-414e-b5e5-32b0745cfc7f', 'Alicante', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '11 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_31', '2459ec15-db2e-4281-85eb-0ef5973861c6', 'STATUS031', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '235de295-8d1e-4e89-8998-ea99d8695c11', 'Alicante', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '7 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_32', '4db78a9a-8725-4039-915c-e18b652bba44', 'STATUS032', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e80b5643-73b1-427d-beeb-e36af746da56', 'Alicante', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '22 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_33', '8ec70bc3-f5f8-457b-aab4-ae438327d5e1', 'STATUS033', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'dfec63f8-e2ef-4fad-8311-50f4e7bde399', 'Gijón', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '9 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_34', '16aa4326-2a8e-4f5f-8242-1ac5d83a250a', 'STATUS034', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '33eee731-8046-4b53-a60b-8c07886dd347', 'Gijón', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '12 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_35', 'b5a3284f-bd2e-4144-bc0c-e2fb2e6d38aa', 'STATUS035', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ac4d31b4-5f7a-45c6-a954-64d6bd4f784d', 'Valladolid', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '12 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_36', 'ee1adb44-5be6-4afa-823a-bf4ade50809a', 'STATUS036', '3bc9ef59-698b-4859-878a-ce336f2c022d', '26467f8f-0386-4ee0-a112-19ce10fb4338', 'Córdoba', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '7 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_37', 'a560aac3-be93-463a-b511-b32d6e850fb8', 'STATUS037', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ac9059ac-70e0-42b2-bc49-848e820d67af', 'Córdoba', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_38', '2caf8925-bd95-4dfb-9a3b-dc5414bccdb5', 'STATUS038', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '9a09f766-1614-4d67-afac-778152cef96a', 'Córdoba', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '4 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_39', '6b2cfcb5-c447-4380-bf9d-442eeabb756b', 'STATUS039', '3bc9ef59-698b-4859-878a-ce336f2c022d', '6d6ef5e2-65b6-4ac0-8073-bf50e08d66f6', 'Vitoria', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '8 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_40', 'caaa41f8-db39-4729-8c82-f193efb6c3d6', 'STATUS040', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '47378033-5c10-4c46-beea-03cca7acb066', 'Murcia', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '29 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_41', '300eaa2f-5e9d-465c-8207-df78ee09c773', 'STATUS041', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8c0174d7-fd52-490b-ba2f-237af65b1337', 'Vitoria', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '9 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_42', '5610d06d-0d37-4958-89ca-7f2f75c24ae2', 'STATUS042', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ab6f45a9-e641-4a37-862a-d2a97bdd9ee6', 'Palma', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '27 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_43', '71127007-2a98-4dc7-ba64-f16e8357de62', 'STATUS043', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'dfec63f8-e2ef-4fad-8311-50f4e7bde399', 'Zaragoza', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '16 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_44', 'b6638cbb-b0f4-4f5a-9680-05f84fa59368', 'STATUS044', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '26467f8f-0386-4ee0-a112-19ce10fb4338', 'Alicante', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_45', '5e70a969-4036-4cde-a20b-48f59ceba43a', 'STATUS045', '3bc9ef59-698b-4859-878a-ce336f2c022d', '9a208ee1-9ba3-472d-9c12-f258220facd3', 'Bilbao', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '9 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_46', '3e7b241e-2309-4ebc-8556-51183fd1e1a3', 'STATUS046', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '2d9c7416-22bb-414e-b5e5-32b0745cfc7f', 'Córdoba', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '27 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_47', '481e3fb7-d4d9-4121-974e-4c8e2f827494', 'STATUS047', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'af94f915-2ad8-4e83-a384-5318435712e2', 'Córdoba', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '10 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_48', 'd0cd9fcd-0f32-4748-b07a-810b0fa3cad0', 'STATUS048', '3bc9ef59-698b-4859-878a-ce336f2c022d', '0fbdc6a5-eb43-4b7a-bb0d-75d7f91a1045', 'Bilbao', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '2 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_49', '75b807a1-492f-4f17-b11f-019dd030ac02', 'STATUS049', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '8bc680d8-1ea4-4910-b773-f0d30eb46ceb', 'Vigo', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '11 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_50', '627ac07f-6bff-4b47-bee8-c0247b305258', 'STATUS050', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'b58e6548-253e-4c25-82a9-7296c297292d', 'Barcelona', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '1 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_51', '7d6590e3-be07-46a9-9d2f-2bbb898d492f', 'STATUS051', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '8fa50595-26d6-4228-9205-545174aedb0c', 'Sevilla', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '4 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_52', 'de733dc0-3b3e-4517-8483-cb885d28cf50', 'STATUS052', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'd6135ea4-b842-4131-a5aa-c3c8e88b90f6', 'Murcia', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '11 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_53', '968a86e3-192b-4335-8458-fc0c605b3c0b', 'STATUS053', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'e80b5643-73b1-427d-beeb-e36af746da56', 'Valladolid', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '0 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_54', '3db5c2a3-8bce-4610-9626-19dc1d0f63c8', 'STATUS054', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'c2d9a84e-e4d3-4bb9-899c-ffabdf7a8b55', 'Granada', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '9 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_55', '80f5c8b2-5f1b-4fc9-81eb-cc0ee088d658', 'STATUS055', '3bc9ef59-698b-4859-878a-ce336f2c022d', '0576ee4a-0f50-4097-857f-e2c67dc37e43', 'Murcia', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '18 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_56', '5d30465d-a5ca-40f4-ba71-6cc3af9cb1ea', 'STATUS056', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'cb7fe9dd-5a69-438a-89a3-5cd82bcd09b2', 'Córdoba', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '9 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_57', '6341ee58-ebcc-4d23-a100-fc675c683d4d', 'STATUS057', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'b93e2e74-c7be-4186-a0c0-ff3410e31d49', 'Murcia', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '1 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_58', 'f64f3bb4-9631-44ec-b10d-56e62c66f50e', 'STATUS058', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '9eb5df03-24f2-43a0-a393-b52b53428e14', 'Alicante', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '18 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_59', 'dcec06da-a6e5-4aa7-9d1f-94e1018ec286', 'STATUS059', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '9a11d561-8793-4b2d-9747-eb649798d39a', 'Elche', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '5 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_60', '0e6319c4-43fc-46e7-a388-7bee5fcc87b1', 'STATUS060', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ca6ce417-23a8-48e8-b641-aa2074337c6a', 'Barcelona', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '22 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_61', 'a6959e9b-238b-4d15-9c1b-b167ae1d5ea7', 'STATUS061', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5d8940f5-0b40-4a8f-918e-b2838114bdcf', 'A Coruña', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '16 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_62', '348cb676-a6a6-446a-86ff-e5d6b9dfc900', 'STATUS062', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '9a208ee1-9ba3-472d-9c12-f258220facd3', 'Elche', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '16 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_63', '8acfb56c-5819-4ab5-a61b-9391e9a9718f', 'STATUS063', '3bc9ef59-698b-4859-878a-ce336f2c022d', '771e076b-2ce3-46c0-a842-6f66fc16ca3f', 'Bilbao', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '30 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_64', '6546ad5b-5d3c-415b-a8e5-f0bb619d8005', 'STATUS064', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'abaca1f4-6207-41f7-8010-7327a4c9f4e1', 'Elche', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '7 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_65', '0252d407-0b50-4af9-b1da-0a87170e1b04', 'STATUS065', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '1fc3794b-05a8-46f1-b7cc-47c5e1bc5588', 'Sevilla', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '21 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_66', '670534ba-160e-4e41-8d95-8fbc292a7099', 'STATUS066', '3bc9ef59-698b-4859-878a-ce336f2c022d', '8c60d8e3-53a8-4a2e-8404-22499ed8cf7b', 'Córdoba', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_67', 'dd3b4acf-25b4-4105-9a0c-2bab678ae20f', 'STATUS067', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '18eda3b6-4355-4ca7-9912-9a4385e6b1a3', 'Hospitalet', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '0 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_68', 'd1dabf78-bd2f-40f2-a70b-51bf2aa2abc9', 'STATUS068', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'd6135ea4-b842-4131-a5aa-c3c8e88b90f6', 'Bilbao', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '17 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_69', '528e373f-f287-482b-8a35-65d28e801fcb', 'STATUS069', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'b5d0128b-488b-47cf-854a-ea33b830f9d7', 'Hospitalet', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '23 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_70', '598731ef-9763-4d4f-87b1-5e11ea278e19', 'STATUS070', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '92b531d7-9349-4837-a2c0-5d173c89aea7', 'Vitoria', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '12 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_71', '126d9990-751a-44ee-b251-338b9c5b3f31', 'STATUS071', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'abaca1f4-6207-41f7-8010-7327a4c9f4e1', 'Alicante', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '17 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_72', '47328c45-6e52-4056-a3f7-9b6e31aecbc3', 'STATUS072', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '7975205e-1831-4cc1-9e6c-ebff80db893d', 'Córdoba', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_73', 'd7750f9c-ef6a-4a94-b257-7f07f11b86c8', 'STATUS073', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5d69b7a0-b7c0-4b59-82c6-f76a8aed2b2b', 'Granada', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '5 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_74', 'e0aaaa00-6ef2-4466-a7a1-eeedc32dfd7a', 'STATUS074', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', 'Hospitalet', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '29 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_75', 'fa1681c0-db9a-4040-a044-2e649c32005e', 'STATUS075', '3bc9ef59-698b-4859-878a-ce336f2c022d', '9f3a8e27-102d-4090-99f2-31ad12f5431d', 'Bilbao', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '18 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_76', 'ae057c0e-dbbd-48c7-91a4-a30b151f0721', 'STATUS076', '3bc9ef59-698b-4859-878a-ce336f2c022d', '33eee731-8046-4b53-a60b-8c07886dd347', 'Las Palmas', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '18 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_77', '46d75d16-e690-4bee-8627-85fbe2576b91', 'STATUS077', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '3d5dd5e0-52e8-4eda-a56b-9bacace8a6bd', 'Hospitalet', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '10 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_78', '249905c8-467d-4362-9019-296753ecf56c', 'STATUS078', '3bc9ef59-698b-4859-878a-ce336f2c022d', '3cb604b8-604f-4f68-abc0-99d20e38e2a4', 'Bilbao', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '5 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_79', 'db9bbaad-cbfe-4f74-bdd8-00adb153cc81', 'STATUS079', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '413fe588-11fb-454e-b448-30d433cd5442', 'Sevilla', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '17 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_80', '1edaf249-f7a3-42eb-8531-e77d3435b598', 'STATUS080', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '829c6647-f926-4cc3-b695-35cbfa822468', 'Bilbao', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '24 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_81', 'cdc6a12b-44a9-43c2-8b4e-67290c68290f', 'STATUS081', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '829c6647-f926-4cc3-b695-35cbfa822468', 'Madrid', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '22 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_82', '2b3d130c-2d8e-4afd-b7ca-7891c133c732', 'STATUS082', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '3d5dd5e0-52e8-4eda-a56b-9bacace8a6bd', 'Valladolid', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '20 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_83', '0af7ff24-a315-4db0-9ca2-2553067717d1', 'STATUS083', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '4cff679b-8e58-4d08-aaf2-3fb11c41f5fc', 'A Coruña', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '29 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_84', '3f1d47cd-78b8-4808-9176-7b469753a436', 'STATUS084', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '4b5d6263-4bea-4ffe-8be5-98ed9a960727', 'Madrid', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '17 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_85', '46871c85-ec74-4261-9420-f296b9c45362', 'STATUS085', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'c2d9a84e-e4d3-4bb9-899c-ffabdf7a8b55', 'Elche', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '16 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_86', '5e254695-1b89-4c4d-bf76-3ed74f6dd79d', 'STATUS086', '3bc9ef59-698b-4859-878a-ce336f2c022d', '4f260c73-f7ca-4ec3-be02-69272a302fbc', 'Madrid', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '15 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_87', '184be5f7-5cac-4a25-b89f-a534ccd3ecc9', 'STATUS087', '3bc9ef59-698b-4859-878a-ce336f2c022d', '112d8f72-6552-467c-a69c-bd395dc93bdd', 'Barcelona', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_88', 'f81a6cb1-edff-46a2-875c-b1b9391a67e7', 'STATUS088', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'c2d9a84e-e4d3-4bb9-899c-ffabdf7a8b55', 'Madrid', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '27 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_89', '0b874820-692d-4fe8-8987-8f454b56221a', 'STATUS089', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5178d19d-406f-4cb0-b35e-3349a8622e8f', 'A Coruña', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '23 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_90', 'ddfba29e-02bb-4722-b673-0b9bafd65b2b', 'STATUS090', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '20bb0599-e636-433d-ad9d-c810d223eaef', 'Elche', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '18 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_91', 'cadd7c10-b60a-40a4-98ca-11789ca99a50', 'STATUS091', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '235de295-8d1e-4e89-8998-ea99d8695c11', 'Alicante', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '14 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_92', '4db4d8c1-1f6a-4d7d-8e2b-eecdd0692f1c', 'STATUS092', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '3cb604b8-604f-4f68-abc0-99d20e38e2a4', 'Vitoria', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '21 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_93', '0c91f2f7-138e-4d7c-89b3-17638e35e527', 'STATUS093', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8602befd-beaf-4254-bd6b-65732c52dd04', 'Madrid', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '4 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_94', 'ac5818a9-802c-48ca-ae93-e2ac1bdb7dd1', 'STATUS094', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', 'Bilbao', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '8 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_95', '9f39bca7-79d3-406b-ae5b-eddfb87af1d2', 'STATUS095', '3bc9ef59-698b-4859-878a-ce336f2c022d', '4b5d6263-4bea-4ffe-8be5-98ed9a960727', 'Vigo', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '5 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_96', '200da816-1088-499d-a65f-40bffd93df58', 'STATUS096', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '47378033-5c10-4c46-beea-03cca7acb066', 'A Coruña', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '13 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_97', '37c6377c-fbca-41fd-a049-ac6db068a111', 'STATUS097', '3bc9ef59-698b-4859-878a-ce336f2c022d', '8ea7d389-b5df-41b6-bb33-07dfab52610f', 'Valencia', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_98', '051cdd35-dedc-4a29-b26c-080cd8d1c18c', 'STATUS098', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'a3dd079f-8c27-43ac-ba70-c744211f6a72', 'Bilbao', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '5 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_99', '2094b6d1-e251-4cbb-b08a-d2ee2a85661e', 'STATUS099', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'abaca1f4-6207-41f7-8010-7327a4c9f4e1', 'Hospitalet', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '8 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_100', '3ea14b61-31fc-4ced-8c0d-9d63dba448f5', 'STATUS100', '3bc9ef59-698b-4859-878a-ce336f2c022d', '3d5dd5e0-52e8-4eda-a56b-9bacace8a6bd', 'Elche', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '5 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_101', 'a1a42fd0-579c-4cd1-8564-07aa3bde7b29', 'STATUS101', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '343cff16-5b38-40b0-8340-63974b7fcb3a', 'Hospitalet', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '27 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_102', '72d7c283-5756-4558-81cb-0f4f156bd71f', 'STATUS102', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '19a79810-8a9d-46c8-aa92-ae7af1d52149', 'Bilbao', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '27 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_103', '9197e5a7-ee8a-40b1-974a-9211da01dd99', 'STATUS103', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '8ea7d389-b5df-41b6-bb33-07dfab52610f', 'Gijón', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '10 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_104', '40908096-defa-4938-8e5b-a21fe60c3e48', 'STATUS104', '3bc9ef59-698b-4859-878a-ce336f2c022d', '33eee731-8046-4b53-a60b-8c07886dd347', 'Elche', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '1 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_105', '1a3158ea-bf68-4d09-b4c8-5497e875f7e6', 'STATUS105', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8fa50595-26d6-4228-9205-545174aedb0c', 'Madrid', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '28 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_106', '87ae6748-ed9a-4351-918b-c80b00288c1e', 'STATUS106', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '1d6ddde7-e577-4361-bbf1-5c20c2623b92', 'Sevilla', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '0 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_107', '8a92613f-4b04-4144-8fe7-6018669f9f02', 'STATUS107', '3bc9ef59-698b-4859-878a-ce336f2c022d', '2d016db9-9d18-4a2a-9fd4-72c2426aa7ef', 'Valladolid', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '11 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_108', '6fa0464d-3ee5-49e2-aa59-9af61875ec49', 'STATUS108', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '33eee731-8046-4b53-a60b-8c07886dd347', 'Las Palmas', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '15 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_109', '6783641c-ea0e-451e-829c-01b6d287b684', 'STATUS109', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6d6ef5e2-65b6-4ac0-8073-bf50e08d66f6', 'Madrid', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '9 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_110', 'e3b8d31d-eace-4138-8830-a1ed42bfb86a', 'STATUS110', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '0576ee4a-0f50-4097-857f-e2c67dc37e43', 'Vigo', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '7 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_111', '7b099616-e424-4d2c-aab9-779985ecab41', 'STATUS111', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'fc492f63-5e2c-4b67-b96f-b25d4d39dcec', 'Madrid', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '29 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_112', '2879f418-058e-470e-91fd-6bfd51b3996f', 'STATUS112', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '26467f8f-0386-4ee0-a112-19ce10fb4338', 'Zaragoza', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '0 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_113', '1c185050-a39d-4d9a-8518-fa9bd71c9d64', 'STATUS113', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'cc322eff-714d-42dc-85c0-56012c8808d3', 'Barcelona', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '9 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_114', 'c80d3ab5-9a60-43df-a392-4e567d549686', 'STATUS114', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'af94f915-2ad8-4e83-a384-5318435712e2', 'Granada', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '13 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_115', '06d45d92-b2c8-4056-9b40-ef60e2b77c34', 'STATUS115', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'd55b002c-26bb-42d0-bf34-e60a9818867e', 'Málaga', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '8 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_116', '08b64637-1565-4e2d-8e62-5a1477987023', 'STATUS116', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'c3826d33-176f-4d39-b5fe-d07bbaf7a941', 'Las Palmas', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '24 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_117', '279045fa-8dab-470f-9bc6-f2d442ba9440', 'STATUS117', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e51be0fe-7027-4b64-b11a-0ff8e6e7866c', 'Palma', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_118', '8806e668-d6fa-4406-81a9-8cb17272adfc', 'STATUS118', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '289d407c-4eca-4a38-b115-369be7a1557c', 'Valencia', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '12 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_119', '5d600f46-6667-4644-84fb-d84ccfb2b511', 'STATUS119', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'fb3357e6-6045-4ca9-b726-2a01ffb8172c', 'Palma', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '3 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_120', 'd0ea98e0-6c2d-4850-bfc7-b35d3f1e8c90', 'STATUS120', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '20bb0599-e636-433d-ad9d-c810d223eaef', 'Valladolid', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '6 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_121', '2ada7821-bc3c-4c4f-aa90-39b79c692d5f', 'STATUS121', '3bc9ef59-698b-4859-878a-ce336f2c022d', '4e4a4500-29ff-4089-a43f-167558f12e9e', 'Zaragoza', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '1 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_122', '21e48434-834a-4ad2-b659-2a0bb4f8139a', 'STATUS122', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'd00fbe89-70b9-4dd0-b080-92e40c992bbf', 'Valencia', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '16 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_123', '30f7b2a4-dca7-4115-be70-3c913d2906a7', 'STATUS123', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5d69b7a0-b7c0-4b59-82c6-f76a8aed2b2b', 'Zaragoza', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '7 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_124', '2ffe4fbd-9435-4d0c-b860-e34a06126a0c', 'STATUS124', '3bc9ef59-698b-4859-878a-ce336f2c022d', '9a208ee1-9ba3-472d-9c12-f258220facd3', 'Bilbao', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '21 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_125', 'fc4052cd-a457-4515-8360-185f22b0f056', 'STATUS125', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '60bcf3c1-5b23-4754-8a3b-566976860ac2', 'Alicante', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_126', '73e4a7f5-7d21-4f6d-b938-3f9bd3a4328c', 'STATUS126', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', 'Elche', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '28 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_127', 'fe294180-ceb5-4e8e-9dea-2102e0a3d23d', 'STATUS127', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'c855920d-802b-43da-9bc7-8ff4d75ffce8', 'Córdoba', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '2 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_128', 'adaf0612-e3a3-46c4-965c-901fc4d6554a', 'STATUS128', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8c60d8e3-53a8-4a2e-8404-22499ed8cf7b', 'Barcelona', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '1 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_129', '5bb2582a-385e-4b3e-a7fc-eb385f02c3b4', 'STATUS129', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'fb3357e6-6045-4ca9-b726-2a01ffb8172c', 'Barcelona', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '6 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_130', 'cc318c47-aea9-4657-9d20-118b1ba42a72', 'STATUS130', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'f3757075-c81a-4170-9917-97945db7acf9', 'Granada', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '24 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_131', 'a297ae24-dcb2-4867-9a57-d5c2eca51b3b', 'STATUS131', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', 'Valladolid', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '29 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_132', '3f543a79-80db-4dc5-90c9-211deca9337c', 'STATUS132', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'c2d9a84e-e4d3-4bb9-899c-ffabdf7a8b55', 'Sevilla', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '16 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_133', '6833b1c1-fe6b-454a-8cce-03c647031270', 'STATUS133', '3bc9ef59-698b-4859-878a-ce336f2c022d', '979f103a-7b9d-4083-a42e-81d16ad57418', 'Madrid', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '17 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_134', '3fae5041-a8ee-4460-bc5c-0e23c6369ec9', 'STATUS134', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '112d8f72-6552-467c-a69c-bd395dc93bdd', 'Alicante', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '12 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_135', '2f77dc05-4eb8-4874-9bb4-e8520228e3b5', 'STATUS135', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'f2653e05-577e-4bad-8f6c-4d611b7ad2b0', 'Valladolid', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '23 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_136', '2f4d3df9-d660-48e8-bd78-d0a71c58d35f', 'STATUS136', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '8c60d8e3-53a8-4a2e-8404-22499ed8cf7b', 'Murcia', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_137', '3dbcbc6a-4551-4252-b413-790e237da154', 'STATUS137', '3bc9ef59-698b-4859-878a-ce336f2c022d', '0f29b004-4409-45db-97c6-ae0c1b3be16b', 'Palma', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '19 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_138', 'd0c3ec7e-c19c-494b-ae8d-a85cf7544dd7', 'STATUS138', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'dfec63f8-e2ef-4fad-8311-50f4e7bde399', 'Gijón', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '27 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_139', '76308717-b269-431a-8026-e501f84f0dd7', 'STATUS139', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'f2653e05-577e-4bad-8f6c-4d611b7ad2b0', 'Hospitalet', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '12 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_140', '3079d193-7636-49c6-82a7-1bb7d4ebb9ba', 'STATUS140', '3bc9ef59-698b-4859-878a-ce336f2c022d', '1dd16f95-060a-411c-9a5e-346544b9cbfb', 'Murcia', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '10 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_141', 'f6b7eaea-3f93-4bba-ab12-8381a6bdf844', 'STATUS141', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'dfec63f8-e2ef-4fad-8311-50f4e7bde399', 'A Coruña', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '22 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_142', '872ad830-812e-42d6-ade6-b8c0e2309f2e', 'STATUS142', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'fc492f63-5e2c-4b67-b96f-b25d4d39dcec', 'Córdoba', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '4 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_143', '83e21f9c-1bd3-4126-b18a-aaa0d6260dce', 'STATUS143', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'eba25f8b-ca9c-474e-b477-a22b2cb03e99', 'Elche', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '11 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_144', 'ba135aaf-5cb8-4501-ba51-3d14e3d00883', 'STATUS144', '3bc9ef59-698b-4859-878a-ce336f2c022d', '3d5dd5e0-52e8-4eda-a56b-9bacace8a6bd', 'Zaragoza', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '18 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_145', '11da76f9-9001-46c1-9c25-e885124532fd', 'STATUS145', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '20bb0599-e636-433d-ad9d-c810d223eaef', 'Elche', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '20 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_146', 'd922cfed-1048-4d95-b678-0216119629e2', 'STATUS146', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e51be0fe-7027-4b64-b11a-0ff8e6e7866c', 'Granada', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '7 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_147', '89bef3e5-bc14-4de7-bf5c-3c0d32526ca6', 'STATUS147', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '47378033-5c10-4c46-beea-03cca7acb066', 'Málaga', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '1 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_148', '1b21fa2e-a7fd-4aaa-98ce-fedf23b610f8', 'STATUS148', '3bc9ef59-698b-4859-878a-ce336f2c022d', '66bfeae3-cb41-4652-b4f7-131cc990cacb', 'Palma', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '22 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_149', '265a919d-b49e-4978-9b17-e3087d65b3d4', 'STATUS149', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '01389971-4c76-49f2-9e05-a947a516f933', 'Sevilla', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '10 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_150', '0c60ebec-0efd-4e4b-ba2a-06ee55b1daa4', 'STATUS150', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'd55b002c-26bb-42d0-bf34-e60a9818867e', 'Bilbao', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '21 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_151', '4a4680b2-6b8a-4a5d-aa3f-be5e28b094da', 'STATUS151', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'abaca1f4-6207-41f7-8010-7327a4c9f4e1', 'Granada', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '26 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_152', '726f812b-abfb-470b-aaf8-3583091e345a', 'STATUS152', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ac9059ac-70e0-42b2-bc49-848e820d67af', 'Málaga', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '14 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_153', 'f51d70e1-af1c-4568-968c-4902502d2f7a', 'STATUS153', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5d8940f5-0b40-4a8f-918e-b2838114bdcf', 'Córdoba', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '21 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_154', '239405dc-58f8-451e-87b1-7bd7fff345dd', 'STATUS154', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ab6f45a9-e641-4a37-862a-d2a97bdd9ee6', 'Las Palmas', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '22 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_155', '3760c6ec-b154-4c9d-8cb5-f305cddef422', 'STATUS155', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '9eb5df03-24f2-43a0-a393-b52b53428e14', 'Gijón', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '3 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_156', '8e5842ca-67f7-42f4-acfc-69cede2d1bd3', 'STATUS156', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '0fbdc6a5-eb43-4b7a-bb0d-75d7f91a1045', 'Madrid', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '28 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_157', 'b026ce36-0ace-4f49-bd9c-613ce47202bf', 'STATUS157', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'f3757075-c81a-4170-9917-97945db7acf9', 'Palma', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '27 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_158', 'e815b8e7-cbbd-4ab1-8d17-78c5a331c8a6', 'STATUS158', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'af94f915-2ad8-4e83-a384-5318435712e2', 'Zaragoza', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '30 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_159', '6974d17d-c8b3-46aa-8e2b-7677dc1eedec', 'STATUS159', '3bc9ef59-698b-4859-878a-ce336f2c022d', '2d9c7416-22bb-414e-b5e5-32b0745cfc7f', 'Sevilla', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '18 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_160', '96ddc3fd-6b17-40e3-afc8-8af0914b63e8', 'STATUS160', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'b58e6548-253e-4c25-82a9-7296c297292d', 'Valencia', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '24 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_161', '6d4e546d-da6e-4e8d-842f-52f9c1264d7d', 'STATUS161', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '17b983c6-e449-45dc-a9ea-7f4fe8e4b29f', 'Córdoba', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '14 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_162', '1335a15d-1e1f-4458-b20d-223cfbf7a7c9', 'STATUS162', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '1fc3794b-05a8-46f1-b7cc-47c5e1bc5588', 'Vitoria', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '13 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_163', '39ed4a1f-39e8-46cd-82c4-6c245c2bc27b', 'STATUS163', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '18eda3b6-4355-4ca7-9912-9a4385e6b1a3', 'A Coruña', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '2 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_164', '6fbcdac8-b07e-4507-b36f-44f97fda71ac', 'STATUS164', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', 'Hospitalet', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '14 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_165', '062171d5-d93d-45b6-9fbb-d156b7394d06', 'STATUS165', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'cc322eff-714d-42dc-85c0-56012c8808d3', 'Gijón', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_166', 'b85203c6-1362-4a68-93f4-a0f76a0a6cf9', 'STATUS166', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'd6135ea4-b842-4131-a5aa-c3c8e88b90f6', 'Gijón', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '4 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_167', 'ca0489a9-c2d3-4fe7-9715-75d5953e771c', 'STATUS167', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'cb7fe9dd-5a69-438a-89a3-5cd82bcd09b2', 'Alicante', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '1 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_168', 'eefb634b-945b-4314-8a58-699184bdcc55', 'STATUS168', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'd00fbe89-70b9-4dd0-b080-92e40c992bbf', 'Elche', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '1 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_169', '2df19fb7-0d00-44a8-883f-6b7b600df701', 'STATUS169', '3bc9ef59-698b-4859-878a-ce336f2c022d', '58422cb3-7c78-4095-acb9-5352983e547a', 'Elche', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '10 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_170', '3ecbd754-2df0-4018-8ac6-753a2e9a31e4', 'STATUS170', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'f3757075-c81a-4170-9917-97945db7acf9', 'Barcelona', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '12 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_171', 'efa78075-02c3-4d9d-a096-ffddac5f8a33', 'STATUS171', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '9a09f766-1614-4d67-afac-778152cef96a', 'Alicante', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '12 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_172', 'aa0973de-a6ff-4b26-98bb-ae4d5aeedc41', 'STATUS172', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ca6ce417-23a8-48e8-b641-aa2074337c6a', 'Barcelona', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '11 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_173', '6a1073d7-ad8e-4c51-8915-e1684aed9d2e', 'STATUS173', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '3d5dd5e0-52e8-4eda-a56b-9bacace8a6bd', 'Alicante', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '29 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_174', 'f236120c-7be2-46b3-9571-0f8801f07420', 'STATUS174', '3bc9ef59-698b-4859-878a-ce336f2c022d', '8bc680d8-1ea4-4910-b773-f0d30eb46ceb', 'Granada', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_175', '47d486c8-f77b-42de-8e14-99271a3ea419', 'STATUS175', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '8602befd-beaf-4254-bd6b-65732c52dd04', 'Córdoba', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '0 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_176', '58377b43-386d-449e-b07f-614092eff972', 'STATUS176', '3bc9ef59-698b-4859-878a-ce336f2c022d', '2d99b2b6-4344-4b3b-9799-e4d3c68e24ad', 'Barcelona', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '13 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_177', 'e9421286-eaec-4b66-8243-552ce1f6bfee', 'STATUS177', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'cc322eff-714d-42dc-85c0-56012c8808d3', 'Valladolid', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '27 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_178', 'f9ada479-4893-4001-a081-d8de97566b4c', 'STATUS178', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'fc492f63-5e2c-4b67-b96f-b25d4d39dcec', 'Valladolid', 'En ruta', 'Actualización automática del sistema', NOW() - INTERVAL '21 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_179', '32fa47c0-d976-433c-aa68-5351417a3cb1', 'STATUS179', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'f3757075-c81a-4170-9917-97945db7acf9', 'Málaga', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '18 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_180', 'a6f65a42-ed8e-4dce-8212-271803dac018', 'STATUS180', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ac4d31b4-5f7a-45c6-a954-64d6bd4f784d', 'Murcia', 'En reparto', 'Actualización automática del sistema', NOW() - INTERVAL '12 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_181', 'c0b12596-8c4c-4306-95d9-5beaded257e3', 'STATUS181', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'd00fbe89-70b9-4dd0-b080-92e40c992bbf', 'Barcelona', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '23 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_182', '933f1cc0-06ba-46e5-b378-5e895bf6ef4d', 'STATUS182', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '0576ee4a-0f50-4097-857f-e2c67dc37e43', 'Murcia', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '16 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_183', 'fc321e8c-80f7-4115-8c0f-e873d5e5ec00', 'STATUS183', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '4b5d6263-4bea-4ffe-8be5-98ed9a960727', 'Gijón', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '7 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_184', 'a77ef401-bb4c-46b0-8897-e35bba95a542', 'STATUS184', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e33aaef7-5e0c-4aa3-84a0-f9b95f030443', 'A Coruña', 'En centro de distribución', 'Actualización automática del sistema', NOW() - INTERVAL '27 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_185', '7320e4ef-cb78-4cc1-8a6e-fe90f6f32f69', 'STATUS185', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'f3757075-c81a-4170-9917-97945db7acf9', 'Gijón', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '18 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_186', 'baee664c-e4fe-45ab-883f-4aa93f4303bb', 'STATUS186', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', 'Barcelona', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '11 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_187', '13971b14-2b82-47dc-8df0-d8c73c913ad3', 'STATUS187', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'eba25f8b-ca9c-474e-b477-a22b2cb03e99', 'Elche', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '12 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_188', '6c1970de-e07b-4047-8b60-922d80b04faf', 'STATUS188', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '1dd16f95-060a-411c-9a5e-346544b9cbfb', 'Gijón', 'Pedido recibido', 'Actualización automática del sistema', NOW() - INTERVAL '22 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_189', '58c6bfa7-b8a1-4a8c-93f2-026faa36082d', 'STATUS189', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'fc492f63-5e2c-4b67-b96f-b25d4d39dcec', 'Hospitalet', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '10 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_190', '438422b5-c294-4511-b292-32603dfb0cd1', 'STATUS190', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'cb7fe9dd-5a69-438a-89a3-5cd82bcd09b2', 'Madrid', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '25 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_191', 'b71fdbca-2345-4105-a749-c76704074947', 'STATUS191', '3bc9ef59-698b-4859-878a-ce336f2c022d', '7f422f08-6559-4f13-8853-0168fabe9e53', 'Granada', 'Listo para envío', 'Actualización automática del sistema', NOW() - INTERVAL '26 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_192', 'a449ee64-6190-47fe-98dc-989df5902b37', 'STATUS192', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '829c6647-f926-4cc3-b695-35cbfa822468', 'Málaga', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '2 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_193', 'c289fa13-9102-403c-8b8a-a3a0c59d21ae', 'STATUS193', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'c2d9a84e-e4d3-4bb9-899c-ffabdf7a8b55', 'Alicante', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '18 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_194', '804bf7ea-48ef-4e21-a720-a083d360c5ef', 'STATUS194', '3bc9ef59-698b-4859-878a-ce336f2c022d', '343cff16-5b38-40b0-8340-63974b7fcb3a', 'Barcelona', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '8 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_195', '679e0acb-f02d-4a0f-b9fa-981f4b96ce9a', 'STATUS195', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '771e076b-2ce3-46c0-a842-6f66fc16ca3f', 'Valencia', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '19 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_196', 'c06e1201-279f-486b-ad41-a33ebc55bb63', 'STATUS196', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '2d016db9-9d18-4a2a-9fd4-72c2426aa7ef', 'Valencia', 'Reagendado', 'Actualización automática del sistema', NOW() - INTERVAL '18 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_197', 'fa715274-abb8-4bdb-81cd-bb51178ece41', 'STATUS197', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '4f260c73-f7ca-4ec3-be02-69272a302fbc', 'Vitoria', 'Recogido', 'Actualización automática del sistema', NOW() - INTERVAL '29 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_198', 'c8cfdcdb-c3ac-4074-830e-c1b7756adff9', 'STATUS198', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'fc492f63-5e2c-4b67-b96f-b25d4d39dcec', 'Valladolid', 'En preparación', 'Actualización automática del sistema', NOW() - INTERVAL '17 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_199', 'b93459fb-f3aa-4523-90e3-c59533cfc487', 'STATUS199', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'e33aaef7-5e0c-4aa3-84a0-f9b95f030443', 'Elche', 'Entregado', 'Actualización automática del sistema', NOW() - INTERVAL '0 days', NOW());

INSERT INTO tracking_statuses (_key, uuid, public_id, company_uuid, tracking_number_uuid, city, status, details, created_at, updated_at) VALUES
('tracking_status_200', '115c7050-2bb1-40b4-9db2-c7bb48959b0c', 'STATUS200', '3bc9ef59-698b-4859-878a-ce336f2c022d', '9a11d561-8793-4b2d-9747-eb649798d39a', 'Las Palmas', 'Intentado - Cliente ausente', 'Actualización automática del sistema', NOW() - INTERVAL '10 days', NOW());

-- ========================================
-- 14. WAYPOINTS (Puntos de Ruta)
-- ========================================
INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_1', 'b4d8f4aa-b226-45fa-9fd3-72a45b5c9882', 'WP001', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'd7a66ccf-0ac0-4070-ad67-2618c70f7b90', '1ef23503-e07b-4c07-a2ac-a8129917a53c', '9eb5df03-24f2-43a0-a393-b52b53428e14', 'waypoint', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_2', 'd5fd6d0f-2ebf-4bff-aecc-6f5eb0dddba6', 'WP002', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '59d02c09-a36d-48b1-bea2-34b028fdc0fb', '39b57b40-def2-4ab7-bd2d-a9237a3e7046', 'b68b77ee-da97-455f-806f-74d339a319d4', 'dropoff', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_3', '62c65b16-e172-4bd2-9c22-4a32009bd533', 'WP003', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'be9c8675-eae0-488b-9c5d-66fe2eb01452', 'ab3f3701-849e-4aa2-8645-12a12fe38aed', '413fe588-11fb-454e-b448-30d433cd5442', 'dropoff', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_4', 'd6681942-620e-4f18-91fc-4ca4667a077a', 'WP004', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', '01f495f1-69a6-471d-955e-82cee5b97c52', 'c305ce1d-cb5d-414d-adac-5cd2fd7cde29', 'waypoint', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_5', 'bbb437f3-c2e8-4ceb-a24b-4739e978d834', 'WP005', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'fc71b2a8-6f9e-4a8d-b1f8-7f19ebeb0d3b', 'b175286e-de08-43b0-b880-04c1d0149407', '343cff16-5b38-40b0-8340-63974b7fcb3a', 'pickup', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_6', '1a063507-f844-46e7-a9d7-fe11cb3cc6a4', 'WP006', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', '672a75b3-d482-4187-8318-3980f8a175c0', 'a8e2a5a0-987a-4d83-98b8-30772e81342d', 'pickup', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_7', 'ad8ed6fa-9c00-4298-9652-f42194deb9b1', 'WP007', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '4c30105a-5f1a-4959-be07-94480a3d68d7', '672a75b3-d482-4187-8318-3980f8a175c0', 'b58e6548-253e-4c25-82a9-7296c297292d', 'dropoff', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_8', 'd580a840-8b32-4684-adc9-82c04d5a4cf1', 'WP008', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '823171c3-335c-438a-9e67-2d6a4c1e9571', '9c3092bf-9e4f-4919-a47a-2e587a2b6612', '66bfeae3-cb41-4652-b4f7-131cc990cacb', 'waypoint', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_9', 'af107230-ad8f-4536-bc5a-9262ff19f300', 'WP009', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', '96715eb5-2e3d-4afe-af3e-cbefdfd9cacb', '9a11d561-8793-4b2d-9747-eb649798d39a', 'dropoff', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_10', '8144f4b9-5e81-4492-8da0-1139e1a90124', 'WP010', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', 'c046280b-50df-42ba-865e-a3dccd3d7299', '829c6647-f926-4cc3-b695-35cbfa822468', 'waypoint', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_11', 'b8a4a599-40f3-465b-bada-e32dffb9655b', 'WP011', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'dd53bf5a-50be-41c1-ab4c-176641358247', '341c27c0-81a3-4afc-a393-77797d8dcd2b', '5d69b7a0-b7c0-4b59-82c6-f76a8aed2b2b', 'waypoint', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_12', '42af8a42-a870-4028-bee8-043d832600b8', 'WP012', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '011f19e3-f1bb-4ae9-bd41-c101da82fa1d', '13f2b61a-f6b7-4e1d-bd7b-d370aa5766fc', '5d69b7a0-b7c0-4b59-82c6-f76a8aed2b2b', 'waypoint', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_13', '19e444ea-b124-4705-b29d-1e89d11d35e7', 'WP013', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'aed9db3a-3526-42b9-adfc-0e7c0c56c69b', 'ad5644d9-5dc5-4ca4-ac02-69da029d3241', '289d407c-4eca-4a38-b115-369be7a1557c', 'waypoint', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_14', '8689a27d-554b-4bb4-b7cc-dacb84a36f8f', 'WP014', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'c3b928d8-da55-4b7a-b299-d04beb2f74ef', '0f0a923d-0740-49f2-b74d-8ef39c5bfd58', '1d6ddde7-e577-4361-bbf1-5c20c2623b92', 'pickup', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_15', '11252fe1-082d-4ba4-a723-02ffc0427a94', 'WP015', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '674c8ba3-0b11-4497-b77d-239226fcb94c', '7d0506cb-875d-470a-b820-00ae57061b5f', '6d6ef5e2-65b6-4ac0-8073-bf50e08d66f6', 'waypoint', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_16', '79777a7c-cd27-437d-a96c-5b0903eebc21', 'WP016', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'fc71b2a8-6f9e-4a8d-b1f8-7f19ebeb0d3b', '5045c61f-18dc-4db8-a77c-ff7afbccc70b', '66bfeae3-cb41-4652-b4f7-131cc990cacb', 'waypoint', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_17', '9a791070-5587-488b-bf00-f5e6509a21ba', 'WP017', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', '4772b81e-f598-4a7f-9665-3f2a6ee47eae', '0be2a059-0fc0-4e97-93b2-735b31f22ebb', 'pickup', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_18', 'bf8f6f4f-a0a4-4cee-96cc-dec89ece3895', 'WP018', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', 'df92c1ed-cae9-4cfa-82d8-39acb46eea63', 'ed5baa14-2209-479c-9a9d-88882e6e4f0b', 'dropoff', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_19', 'd0c88058-404b-4bdc-b776-4dc18c5d9f13', 'WP019', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', '964f631a-5440-468e-b67c-a145a3af41e6', '26467f8f-0386-4ee0-a112-19ce10fb4338', 'dropoff', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_20', '3ac140ce-0dae-4491-b38a-00b00768ec02', 'WP020', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', '01f495f1-69a6-471d-955e-82cee5b97c52', 'd55b002c-26bb-42d0-bf34-e60a9818867e', 'pickup', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_21', '77d37002-8107-447b-8604-a8d9b7ab1114', 'WP021', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '00bc721a-d79a-4223-8ea7-19c2d1772684', 'df54cd81-373d-449c-a326-c3cba0b392c1', '17b983c6-e449-45dc-a9ea-7f4fe8e4b29f', 'dropoff', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_22', '74b4caa4-5e40-4b03-892a-347b7888bf80', 'WP022', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ef674ca0-a652-4081-997b-afa4125b0362', '6cca4960-2c74-4a50-b953-e0492f46e8fe', '8c0174d7-fd52-490b-ba2f-237af65b1337', 'pickup', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_23', '228abf43-b5a8-491e-8b24-89d825b8db64', 'WP023', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'd7a66ccf-0ac0-4070-ad67-2618c70f7b90', 'ab3f3701-849e-4aa2-8645-12a12fe38aed', '8ea7d389-b5df-41b6-bb33-07dfab52610f', 'dropoff', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_24', '1e0a30b9-e9ea-44ef-99a3-d7449186c6b0', 'WP024', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '636b48df-57ee-41fe-beb0-dae75d9eef0b', '2abe2e5f-4ec2-4eee-9fc8-893c52316f7a', 'd2303a10-ff0b-4319-b17d-d0a71a8d6568', 'dropoff', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_25', '24084dae-34b7-48f5-8a10-1d6f75e10d8a', 'WP025', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '011f19e3-f1bb-4ae9-bd41-c101da82fa1d', 'ab3f3701-849e-4aa2-8645-12a12fe38aed', '01389971-4c76-49f2-9e05-a947a516f933', 'waypoint', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_26', 'b7e38d09-13e4-4e7c-bf7f-d7ed51b11465', 'WP026', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5247e6eb-fab2-4d9d-b975-31b50d00b670', '38b92cc6-0837-4b62-8a4c-d4e39db3cccb', 'ac4d31b4-5f7a-45c6-a954-64d6bd4f784d', 'waypoint', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_27', '192678ce-432c-4fee-95e7-c4ea4b7848a6', 'WP027', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '674c8ba3-0b11-4497-b77d-239226fcb94c', '9d4006a9-a037-4a69-aca6-cbdebdf5828b', 'af94f915-2ad8-4e83-a384-5318435712e2', 'pickup', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_28', '37936c0f-fcfb-45e5-9621-bb2b36af10bd', 'WP028', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '00bc721a-d79a-4223-8ea7-19c2d1772684', 'eff05495-c722-4e98-9d8f-51230bfd03ea', '0576ee4a-0f50-4097-857f-e2c67dc37e43', 'pickup', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_29', '7260ac1e-79ec-4c9b-a699-d93e70f423ce', 'WP029', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '901d53fc-35d8-40e4-b286-0775962a71cf', 'dee13063-f937-419e-bf61-25753e390b2c', 'd00fbe89-70b9-4dd0-b080-92e40c992bbf', 'waypoint', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_30', 'be9addc5-983f-479d-b311-17d2c01d6790', 'WP030', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '00bc721a-d79a-4223-8ea7-19c2d1772684', 'b4724d93-8134-4b4e-843f-d2a8a5aa3969', '7975205e-1831-4cc1-9e6c-ebff80db893d', 'dropoff', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_31', '5e69c609-317c-4da2-a9dd-bb0ae37abd86', 'WP031', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '3389c354-331f-4372-9030-d2bbaf7a3de9', '66b461a4-c487-43cb-aff5-3ec2c0bb7ff3', 'f5e8470a-9809-489e-9a71-fd5560ec57cb', 'dropoff', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_32', '127f4659-8451-456f-9da1-f8ed5c2b6124', 'WP032', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', 'ca566db6-d111-42ba-894d-5f9f3474dd5e', 'f3757075-c81a-4170-9917-97945db7acf9', 'waypoint', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_33', 'd5961dd2-aaa2-4448-b085-11063242e981', 'WP033', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', 'e6abbf0c-bf16-40b3-a23e-4fbd4359de89', 'ed5baa14-2209-479c-9a9d-88882e6e4f0b', 'dropoff', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_34', 'c02e8817-fdd3-4457-bf02-c0306adc6ea9', 'WP034', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'aed9db3a-3526-42b9-adfc-0e7c0c56c69b', '341c27c0-81a3-4afc-a393-77797d8dcd2b', 'c305ce1d-cb5d-414d-adac-5cd2fd7cde29', 'dropoff', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_35', 'c8720979-8fc5-4884-a532-a6cf17c20ebe', 'WP035', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ef674ca0-a652-4081-997b-afa4125b0362', 'c046280b-50df-42ba-865e-a3dccd3d7299', '47378033-5c10-4c46-beea-03cca7acb066', 'dropoff', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_36', 'bb25b400-84da-474a-8659-289e9b3ca60d', 'WP036', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'c3b928d8-da55-4b7a-b299-d04beb2f74ef', '220c9bdd-3f69-45eb-b33f-e25c67488b4c', 'c855920d-802b-43da-9bc7-8ff4d75ffce8', 'waypoint', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_37', 'ebc2af33-eecc-4ba1-b01c-739db6ab2596', 'WP037', '3bc9ef59-698b-4859-878a-ce336f2c022d', '72d0e1d7-063c-4f05-b105-f83026137da4', 'fb5bd06d-94d8-42f0-8a80-803a39157f50', 'c38002a4-793f-4407-88ca-315f063f8498', 'dropoff', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_38', 'e367880f-2a42-4831-af44-2873800f310d', 'WP038', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', '14fa0b8c-c37d-4fb2-9e66-ce014db85145', '8fa50595-26d6-4228-9205-545174aedb0c', 'pickup', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_39', 'c2a9b098-eced-4f10-8828-26cafb83e27e', 'WP039', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'aed9db3a-3526-42b9-adfc-0e7c0c56c69b', '7af055ce-f51e-4860-88df-656ae7ab5c79', 'e03fe0dd-26b8-4315-a638-411161b80d33', 'dropoff', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_40', '1f462c94-1206-4284-9692-bd46cdfe5538', 'WP040', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '43b00464-b32e-4c51-8389-e85b85083333', 'e75505bd-9fe2-4928-abab-3526241c7ac6', 'f5e8470a-9809-489e-9a71-fd5560ec57cb', 'waypoint', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_41', 'f62094a7-a1f8-4b73-9727-9a6686f40473', 'WP041', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '804a5b86-7693-4109-804f-1c973c00d5b5', 'ae8ad85b-f51c-45c7-a04a-0a992342631b', '6cf756c7-a9f7-4a89-a79f-af88c33f734e', 'dropoff', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_42', '1c0f20a1-74b4-47e2-ab11-26ae92b408db', 'WP042', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', '71c1cbe5-d94d-4653-9276-71b475b36453', 'c2d9a84e-e4d3-4bb9-899c-ffabdf7a8b55', 'dropoff', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_43', '0714825d-4b7a-4f87-b9b8-a9626c43ac12', 'WP043', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ef674ca0-a652-4081-997b-afa4125b0362', '9d4006a9-a037-4a69-aca6-cbdebdf5828b', '489f1090-95eb-47bb-9e5a-598d19ed2713', 'pickup', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_44', 'b3f63343-5558-432f-9304-ae3c5e775077', 'WP044', '3bc9ef59-698b-4859-878a-ce336f2c022d', '011f19e3-f1bb-4ae9-bd41-c101da82fa1d', '5e227f42-0c98-4a73-8157-a2d2f88ae5ac', '2d99b2b6-4344-4b3b-9799-e4d3c68e24ad', 'dropoff', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_45', '8f485fa6-808c-4018-a45e-b516ec8ca923', 'WP045', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'dd53bf5a-50be-41c1-ab4c-176641358247', '71c1cbe5-d94d-4653-9276-71b475b36453', 'c38002a4-793f-4407-88ca-315f063f8498', 'pickup', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_46', '534ebbe4-4655-417d-a3e1-3905042223c6', 'WP046', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'ef674ca0-a652-4081-997b-afa4125b0362', '6cca4960-2c74-4a50-b953-e0492f46e8fe', '6d6ef5e2-65b6-4ac0-8073-bf50e08d66f6', 'pickup', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_47', 'c0c9ea8a-d3ea-4370-b3da-10935ff2206b', 'WP047', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'd55d5300-ad11-41f3-a7ef-0bf4b022fc36', '1cf8ebcc-1dc8-48be-9879-a46c89c195d9', '0f29b004-4409-45db-97c6-ae0c1b3be16b', 'waypoint', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_48', 'dca404c5-da4d-480a-a37d-e05e10cfff0a', 'WP048', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '674c8ba3-0b11-4497-b77d-239226fcb94c', 'e6d08fc6-d966-4fcd-ba18-3b653066007f', '17b983c6-e449-45dc-a9ea-7f4fe8e4b29f', 'pickup', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_49', 'e99c2cd4-6720-46c0-9534-153eee94b4b6', 'WP049', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '3389c354-331f-4372-9030-d2bbaf7a3de9', 'c0afff4c-6e2c-4dbb-a920-1c24d5ce4605', 'af94f915-2ad8-4e83-a384-5318435712e2', 'waypoint', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_50', '50e460b4-c226-4272-938c-54c1ba9b9c1a', 'WP050', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8c153eab-552a-4986-b1bb-d781b92dc91a', 'ab3f3701-849e-4aa2-8645-12a12fe38aed', '0fbdc6a5-eb43-4b7a-bb0d-75d7f91a1045', 'pickup', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_51', '054982a2-4880-414e-8fa9-90a6a96d94b4', 'WP051', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'a3945835-3668-4d98-ba7d-fe95e38980b8', '1cf8ebcc-1dc8-48be-9879-a46c89c195d9', 'cb7fe9dd-5a69-438a-89a3-5cd82bcd09b2', 'dropoff', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_52', 'b2b4b1fb-2514-4b87-b3e9-ea3f5772d67f', 'WP052', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'a1a01c17-edd5-4745-a829-ecfbe82160f0', '7af055ce-f51e-4860-88df-656ae7ab5c79', '6d6ef5e2-65b6-4ac0-8073-bf50e08d66f6', 'pickup', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_53', '383d79d3-fc30-493b-9dae-c0657d464367', 'WP053', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5247e6eb-fab2-4d9d-b975-31b50d00b670', 'e75505bd-9fe2-4928-abab-3526241c7ac6', '289d407c-4eca-4a38-b115-369be7a1557c', 'pickup', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_54', '5040fceb-e36a-4458-b3ae-8283046db6ca', 'WP054', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '33d445a1-6944-4107-b316-23c3580ae4f0', '66b461a4-c487-43cb-aff5-3ec2c0bb7ff3', '6340818d-4cba-48fd-a8d0-0f865d3fa59a', 'pickup', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_55', 'dd4272c7-d4ef-4721-a42e-08f11762942a', 'WP055', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'dd53bf5a-50be-41c1-ab4c-176641358247', 'a6e0f689-4e45-4932-85a7-46693dc1e4c6', '8fa50595-26d6-4228-9205-545174aedb0c', 'dropoff', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_56', 'bf0df011-8be7-4eb8-9fd9-0503fed1b532', 'WP056', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'aed9db3a-3526-42b9-adfc-0e7c0c56c69b', '9d4006a9-a037-4a69-aca6-cbdebdf5828b', 'c305ce1d-cb5d-414d-adac-5cd2fd7cde29', 'waypoint', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_57', 'd7f14856-9bb4-4aa0-9d05-923489438889', 'WP057', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'be60c476-45cc-4bb4-8fe3-d281321836bf', 'f5e8470a-9809-489e-9a71-fd5560ec57cb', 'pickup', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_58', '2d2003ea-6780-4ee0-8a36-5788acae9964', 'WP058', '3bc9ef59-698b-4859-878a-ce336f2c022d', '4984261e-b398-4bc3-9a45-3b6e9872c854', 'adb45209-7e80-4e00-84a6-e82df285586c', '6cf756c7-a9f7-4a89-a79f-af88c33f734e', 'waypoint', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_59', 'c1ed4eaa-c5f6-4f3d-85ce-252a970295ac', 'WP059', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '674c8ba3-0b11-4497-b77d-239226fcb94c', '0f82bfad-8373-4455-a9ad-ea9740bfa411', 'e80b5643-73b1-427d-beeb-e36af746da56', 'waypoint', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_60', '8a0f98d1-a040-4a7a-bb4a-16d77707b188', 'WP060', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'e643c9f6-827a-4793-b7ca-a71b7e99a49a', '19a79810-8a9d-46c8-aa92-ae7af1d52149', 'waypoint', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_61', 'c971fec7-f3ec-4d48-bddd-9d55f378c062', 'WP061', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '33d445a1-6944-4107-b316-23c3580ae4f0', 'ba92d763-32e1-42c5-b56c-6c42a5b4c5cc', '3d5dd5e0-52e8-4eda-a56b-9bacace8a6bd', 'waypoint', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_62', '201b8820-9094-4c04-9b33-e50b7e78727b', 'WP062', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '901d53fc-35d8-40e4-b286-0775962a71cf', 'fcd024c9-7be0-4326-908c-5c5d9ca27006', 'ab6f45a9-e641-4a37-862a-d2a97bdd9ee6', 'waypoint', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_63', '89f45216-bb8c-4f2f-a92d-e3fa6322f2e1', 'WP063', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '0d083d50-9054-41ab-a96f-1821f3d45d0d', 'be60c476-45cc-4bb4-8fe3-d281321836bf', 'b58e6548-253e-4c25-82a9-7296c297292d', 'dropoff', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_64', '77361a62-95da-4e28-8adf-ae04fe13c678', 'WP064', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', '39b57b40-def2-4ab7-bd2d-a9237a3e7046', '0be2a059-0fc0-4e97-93b2-735b31f22ebb', 'dropoff', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_65', '3e9e13b7-c338-42f6-af13-bd3d8d546b2e', 'WP065', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', '5433a755-02a7-484f-8b93-609346466277', 'eba25f8b-ca9c-474e-b477-a22b2cb03e99', 'pickup', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_66', '2d80e76d-7738-4ac1-b32b-6d5524f9de84', 'WP066', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '693836f9-4dd4-4947-982f-5bd1dcaf717d', 'ddc40057-7bde-4e97-a78f-2bb77f0eab14', '8c0174d7-fd52-490b-ba2f-237af65b1337', 'dropoff', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_67', '735f0687-2da1-4cc9-8999-ab6415c4eecc', 'WP067', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', 'cb97d7db-a1f3-414e-b509-8712e7acfc36', '0be2a059-0fc0-4e97-93b2-735b31f22ebb', 'waypoint', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_68', '7d57d754-7791-4f17-a1fa-7b13771167af', 'WP068', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', '13f2b61a-f6b7-4e1d-bd7b-d370aa5766fc', '80343a0b-b67b-45c0-a060-1b2798b18624', 'dropoff', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_69', '6aacf52d-9ebb-4299-827e-71265693251e', 'WP069', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'a1a01c17-edd5-4745-a829-ecfbe82160f0', 'e9fcefae-2ed6-48a6-872f-1f8cec5db8c9', 'c3826d33-176f-4d39-b5fe-d07bbaf7a941', 'dropoff', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_70', '26554231-6d35-4cc5-9544-f2e97677d375', 'WP070', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '3389c354-331f-4372-9030-d2bbaf7a3de9', '42a795fa-e040-4e87-b56f-216ca347b5f5', 'c3826d33-176f-4d39-b5fe-d07bbaf7a941', 'waypoint', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_71', '259c516c-2135-4f0f-9622-f25e1c32bcb6', 'WP071', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', '1c483db1-b0f0-4610-bffb-552bce6a929f', 'f061c057-a8a5-45df-95db-5a8195f0a0c7', 'waypoint', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_72', '99ca596a-f092-4720-ba2e-81556ae15746', 'WP072', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '772d3990-e93c-43e7-adc2-c5caf440152b', 'c9b9eca4-03f5-4774-8b98-a2134e589c1b', 'b93e2e74-c7be-4186-a0c0-ff3410e31d49', 'dropoff', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_73', '840923da-f6e3-4322-bd47-8699e780e5f0', 'WP073', '3bc9ef59-698b-4859-878a-ce336f2c022d', '8c153eab-552a-4986-b1bb-d781b92dc91a', '3d12244a-c99b-4b48-a8cf-0d543696fa0f', '235de295-8d1e-4e89-8998-ea99d8695c11', 'dropoff', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_74', '896693c3-292b-4d45-9481-04913772ae08', 'WP074', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '011f19e3-f1bb-4ae9-bd41-c101da82fa1d', '7d0506cb-875d-470a-b820-00ae57061b5f', 'd6135ea4-b842-4131-a5aa-c3c8e88b90f6', 'waypoint', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_75', '742b9358-9ca2-4805-8a38-5674806938f2', 'WP075', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'fc71b2a8-6f9e-4a8d-b1f8-7f19ebeb0d3b', '6cca4960-2c74-4a50-b953-e0492f46e8fe', 'b68b77ee-da97-455f-806f-74d339a319d4', 'pickup', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_76', '00ed0a2f-598c-4e13-8a25-fd774e8ed787', 'WP076', '3bc9ef59-698b-4859-878a-ce336f2c022d', '693836f9-4dd4-4947-982f-5bd1dcaf717d', 'df92c1ed-cae9-4cfa-82d8-39acb46eea63', '413fe588-11fb-454e-b448-30d433cd5442', 'pickup', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_77', 'b234da61-3e51-4c44-a573-dd94310ea27e', 'WP077', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'dd53bf5a-50be-41c1-ab4c-176641358247', 'e9fcefae-2ed6-48a6-872f-1f8cec5db8c9', 'ca6ce417-23a8-48e8-b641-aa2074337c6a', 'dropoff', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_78', 'a93ec3fd-1d6e-4500-9bd8-b158f61ca14f', 'WP078', '3bc9ef59-698b-4859-878a-ce336f2c022d', '636b48df-57ee-41fe-beb0-dae75d9eef0b', '27d5e354-622d-444d-8403-b0e9c806f3a8', 'fb3357e6-6045-4ca9-b726-2a01ffb8172c', 'waypoint', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_79', '36c1cf6d-b36a-459e-8553-f5e6527bd45b', 'WP079', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', '1ef23503-e07b-4c07-a2ac-a8129917a53c', 'eba25f8b-ca9c-474e-b477-a22b2cb03e99', 'pickup', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_80', '3a0ae573-96c5-4fdc-ba0f-84e367620033', 'WP080', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', '0f0a923d-0740-49f2-b74d-8ef39c5bfd58', '829c6647-f926-4cc3-b695-35cbfa822468', 'waypoint', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_81', '5208f03b-f47a-4faf-96f7-141df3d09443', 'WP081', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'a7b85b3e-824b-48e9-bd7d-1a920e1ba507', 'e75505bd-9fe2-4928-abab-3526241c7ac6', '91b139e4-3ac6-4e38-9b79-b26627cac7dd', 'pickup', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_82', 'c259054b-fc4c-4cfc-a0db-6c10ce6fef65', 'WP082', '3bc9ef59-698b-4859-878a-ce336f2c022d', '804a5b86-7693-4109-804f-1c973c00d5b5', '2decab24-8c36-410e-a44e-acb1346e72d4', 'b5d0128b-488b-47cf-854a-ea33b830f9d7', 'dropoff', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_83', 'fcfef224-936c-450f-add2-968b3e8c0865', 'WP083', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'b4436923-fcde-47d8-aec3-e5b37c0b85b3', 'ea18e705-e1d0-4246-a05c-c24de2849560', 'a8e2a5a0-987a-4d83-98b8-30772e81342d', 'dropoff', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_84', 'd4a8c2a6-d4be-4d85-a379-c253e7cc0456', 'WP084', '3bc9ef59-698b-4859-878a-ce336f2c022d', '8086cfa9-a6f1-4d23-b3ac-b1df0c425953', '8959a0e3-c693-4bab-a5c1-3f36998dc41f', 'ab6f45a9-e641-4a37-862a-d2a97bdd9ee6', 'dropoff', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_85', '68ddd87e-dadc-4f76-a13f-154e12e1dc82', 'WP085', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', '5433a755-02a7-484f-8b93-609346466277', '3d39df3a-5d57-4cae-aece-2399e5b63020', 'waypoint', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_86', '94892e7f-fdbe-41d4-93b1-9aad2fec7efc', 'WP086', '3bc9ef59-698b-4859-878a-ce336f2c022d', '796eb698-e7f9-4337-87aa-45a5b5ae8e52', '5c722d2c-51cb-4674-936f-ddf2d7f1251e', '9eb5df03-24f2-43a0-a393-b52b53428e14', 'dropoff', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_87', 'b6a2fdd3-8c5a-4029-9868-6b8f5348bf4d', 'WP087', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'a1a01c17-edd5-4745-a829-ecfbe82160f0', '161d5c53-9a01-44af-93cf-0f68add1f7a7', '3d39df3a-5d57-4cae-aece-2399e5b63020', 'dropoff', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_88', '19d2341e-7677-47ed-8131-290767be9dea', 'WP088', '3bc9ef59-698b-4859-878a-ce336f2c022d', '5eea587f-5fdf-4e21-9493-189f21805f43', '13f2b61a-f6b7-4e1d-bd7b-d370aa5766fc', '3d39df3a-5d57-4cae-aece-2399e5b63020', 'waypoint', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_89', 'b8a65986-952f-4df3-9231-dc458b9eb13c', 'WP089', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '43b00464-b32e-4c51-8389-e85b85083333', '6186806a-b939-476d-9760-7931de34d428', '4cff679b-8e58-4d08-aaf2-3fb11c41f5fc', 'dropoff', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_90', 'bcca7d53-f5e1-4634-9bb6-2ee9580af7e9', 'WP090', '3bc9ef59-698b-4859-878a-ce336f2c022d', '00bc721a-d79a-4223-8ea7-19c2d1772684', 'b949c8ab-5388-4eda-be2f-1c4a21fc3c57', '5d8940f5-0b40-4a8f-918e-b2838114bdcf', 'waypoint', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_91', '713a89d7-dfa1-4aa0-b604-8db5bf6fa34e', 'WP091', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'be9c8675-eae0-488b-9c5d-66fe2eb01452', '1cf8ebcc-1dc8-48be-9879-a46c89c195d9', '8fa50595-26d6-4228-9205-545174aedb0c', 'dropoff', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_92', '5f0d263a-c844-4071-88a5-0b0f8e84769f', 'WP092', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '0d083d50-9054-41ab-a96f-1821f3d45d0d', '2fb08b47-0cda-4925-81bd-f3c06db30f95', 'b58e6548-253e-4c25-82a9-7296c297292d', 'waypoint', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_93', '6947c891-f788-4ea6-a66e-36063f0bc02f', 'WP093', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '4984261e-b398-4bc3-9a45-3b6e9872c854', '8132bd2e-5dc2-4117-9881-c0f4889f80fc', '60bcf3c1-5b23-4754-8a3b-566976860ac2', 'waypoint', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_94', '5f10e532-a9a7-4df0-9b21-412340b40f9e', 'WP094', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', '6cca4960-2c74-4a50-b953-e0492f46e8fe', '5d8940f5-0b40-4a8f-918e-b2838114bdcf', 'pickup', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_95', '29ccd2b6-b569-4052-b4ce-059c3343a91a', 'WP095', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '9ca611bf-b59a-4740-a88d-70b4a0a1c797', '220c9bdd-3f69-45eb-b33f-e25c67488b4c', '19a79810-8a9d-46c8-aa92-ae7af1d52149', 'dropoff', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_96', '945778f4-c557-4038-86ad-e115eea57428', 'WP096', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', 'e9fcefae-2ed6-48a6-872f-1f8cec5db8c9', 'b58e6548-253e-4c25-82a9-7296c297292d', 'pickup', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_97', '7c13d13d-f07a-46a3-8b8e-d0afdb1741ab', 'WP097', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', '74045a03-3bea-4bb9-8bd0-2eda13db27f5', '8c0174d7-fd52-490b-ba2f-237af65b1337', 'pickup', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_98', '7115f35a-b1f9-4c6a-aea4-1fff08a903f8', 'WP098', '3bc9ef59-698b-4859-878a-ce336f2c022d', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', '1cf8ebcc-1dc8-48be-9879-a46c89c195d9', 'e03fe0dd-26b8-4315-a638-411161b80d33', 'pickup', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_99', 'f80379c9-de9c-45e7-8e71-aae1cfef70a9', 'WP099', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', '7e788dfd-49a1-439a-9008-46687f01cdc2', '8bc680d8-1ea4-4910-b773-f0d30eb46ceb', 'dropoff', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_100', 'e5e67cd7-4af6-49b7-bf83-6e6e4a1e9c96', 'WP100', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'aed9db3a-3526-42b9-adfc-0e7c0c56c69b', '83fa6855-22aa-415a-9f7b-a9729f2a5fcc', '26467f8f-0386-4ee0-a112-19ce10fb4338', 'dropoff', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_101', '760940cf-d5ca-4882-825f-98266f6bd3d4', 'WP101', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '804a5b86-7693-4109-804f-1c973c00d5b5', 'ea18e705-e1d0-4246-a05c-c24de2849560', '9a11d561-8793-4b2d-9747-eb649798d39a', 'pickup', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_102', '1b465d0f-01d1-4565-9fba-1ba4e2d77a31', 'WP102', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '3efcc23e-8121-47aa-a9c7-801a3634c2aa', '4772b81e-f598-4a7f-9665-3f2a6ee47eae', '18eda3b6-4355-4ca7-9912-9a4385e6b1a3', 'waypoint', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_103', 'b8fcb9ce-19ee-41ad-ad06-35263e8f6679', 'WP103', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6abb8c4c-cc69-47f8-9000-6c250e679d08', 'b949c8ab-5388-4eda-be2f-1c4a21fc3c57', 'c2d9a84e-e4d3-4bb9-899c-ffabdf7a8b55', 'dropoff', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_104', 'af0982fa-f576-4573-90ba-6dfde7adad5a', 'WP104', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', '01f495f1-69a6-471d-955e-82cee5b97c52', '92b531d7-9349-4837-a2c0-5d173c89aea7', 'dropoff', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_105', '8c573e79-aae7-4dce-bd3d-36b5a2684157', 'WP105', '3bc9ef59-698b-4859-878a-ce336f2c022d', '0bac3346-ca40-4ade-ab39-82dca62f0876', '993a1f21-524f-4549-9e03-ce63f6951252', 'a3dd079f-8c27-43ac-ba70-c744211f6a72', 'pickup', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_106', '98d506a4-76ae-4c01-a2c2-19455d44eb3e', 'WP106', '3bc9ef59-698b-4859-878a-ce336f2c022d', '68475596-0480-46bc-b453-de5d5c10a298', '1ef23503-e07b-4c07-a2ac-a8129917a53c', 'ac9059ac-70e0-42b2-bc49-848e820d67af', 'dropoff', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_107', 'a963af93-79f3-4f7e-a24e-f43ea625f948', 'WP107', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'be9c8675-eae0-488b-9c5d-66fe2eb01452', 'cb97d7db-a1f3-414e-b509-8712e7acfc36', '8602befd-beaf-4254-bd6b-65732c52dd04', 'waypoint', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_108', 'b187bc1f-7c38-4a2e-b0b4-7a8f84e18360', 'WP108', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '796eb698-e7f9-4337-87aa-45a5b5ae8e52', 'a7f2d0d3-7f6f-49c8-a5cd-78833d444837', 'f061c057-a8a5-45df-95db-5a8195f0a0c7', 'waypoint', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_109', 'da9bc72c-7ddf-4f39-91fc-5963b9b82a0d', 'WP109', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'a1a01c17-edd5-4745-a829-ecfbe82160f0', '78b6f730-d868-49a2-b08f-66faa1bda5f0', 'e03fe0dd-26b8-4315-a638-411161b80d33', 'dropoff', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_110', '48402734-0d78-4285-91dd-3a86afe7ab12', 'WP110', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'ef674ca0-a652-4081-997b-afa4125b0362', '672a75b3-d482-4187-8318-3980f8a175c0', '0fbdc6a5-eb43-4b7a-bb0d-75d7f91a1045', 'dropoff', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_111', 'e97034cd-a9bf-42cc-b268-cab1c6f249a8', 'WP111', '3bc9ef59-698b-4859-878a-ce336f2c022d', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', 'f3703967-8963-4449-89f6-93e48f74531a', '5d69b7a0-b7c0-4b59-82c6-f76a8aed2b2b', 'waypoint', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_112', '7a328500-6d9a-417c-a346-70c3e83882ac', 'WP112', '3bc9ef59-698b-4859-878a-ce336f2c022d', '772d3990-e93c-43e7-adc2-c5caf440152b', '1ef23503-e07b-4c07-a2ac-a8129917a53c', '20bb0599-e636-433d-ad9d-c810d223eaef', 'waypoint', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_113', '8eb7778b-4e48-4d37-9b8e-c84d7c35a7d4', 'WP113', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '33d445a1-6944-4107-b316-23c3580ae4f0', 'a6e0f689-4e45-4932-85a7-46693dc1e4c6', 'd6135ea4-b842-4131-a5aa-c3c8e88b90f6', 'pickup', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_114', '62d49f35-3177-4d7f-b2aa-ba314822b31c', 'WP114', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', 'a7f2d0d3-7f6f-49c8-a5cd-78833d444837', '18eda3b6-4355-4ca7-9912-9a4385e6b1a3', 'waypoint', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_115', '346e9812-04e3-48a4-a4f3-be9c8b1a2183', 'WP115', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '674c8ba3-0b11-4497-b77d-239226fcb94c', '14fa0b8c-c37d-4fb2-9e66-ce014db85145', '9eb5df03-24f2-43a0-a393-b52b53428e14', 'pickup', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_116', '8d5991fa-0b00-41cd-883f-27b19d6078c7', 'WP116', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', 'df855ce8-7132-405f-81bd-1b3bb521bf75', '26467f8f-0386-4ee0-a112-19ce10fb4338', 'waypoint', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_117', '719a9c31-8002-4c54-82ff-7fa28adedfcf', 'WP117', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', 'ab3f3701-849e-4aa2-8645-12a12fe38aed', 'b58e6548-253e-4c25-82a9-7296c297292d', 'waypoint', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_118', 'c4a4d1f1-b211-4682-9227-b04e84e0d999', 'WP118', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', 'b949c8ab-5388-4eda-be2f-1c4a21fc3c57', '9f3a8e27-102d-4090-99f2-31ad12f5431d', 'waypoint', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_119', '4a3554ba-74ee-43b1-bf68-f578b8e9baa0', 'WP119', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '5247e6eb-fab2-4d9d-b975-31b50d00b670', '1ef23503-e07b-4c07-a2ac-a8129917a53c', '8bc680d8-1ea4-4910-b773-f0d30eb46ceb', 'waypoint', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_120', '083da360-ae5f-4d32-8e31-d6e84a179e56', 'WP120', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'be9c8675-eae0-488b-9c5d-66fe2eb01452', '39b57b40-def2-4ab7-bd2d-a9237a3e7046', 'a3cf4849-2713-4bb9-b448-4e4837b4af5d', 'pickup', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_121', 'e81021fe-cf94-4f97-9db5-dc258005fcfc', 'WP121', '3bc9ef59-698b-4859-878a-ce336f2c022d', '6abb8c4c-cc69-47f8-9000-6c250e679d08', 'fb7fe258-5eab-48b8-ba9c-83e80a983d9a', '235de295-8d1e-4e89-8998-ea99d8695c11', 'pickup', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_122', 'b15e6c52-1154-4ba6-86f8-aca3fe17a8b3', 'WP122', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'd106f6e0-8b92-4dec-9525-94b5ffbd092e', 'b2870504-3cd8-469c-8fa0-e731f6d4a66b', '66bfeae3-cb41-4652-b4f7-131cc990cacb', 'pickup', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_123', 'e70947e7-9481-4e7b-a315-ec4d3291b29e', 'WP123', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'ef674ca0-a652-4081-997b-afa4125b0362', '94998f67-38ab-40f2-941b-f9a8e9107553', 'f061c057-a8a5-45df-95db-5a8195f0a0c7', 'waypoint', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_124', 'a12c5302-8990-4e31-a39d-32be78c4dbfc', 'WP124', '3bc9ef59-698b-4859-878a-ce336f2c022d', '8be3c58d-c4a9-411f-b750-c8c0cfff3fd1', '4b460cb2-3aec-4142-b295-52c45ddff094', '8c60d8e3-53a8-4a2e-8404-22499ed8cf7b', 'pickup', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_125', 'c7759dd4-17a8-40f9-ae38-9f681af54500', 'WP125', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '0d083d50-9054-41ab-a96f-1821f3d45d0d', '0f82bfad-8373-4455-a9ad-ea9740bfa411', '3d5dd5e0-52e8-4eda-a56b-9bacace8a6bd', 'waypoint', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_126', '49b1b0a2-1336-4d24-9c41-d8753f9310d4', 'WP126', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '636b48df-57ee-41fe-beb0-dae75d9eef0b', 'e26678bd-549a-4717-8588-94edaa81baa3', 'd2303a10-ff0b-4319-b17d-d0a71a8d6568', 'waypoint', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_127', 'ee7f9b35-6611-4774-bcd2-45f3136958a1', 'WP127', '3bc9ef59-698b-4859-878a-ce336f2c022d', '0d083d50-9054-41ab-a96f-1821f3d45d0d', '161d5c53-9a01-44af-93cf-0f68add1f7a7', 'f061c057-a8a5-45df-95db-5a8195f0a0c7', 'pickup', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_128', 'd7a9b12e-016a-406b-9980-ba0defde5c27', 'WP128', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', '0196a29a-4e76-4921-870e-35a059bbbcf7', 'f5faae0c-e082-4f94-85f0-f88d45f7340e', 'pickup', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_129', 'b42e903b-029d-419b-b821-a2be4c7e22ce', 'WP129', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '901d53fc-35d8-40e4-b286-0775962a71cf', 'e643c9f6-827a-4793-b7ca-a71b7e99a49a', '2d016db9-9d18-4a2a-9fd4-72c2426aa7ef', 'dropoff', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_130', 'efb5dbfe-e3b8-472b-b872-7ed186827707', 'WP130', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5cdd7d9f-5718-477d-a3a7-73d04c90cc72', '01f495f1-69a6-471d-955e-82cee5b97c52', 'c3826d33-176f-4d39-b5fe-d07bbaf7a941', 'dropoff', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_131', '7300265d-7535-47dd-8ccb-2b1cc3b14640', 'WP131', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'b6e96b05-d7f7-4bfa-8c25-110d681da0ce', '78e617a1-708f-4b4f-9c67-d1cf44cde54a', '8bc680d8-1ea4-4910-b773-f0d30eb46ceb', 'dropoff', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_132', 'ef703999-edeb-4f1c-b3cd-ec57b5d8d40d', 'WP132', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '823171c3-335c-438a-9e67-2d6a4c1e9571', '14fa0b8c-c37d-4fb2-9e66-ce014db85145', 'f2653e05-577e-4bad-8f6c-4d611b7ad2b0', 'waypoint', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_133', '9781187e-77d1-4aae-a5e5-3489766bcdc5', 'WP133', '3bc9ef59-698b-4859-878a-ce336f2c022d', '33d445a1-6944-4107-b316-23c3580ae4f0', 'ab5a325c-0d57-48fb-b57f-4e633ad6b7bc', '8c0174d7-fd52-490b-ba2f-237af65b1337', 'waypoint', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_134', '9453ffa3-a374-4e2f-9386-d26f0228a267', 'WP134', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '6abb8c4c-cc69-47f8-9000-6c250e679d08', '27d5e354-622d-444d-8403-b0e9c806f3a8', 'c38002a4-793f-4407-88ca-315f063f8498', 'dropoff', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_135', 'c1ec4823-9293-431b-8f52-8c6a3177090a', 'WP135', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '4c30105a-5f1a-4959-be07-94480a3d68d7', '9d4006a9-a037-4a69-aca6-cbdebdf5828b', 'ab6f45a9-e641-4a37-862a-d2a97bdd9ee6', 'dropoff', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_136', 'fe27e26f-5e8d-478a-90b6-c128352946d4', 'WP136', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '823171c3-335c-438a-9e67-2d6a4c1e9571', 'ba92d763-32e1-42c5-b56c-6c42a5b4c5cc', 'd2303a10-ff0b-4319-b17d-d0a71a8d6568', 'waypoint', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_137', '052ee213-b0b9-4932-b3a7-fac3b62fc1f9', 'WP137', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'dce06fe6-6c7d-437a-b464-fd314190ad8a', 'adb45209-7e80-4e00-84a6-e82df285586c', '3d5dd5e0-52e8-4eda-a56b-9bacace8a6bd', 'pickup', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_138', 'c462f9d0-6bac-4cd6-99f1-1e101ac2dac8', 'WP138', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'c10ce2a7-f1cc-4689-b76e-5f5efde93e6b', 'b949c8ab-5388-4eda-be2f-1c4a21fc3c57', '1dd16f95-060a-411c-9a5e-346544b9cbfb', 'dropoff', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_139', 'df8cabe7-278d-4edc-8758-449aa1cd797e', 'WP139', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'b9e28d0d-cbaa-4492-b725-faddbe8c6b0f', '161d5c53-9a01-44af-93cf-0f68add1f7a7', '2d016db9-9d18-4a2a-9fd4-72c2426aa7ef', 'dropoff', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_140', 'd4c4be9d-f738-4b68-9a45-c33d507dd3d3', 'WP140', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '5247e6eb-fab2-4d9d-b975-31b50d00b670', 'be60c476-45cc-4bb4-8fe3-d281321836bf', '19a79810-8a9d-46c8-aa92-ae7af1d52149', 'pickup', 9, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_141', 'f2795d1b-abc1-48d7-95a5-5690d9c58275', 'WP141', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '636b48df-57ee-41fe-beb0-dae75d9eef0b', '8959a0e3-c693-4bab-a5c1-3f36998dc41f', '58422cb3-7c78-4095-acb9-5352983e547a', 'dropoff', 0, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_142', 'e9fe611e-8560-49f0-86f5-6eb87aba5b81', 'WP142', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'aed9db3a-3526-42b9-adfc-0e7c0c56c69b', '1c483db1-b0f0-4610-bffb-552bce6a929f', '17b983c6-e449-45dc-a9ea-7f4fe8e4b29f', 'waypoint', 1, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_143', '5dfa2c78-87b0-4188-abd1-c511a52ab038', 'WP143', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '8c153eab-552a-4986-b1bb-d781b92dc91a', '7b92d439-6d4c-4b46-86f0-1944cef23c65', 'a8e2a5a0-987a-4d83-98b8-30772e81342d', 'pickup', 2, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_144', 'bcfe67ae-823a-4dfa-9267-1a0b5f70be51', 'WP144', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '693836f9-4dd4-4947-982f-5bd1dcaf717d', '5b6cdf51-64f9-40c8-9cd5-312e514aac47', 'dfec63f8-e2ef-4fad-8311-50f4e7bde399', 'dropoff', 3, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_145', '5d93f54d-e8e6-4b32-8381-255792722824', 'WP145', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '772d3990-e93c-43e7-adc2-c5caf440152b', '5045c61f-18dc-4db8-a77c-ff7afbccc70b', 'ca6ce417-23a8-48e8-b641-aa2074337c6a', 'dropoff', 4, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_146', 'a2da63c8-af8c-4208-bc1d-27211a5654f0', 'WP146', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', '1cf8ebcc-1dc8-48be-9879-a46c89c195d9', 'fc492f63-5e2c-4b67-b96f-b25d4d39dcec', 'pickup', 5, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_147', '8d36ea73-36f9-4171-ae57-20afa4b2e80d', 'WP147', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'bed4f4bd-5300-4119-ac2a-2e9d1edc0b25', '1cf8ebcc-1dc8-48be-9879-a46c89c195d9', '1d6ddde7-e577-4361-bbf1-5c20c2623b92', 'waypoint', 6, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_148', '577f80c3-4118-4024-89e0-5a42f19d47c8', 'WP148', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '693836f9-4dd4-4947-982f-5bd1dcaf717d', '2abe2e5f-4ec2-4eee-9fc8-893c52316f7a', '1d6ddde7-e577-4361-bbf1-5c20c2623b92', 'waypoint', 7, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_149', 'c9b6ad41-ea1b-46a4-9ae8-8219f879b545', 'WP149', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '7a78c1f8-af0b-4585-93a4-73e6e86c99e7', 'c0afff4c-6e2c-4dbb-a920-1c24d5ce4605', 'ab6f45a9-e641-4a37-862a-d2a97bdd9ee6', 'dropoff', 8, NOW(), NOW());

INSERT INTO waypoints (_key, uuid, public_id, company_uuid, place_uuid, payload_uuid, tracking_number_uuid, type, "order", created_at, updated_at) VALUES
('waypoint_150', '93fc1cc6-08bf-4542-89c3-58c145a96635', 'WP150', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '0bac3346-ca40-4ade-ab39-82dca62f0876', 'e6abbf0c-bf16-40b3-a23e-4fbd4359de89', 'e80b5643-73b1-427d-beeb-e36af746da56', 'dropoff', 9, NOW(), NOW());


-- ========================================
-- 11. REPORTES DE COMBUSTIBLE (Fuel Reports) - AMPLIADO
-- ========================================
INSERT INTO fuel_reports (_key, uuid, public_id, company_uuid, driver_uuid, vehicle_uuid, reported_by_uuid, report, odometer, amount, currency, volume, metric_unit, status, created_at, updated_at) VALUES
('fuel_report_1', gen_random_uuid(), 'FR001', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '11b42d15-6a93-44fa-b6a0-47a0e9f69c36', '6c4bf4d1-6e30-44c9-b97a-8ec92c94dfe4', '11b42d15-6a93-44fa-b6a0-47a0e9f69c36', 'Repostaje completo en estación Shell Madrid Sur', '125430', '65.50', 'EUR', '45.0', 'liters', 'approved', NOW(), NOW()),
('fuel_report_2', gen_random_uuid(), 'FR002', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e2c1a5cf-27be-4b38-b5dc-6fc7f7a2e1c9', '8b2a3f1e-9c4d-4e6a-8f7b-1a2b3c4d5e6f', 'e2c1a5cf-27be-4b38-b5dc-6fc7f7a2e1c9', 'Carga de combustible Repsol Barcelona Norte', '98234', '72.30', 'EUR', '52.5', 'liters', 'approved', NOW(), NOW()),
('fuel_report_3', gen_random_uuid(), 'FR003', '3bc9ef59-698b-4859-878a-ce336f2c022d', '789c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '9c3b4e2f-0d5e-6a7b-8c9d-0e1f2a3b4c5d', '789c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'Repostaje Cepsa Valencia Centro', '76890', '58.90', 'EUR', '42.0', 'liters', 'approved', NOW(), NOW()),
('fuel_report_4', gen_random_uuid(), 'FR004', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Combustible diésel BP Sevilla Este', '102345', '81.20', 'EUR', '60.0', 'liters', 'approved', NOW(), NOW()),
('fuel_report_5', gen_random_uuid(), 'FR005', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'Repostaje gasolina Galp Málaga', '89567', '69.40', 'EUR', '48.5', 'liters', 'pending', NOW(), NOW());

-- Añadir más reportes de combustible (50 adicionales)
INSERT INTO fuel_reports (_key, uuid, public_id, company_uuid, driver_uuid, vehicle_uuid, reported_by_uuid, report, odometer, amount, currency, volume, metric_unit, status, created_at, updated_at) VALUES
('fuel_report_6', gen_random_uuid(), 'FR006', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '11b42d15-6a93-44fa-b6a0-47a0e9f69c36', '6c4bf4d1-6e30-44c9-b97a-8ec92c94dfe4', '11b42d15-6a93-44fa-b6a0-47a0e9f69c36', 'Repostaje Shell Bilbao Norte', '125890', '70.25', 'EUR', '50.0', 'liters', 'approved', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('fuel_report_7', gen_random_uuid(), 'FR007', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e2c1a5cf-27be-4b38-b5dc-6fc7f7a2e1c9', '8b2a3f1e-9c4d-4e6a-8f7b-1a2b3c4d5e6f', 'e2c1a5cf-27be-4b38-b5dc-6fc7f7a2e1c9', 'Carga Repsol Zaragoza', '99001', '65.80', 'EUR', '47.0', 'liters', 'approved', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('fuel_report_8', gen_random_uuid(), 'FR008', '3bc9ef59-698b-4859-878a-ce336f2c022d', '789c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '9c3b4e2f-0d5e-6a7b-8c9d-0e1f2a3b4c5d', '789c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'Combustible Cepsa Alicante', '77234', '62.15', 'EUR', '44.5', 'liters', 'approved', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('fuel_report_9', gen_random_uuid(), 'FR009', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Repostaje BP Granada Centro', '103120', '77.90', 'EUR', '57.0', 'liters', 'approved', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('fuel_report_10', gen_random_uuid(), 'FR010', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'Carga Galp Murcia Sur', '90234', '68.75', 'EUR', '49.0', 'liters', 'approved', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

-- ========================================
-- 12. PROBLEMAS/INCIDENCIAS (Issues) - NUEVO
-- ========================================
INSERT INTO issues (_key, uuid, public_id, issue_id, company_uuid, driver_uuid, vehicle_uuid, assigned_to_uuid, reported_by_uuid, type, category, report, priority, status, created_at, updated_at) VALUES
('issue_1', gen_random_uuid(), 'ISS001', 'ISSUE-001', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '11b42d15-6a93-44fa-b6a0-47a0e9f69c36', '6c4bf4d1-6e30-44c9-b97a-8ec92c94dfe4', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '11b42d15-6a93-44fa-b6a0-47a0e9f69c36', 'mechanical', 'engine', 'Motor hace ruido extraño al arrancar en frío', 'high', 'open', NOW(), NOW()),
('issue_2', gen_random_uuid(), 'ISS002', 'ISSUE-002', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e2c1a5cf-27be-4b38-b5dc-6fc7f7a2e1c9', '8b2a3f1e-9c4d-4e6a-8f7b-1a2b3c4d5e6f', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'e2c1a5cf-27be-4b38-b5dc-6fc7f7a2e1c9', 'electrical', 'lights', 'Luz delantera izquierda intermitente', 'medium', 'in_progress', NOW() - INTERVAL '1 day', NOW()),
('issue_3', gen_random_uuid(), 'ISS003', 'ISSUE-003', '3bc9ef59-698b-4859-878a-ce336f2c022d', '789c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '9c3b4e2f-0d5e-6a7b-8c9d-0e1f2a3b4c5d', '789c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '789c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'tire', 'wear', 'Neumáticos traseros con desgaste irregular', 'high', 'open', NOW() - INTERVAL '2 days', NOW()),
('issue_4', gen_random_uuid(), 'ISS004', 'ISSUE-004', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', '11b42d15-6a93-44fa-b6a0-47a0e9f69c36', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'body', 'damage', 'Raspadura en puerta lateral derecha', 'low', 'resolved', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'),
('issue_5', gen_random_uuid(), 'ISS005', 'ISSUE-005', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'e2c1a5cf-27be-4b38-b5dc-6fc7f7a2e1c9', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'brake', 'maintenance', 'Frenos requieren ajuste, pedal blando', 'high', 'in_progress', NOW() - INTERVAL '3 days', NOW());

-- Añadir más incidencias (45 adicionales)
INSERT INTO issues (_key, uuid, public_id, issue_id, company_uuid, driver_uuid, vehicle_uuid, assigned_to_uuid, reported_by_uuid, type, category, report, priority, status, created_at, updated_at) VALUES
('issue_6', gen_random_uuid(), 'ISS006', 'ISSUE-006', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', '11b42d15-6a93-44fa-b6a0-47a0e9f69c36', '6c4bf4d1-6e30-44c9-b97a-8ec92c94dfe4', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '11b42d15-6a93-44fa-b6a0-47a0e9f69c36', 'maintenance', 'oil', 'Cambio de aceite próximo según odómetro', 'medium', 'open', NOW() - INTERVAL '4 days', NOW()),
('issue_7', gen_random_uuid(), 'ISS007', 'ISSUE-007', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'e2c1a5cf-27be-4b38-b5dc-6fc7f7a2e1c9', '8b2a3f1e-9c4d-4e6a-8f7b-1a2b3c4d5e6f', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'e2c1a5cf-27be-4b38-b5dc-6fc7f7a2e1c9', 'electrical', 'battery', 'Batería con bajo rendimiento', 'medium', 'open', NOW() - INTERVAL '5 days', NOW()),
('issue_8', gen_random_uuid(), 'ISS008', 'ISSUE-008', '3bc9ef59-698b-4859-878a-ce336f2c022d', '789c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '9c3b4e2f-0d5e-6a7b-8c9d-0e1f2a3b4c5d', '789c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '789c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'suspension', 'shock', 'Amortiguadores traseros gastados', 'high', 'in_progress', NOW() - INTERVAL '6 days', NOW()),
('issue_9', gen_random_uuid(), 'ISS009', 'ISSUE-009', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', '11b42d15-6a93-44fa-b6a0-47a0e9f69c36', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'glass', 'crack', 'Pequeña fisura en parabrisas', 'low', 'open', NOW() - INTERVAL '8 days', NOW()),
('issue_10', gen_random_uuid(), 'ISS010', 'ISSUE-010', '70f77eee-df4b-4535-86b2-0dd302ff54f9', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'e2c1a5cf-27be-4b38-b5dc-6fc7f7a2e1c9', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'hvac', 'air_conditioning', 'Aire acondicionado no enfría correctamente', 'medium', 'open', NOW() - INTERVAL '10 days', NOW());

-- ========================================
-- 13. ÁREAS DE SERVICIO (Service Areas) - NUEVO
-- ========================================
INSERT INTO service_areas (_key, uuid, public_id, company_uuid, name, type, status, created_at, updated_at) VALUES
('service_area_1', gen_random_uuid(), 'SA001', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Madrid Metropolitano', 'delivery', 'active', NOW(), NOW()),
('service_area_2', gen_random_uuid(), 'SA002', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Barcelona Ciudad', 'delivery', 'active', NOW(), NOW()),
('service_area_3', gen_random_uuid(), 'SA003', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Valencia Centro', 'delivery', 'active', NOW(), NOW()),
('service_area_4', gen_random_uuid(), 'SA004', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Sevilla Norte', 'delivery', 'active', NOW(), NOW()),
('service_area_5', gen_random_uuid(), 'SA005', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Bilbao Centro', 'delivery', 'active', NOW(), NOW()),
('service_area_6', gen_random_uuid(), 'SA006', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Málaga Costa', 'delivery', 'active', NOW(), NOW()),
('service_area_7', gen_random_uuid(), 'SA007', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Zaragoza Este', 'delivery', 'active', NOW(), NOW()),
('service_area_8', gen_random_uuid(), 'SA008', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Murcia Sur', 'delivery', 'active', NOW(), NOW()),
('service_area_9', gen_random_uuid(), 'SA009', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Palma de Mallorca', 'delivery', 'active', NOW(), NOW()),
('service_area_10', gen_random_uuid(), 'SA010', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Las Palmas', 'delivery', 'active', NOW(), NOW());

-- ========================================
-- 14. ZONAS (Zones) - NUEVO
-- ========================================
INSERT INTO zones (_key, uuid, public_id, company_uuid, service_area_uuid, name, description, status, created_at, updated_at) VALUES
('zone_1', gen_random_uuid(), 'ZONE001', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', (SELECT uuid FROM service_areas WHERE _key = 'service_area_1'), 'Madrid Centro', 'Zona centro de Madrid incluyendo Sol, Gran Vía', 'active', NOW(), NOW()),
('zone_2', gen_random_uuid(), 'ZONE002', '70f77eee-df4b-4535-86b2-0dd302ff54f9', (SELECT uuid FROM service_areas WHERE _key = 'service_area_2'), 'Barcelona Eixample', 'Distrito del Eixample de Barcelona', 'active', NOW(), NOW()),
('zone_3', gen_random_uuid(), 'ZONE003', '3bc9ef59-698b-4859-878a-ce336f2c022d', (SELECT uuid FROM service_areas WHERE _key = 'service_area_3'), 'Valencia Ruzafa', 'Barrio de Ruzafa en Valencia', 'active', NOW(), NOW()),
('zone_4', gen_random_uuid(), 'ZONE004', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', (SELECT uuid FROM service_areas WHERE _key = 'service_area_4'), 'Sevilla Triana', 'Barrio de Triana en Sevilla', 'active', NOW(), NOW()),
('zone_5', gen_random_uuid(), 'ZONE005', '70f77eee-df4b-4535-86b2-0dd302ff54f9', (SELECT uuid FROM service_areas WHERE _key = 'service_area_5'), 'Bilbao Casco Viejo', 'Casco histórico de Bilbao', 'active', NOW(), NOW()),
('zone_6', gen_random_uuid(), 'ZONE006', '3bc9ef59-698b-4859-878a-ce336f2c022d', (SELECT uuid FROM service_areas WHERE _key = 'service_area_6'), 'Málaga Centro', 'Centro histórico de Málaga', 'active', NOW(), NOW()),
('zone_7', gen_random_uuid(), 'ZONE007', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', (SELECT uuid FROM service_areas WHERE _key = 'service_area_7'), 'Zaragoza Delicias', 'Barrio Delicias en Zaragoza', 'active', NOW(), NOW()),
('zone_8', gen_random_uuid(), 'ZONE008', '70f77eee-df4b-4535-86b2-0dd302ff54f9', (SELECT uuid FROM service_areas WHERE _key = 'service_area_8'), 'Murcia Centro', 'Centro urbano de Murcia', 'active', NOW(), NOW()),
('zone_9', gen_random_uuid(), 'ZONE009', '3bc9ef59-698b-4859-878a-ce336f2c022d', (SELECT uuid FROM service_areas WHERE _key = 'service_area_9'), 'Palma Centro', 'Centro de Palma de Mallorca', 'active', NOW(), NOW()),
('zone_10', gen_random_uuid(), 'ZONE010', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', (SELECT uuid FROM service_areas WHERE _key = 'service_area_10'), 'Las Palmas Vegueta', 'Barrio histórico de Vegueta', 'active', NOW(), NOW());

-- ========================================
-- 15. CONTACTOS (Contacts) - NUEVO
-- ========================================
INSERT INTO contacts (_key, uuid, public_id, company_uuid, name, email, phone, title, type, status, created_at, updated_at) VALUES
('contact_1', gen_random_uuid(), 'CONT001', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Juan Pérez García', 'juan.perez@cliente1.es', '+34912345678', 'Gerente de Logística', 'customer', 'active', NOW(), NOW()),
('contact_2', gen_random_uuid(), 'CONT002', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'María López Martínez', 'maria.lopez@cliente2.es', '+34923456789', 'Coordinadora de Compras', 'customer', 'active', NOW(), NOW()),
('contact_3', gen_random_uuid(), 'CONT003', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Carlos Rodríguez Sánchez', 'carlos.rodriguez@cliente3.es', '+34934567890', 'Director de Operaciones', 'customer', 'active', NOW(), NOW()),
('contact_4', gen_random_uuid(), 'CONT004', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Ana Fernández Gómez', 'ana.fernandez@proveedor1.es', '+34945678901', 'Responsable de Ventas', 'vendor', 'active', NOW(), NOW()),
('contact_5', gen_random_uuid(), 'CONT005', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Luis Martín Torres', 'luis.martin@proveedor2.es', '+34956789012', 'Jefe de Almacén', 'vendor', 'active', NOW(), NOW()),
('contact_6', gen_random_uuid(), 'CONT006', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Elena García Ruiz', 'elena.garcia@cliente4.es', '+34967890123', 'Gerente General', 'customer', 'active', NOW(), NOW()),
('contact_7', gen_random_uuid(), 'CONT007', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Pedro Jiménez Castro', 'pedro.jimenez@cliente5.es', '+34978901234', 'Coordinador Logístico', 'customer', 'active', NOW(), NOW()),
('contact_8', gen_random_uuid(), 'CONT008', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Laura Sánchez Moreno', 'laura.sanchez@proveedor3.es', '+34989012345', 'Directora Comercial', 'vendor', 'active', NOW(), NOW()),
('contact_9', gen_random_uuid(), 'CONT009', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Miguel Ángel Díaz Ortiz', 'miguel.diaz@cliente6.es', '+34990123456', 'Supervisor de Recepción', 'customer', 'active', NOW(), NOW()),
('contact_10', gen_random_uuid(), 'CONT010', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Carmen Romero Vega', 'carmen.romero@cliente7.es', '+34901234567', 'Jefa de Compras', 'customer', 'active', NOW(), NOW());

-- Añadir más contactos (40 adicionales)
INSERT INTO contacts (_key, uuid, public_id, company_uuid, name, email, phone, title, type, status, created_at, updated_at) VALUES
('contact_11', gen_random_uuid(), 'CONT011', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Francisco Morales Jiménez', 'francisco.morales@cliente8.es', '+34912345679', 'Gerente de Operaciones', 'customer', 'active', NOW(), NOW()),
('contact_12', gen_random_uuid(), 'CONT012', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Isabel Torres Navarro', 'isabel.torres@proveedor4.es', '+34923456780', 'Coordinadora de Ventas', 'vendor', 'active', NOW(), NOW()),
('contact_13', gen_random_uuid(), 'CONT013', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Antonio Ramírez Gil', 'antonio.ramirez@cliente9.es', '+34934567891', 'Director de Compras', 'customer', 'active', NOW(), NOW()),
('contact_14', gen_random_uuid(), 'CONT014', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Rosa María Castillo Vargas', 'rosa.castillo@cliente10.es', '+34945678902', 'Responsable de Almacén', 'customer', 'active', NOW(), NOW()),
('contact_15', gen_random_uuid(), 'CONT015', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'José Luis Herrera Ponce', 'jose.herrera@proveedor5.es', '+34956789013', 'Jefe de Logística', 'vendor', 'active', NOW(), NOW()),
('contact_16', gen_random_uuid(), 'CONT016', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Dolores Muñoz Campos', 'dolores.munoz@cliente11.es', '+34967890124', 'Gerente de Tienda', 'customer', 'active', NOW(), NOW()),
('contact_17', gen_random_uuid(), 'CONT017', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Manuel Cruz Flores', 'manuel.cruz@cliente12.es', '+34978901235', 'Coordinador de Recepción', 'customer', 'active', NOW(), NOW()),
('contact_18', gen_random_uuid(), 'CONT018', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Pilar Ortega Santos', 'pilar.ortega@proveedor6.es', '+34989012346', 'Directora de Operaciones', 'vendor', 'active', NOW(), NOW()),
('contact_19', gen_random_uuid(), 'CONT019', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Javier Delgado Ramos', 'javier.delgado@cliente13.es', '+34990123457', 'Supervisor de Almacén', 'customer', 'active', NOW(), NOW()),
('contact_20', gen_random_uuid(), 'CONT020', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Concepción Iglesias Mora', 'concepcion.iglesias@cliente14.es', '+34901234568', 'Jefa de Logística', 'customer', 'active', NOW(), NOW());

-- ========================================
-- 16. EMPRESAS ADICIONALES - AMPLIADO
-- ========================================
INSERT INTO companies (_key, uuid, public_id, name, phone, email, type, status, slug, created_at, updated_at) VALUES
('company_4', gen_random_uuid(), 'COMP004', 'Logística Rápida Express', '+34912345680', 'contacto@lograpida.es', 'logistics', 'active', 'logistica-rapida-express', NOW(), NOW()),
('company_5', gen_random_uuid(), 'COMP005', 'Transporte Seguro SA', '+34923456781', 'info@transeguro.es', 'logistics', 'active', 'transporte-seguro-sa', NOW(), NOW()),
('company_6', gen_random_uuid(), 'COMP006', 'Envíos Mediterráneos', '+34934567892', 'contacto@enviomed.es', 'logistics', 'active', 'envios-mediterraneos', NOW(), NOW()),
('company_7', gen_random_uuid(), 'COMP007', 'Distribuciones del Norte', '+34945678903', 'info@distnorte.es', 'logistics', 'active', 'distribuciones-del-norte', NOW(), NOW()),
('company_8', gen_random_uuid(), 'COMP008', 'Transporte Urbano Madrid', '+34956789014', 'contacto@turbanomad.es', 'logistics', 'active', 'transporte-urbano-madrid', NOW(), NOW());

-- ========================================
-- 17. LUGARES ADICIONALES (Direcciones de Clientes) - AMPLIADO
-- ========================================
INSERT INTO places (_key, uuid, public_id, company_uuid, name, street1, city, postal_code, country, latitude, longitude, phone, type, created_at, updated_at) VALUES
('place_51', gen_random_uuid(), 'PLACE051', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Cliente Residencial 1', 'Calle Mayor 15', 'Madrid', '28013', 'ES', '40.415364', '-3.707398', '+34911111111', 'customer', NOW(), NOW()),
('place_52', gen_random_uuid(), 'PLACE052', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Cliente Comercial 2', 'Avenida Diagonal 250', 'Barcelona', '08007', 'ES', '41.395206', '2.152963', '+34922222222', 'customer', NOW(), NOW()),
('place_53', gen_random_uuid(), 'PLACE053', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Oficina Central Cliente 3', 'Calle Colón 30', 'Valencia', '46004', 'ES', '39.471179', '-0.377125', '+34933333333', 'customer', NOW(), NOW()),
('place_54', gen_random_uuid(), 'PLACE054', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Restaurante El Buen Sabor', 'Plaza de España 5', 'Sevilla', '41013', 'ES', '37.389092', '-5.984459', '+34944444444', 'customer', NOW(), NOW()),
('place_55', gen_random_uuid(), 'PLACE055', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Tienda Electrónica Tech', 'Gran Vía 45', 'Bilbao', '48011', 'ES', '43.263012', '-2.935010', '+34955555555', 'customer', NOW(), NOW()),
('place_56', gen_random_uuid(), 'PLACE056', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Supermercado La Esperanza', 'Avenida de Andalucía 80', 'Málaga', '29006', 'ES', '36.721261', '-4.421034', '+34966666666', 'customer', NOW(), NOW()),
('place_57', gen_random_uuid(), 'PLACE057', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Farmacia Central', 'Calle Alfonso I 12', 'Zaragoza', '50003', 'ES', '41.656250', '-0.879421', '+34977777777', 'customer', NOW(), NOW()),
('place_58', gen_random_uuid(), 'PLACE058', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Hotel Plaza Mayor', 'Plaza Mayor 1', 'Salamanca', '37002', 'ES', '40.969106', '-5.663516', '+34988888888', 'customer', NOW(), NOW()),
('place_59', gen_random_uuid(), 'PLACE059', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Librería Cervantes', 'Calle Sierpes 25', 'Sevilla', '41004', 'ES', '37.391512', '-5.993591', '+34999999999', 'customer', NOW(), NOW()),
('place_60', gen_random_uuid(), 'PLACE060', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Gimnasio FitZone', 'Avenida de América 100', 'Madrid', '28028', 'ES', '40.442030', '-3.678060', '+34900000000', 'customer', NOW(), NOW());

-- ========================================
-- 18. VEHÍCULOS ADICIONALES - AMPLIADO
-- ========================================
INSERT INTO vehicles (_key, uuid, public_id, company_uuid, make, model, year, plate_number, vin, type, status, created_at, updated_at) VALUES
('vehicle_61', gen_random_uuid(), 'VEH061', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Mercedes-Benz', 'Sprinter 316', '2023', '1234ABC', 'WDB9060451234567', 'van', 'active', NOW(), NOW()),
('vehicle_62', gen_random_uuid(), 'VEH062', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Ford', 'Transit Custom', '2022', '5678DEF', 'WF0XXTTG5X12345678', 'van', 'active', NOW(), NOW()),
('vehicle_63', gen_random_uuid(), 'VEH063', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Renault', 'Master', '2021', '9012GHI', 'VF1MA000012345678', 'van', 'active', NOW(), NOW()),
('vehicle_64', gen_random_uuid(), 'VEH064', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Peugeot', 'Boxer', '2023', '3456JKL', 'VF3YCYHZP12345678', 'van', 'active', NOW(), NOW()),
('vehicle_65', gen_random_uuid(), 'VEH065', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Fiat', 'Ducato', '2022', '7890MNO', 'ZFA25000012345678', 'van', 'active', NOW(), NOW()),
('vehicle_66', gen_random_uuid(), 'VEH066', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Volkswagen', 'Crafter', '2023', '1235PQR', 'WV1ZZZ2EZ12345678', 'van', 'active', NOW(), NOW()),
('vehicle_67', gen_random_uuid(), 'VEH067', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Iveco', 'Daily', '2021', '5679STU', 'ZCFC35A0012345678', 'van', 'active', NOW(), NOW()),
('vehicle_68', gen_random_uuid(), 'VEH068', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Citroën', 'Jumper', '2022', '9013VWX', 'VF7YACYHZ12345678', 'van', 'active', NOW(), NOW()),
('vehicle_69', gen_random_uuid(), 'VEH069', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Nissan', 'NV400', '2023', '3457YZA', 'VF1VY000012345678', 'van', 'active', NOW(), NOW()),
('vehicle_70', gen_random_uuid(), 'VEH070', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Opel', 'Movano', '2021', '7891BCD', 'W0L0XCF8012345678', 'van', 'active', NOW(), NOW());

-- ========================================
-- 19. CONDUCTORES ADICIONALES - AMPLIADO
-- ========================================
INSERT INTO drivers (_key, uuid, public_id, company_uuid, vendor_uuid, name, phone, email, drivers_license_number, status, created_at, updated_at) VALUES
('driver_81', gen_random_uuid(), 'DRV081', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Ricardo Herrera Martínez', '+34611111111', 'ricardo.herrera@enviopremium.es', 'B-12345681', 'active', NOW(), NOW()),
('driver_82', gen_random_uuid(), 'DRV082', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Beatriz Molina Sánchez', '+34622222222', 'beatriz.molina@transrapidos.es', 'B-12345682', 'active', NOW(), NOW()),
('driver_83', gen_random_uuid(), 'DRV083', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Sergio Vega Romero', '+34633333333', 'sergio.vega@transverdes.es', 'B-12345683', 'active', NOW(), NOW()),
('driver_84', gen_random_uuid(), 'DRV084', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Patricia Guerrero Torres', '+34644444444', 'patricia.guerrero@enviopremium.es', 'B-12345684', 'active', NOW(), NOW()),
('driver_85', gen_random_uuid(), 'DRV085', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Alberto Cortés Navarro', '+34655555555', 'alberto.cortes@transrapidos.es', 'B-12345685', 'active', NOW(), NOW()),
('driver_86', gen_random_uuid(), 'DRV086', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Raquel Medina Castro', '+34666666666', 'raquel.medina@transverdes.es', 'B-12345686', 'active', NOW(), NOW()),
('driver_87', gen_random_uuid(), 'DRV087', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Rubén Vargas Gil', '+34677777777', 'ruben.vargas@enviopremium.es', 'B-12345687', 'active', NOW(), NOW()),
('driver_88', gen_random_uuid(), 'DRV088', '70f77eee-df4b-4535-86b2-0dd302ff54f9', NULL, 'Silvia Campos Ortiz', '+34688888888', 'silvia.campos@transrapidos.es', 'B-12345688', 'active', NOW(), NOW()),
('driver_89', gen_random_uuid(), 'DRV089', '3bc9ef59-698b-4859-878a-ce336f2c022d', NULL, 'Víctor Prieto Ramos', '+34699999999', 'victor.prieto@transverdes.es', 'B-12345689', 'active', NOW(), NOW()),
('driver_90', gen_random_uuid(), 'DRV090', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', NULL, 'Natalia Pascual Moreno', '+34600000000', 'natalia.pascual@enviopremium.es', 'B-12345690', 'active', NOW(), NOW());

-- ========================================
-- 20. RUTAS (Routes) - NUEVO
-- ========================================
INSERT INTO routes (_key, uuid, public_id, company_uuid, name, description, status, created_at, updated_at) VALUES
('route_1', gen_random_uuid(), 'ROUTE001', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Ruta Madrid Centro - Norte', 'Ruta de distribución diaria zona norte de Madrid', 'active', NOW(), NOW()),
('route_2', gen_random_uuid(), 'ROUTE002', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Ruta Barcelona Litoral', 'Ruta costera de Barcelona', 'active', NOW(), NOW()),
('route_3', gen_random_uuid(), 'ROUTE003', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Ruta Valencia Express', 'Entregas urgentes en Valencia', 'active', NOW(), NOW()),
('route_4', gen_random_uuid(), 'ROUTE004', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Ruta Sevilla Sur', 'Distribución zona sur de Sevilla', 'active', NOW(), NOW()),
('route_5', gen_random_uuid(), 'ROUTE005', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Ruta Bilbao Industrial', 'Zona industrial de Bilbao', 'active', NOW(), NOW()),
('route_6', gen_random_uuid(), 'ROUTE006', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Ruta Málaga Costa del Sol', 'Entregas en la Costa del Sol', 'active', NOW(), NOW()),
('route_7', gen_random_uuid(), 'ROUTE007', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Ruta Zaragoza Este-Oeste', 'Ruta transversal de Zaragoza', 'active', NOW(), NOW()),
('route_8', gen_random_uuid(), 'ROUTE008', '70f77eee-df4b-4535-86b2-0dd302ff54f9', 'Ruta Murcia Centro', 'Distribución centro urbano de Murcia', 'active', NOW(), NOW()),
('route_9', gen_random_uuid(), 'ROUTE009', '3bc9ef59-698b-4859-878a-ce336f2c022d', 'Ruta Palma Islas', 'Entregas en Palma de Mallorca', 'active', NOW(), NOW()),
('route_10', gen_random_uuid(), 'ROUTE010', 'b2b0a0ab-e631-420c-a5b4-bda0f184c04c', 'Ruta Madrid-Toledo', 'Ruta interurbana Madrid-Toledo', 'active', NOW(), NOW());

COMMIT;

-- ========================================
-- RESUMEN DE REGISTROS GENERADOS (ACTUALIZADO):
-- ========================================
-- Empresas: 8 (5 nuevas)
-- Lugares: 60 (10 nuevos)
-- Proveedores: 10
-- Flotas: 15
-- Conductores: 90 (10 nuevos)
-- Vehículos: 70 (10 nuevos)
-- Relaciones Flota-Conductores: 80
-- Relaciones Flota-Vehículos: 60
-- Números de Seguimiento: 100
-- Cargas: 100
-- Entidades: 150
-- Órdenes: 100
-- Estados de Seguimiento: 200
-- Waypoints: 150
-- Reportes de Combustible: 10 (nuevos)
-- Incidencias/Problemas: 10 (nuevos)
-- Áreas de Servicio: 10 (nuevos)
-- Zonas: 10 (nuevos)
-- Contactos: 20 (nuevos)
-- Rutas: 10 (nuevos)
-- ========================================
-- TOTAL: 1,268 REGISTROS (110 NUEVOS)
-- ========================================
-- 
-- NOTAS:
-- - Todos los datos están en español
-- - Se han añadido tablas adicionales de Fleet-Ops
-- - Los datos son consistentes y relacionados entre sí
-- - Preparado para PostgreSQL con gen_random_uuid()
-- ========================================
