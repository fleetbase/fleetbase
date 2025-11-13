-- Habilitar extensión PostGIS para soporte de datos geoespaciales
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verificar que se instaló correctamente
SELECT PostGIS_version();

