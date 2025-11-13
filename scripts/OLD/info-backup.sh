#!/bin/bash
# Mostrar información sobre lo que se respaldará

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 INFORMACIÓN DEL SISTEMA ANTES DEL BACKUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🗄️  BASE DE DATOS:"
sudo docker compose exec -T database psql -U fleetbase -d fleetbase -c "
SELECT 
    'Tamaño de BD' as descripcion,
    pg_size_pretty(pg_database_size('fleetbase')) as valor
UNION ALL
SELECT 
    'Total migraciones',
    COUNT(*)::text
FROM migrations
UNION ALL
SELECT 
    'Total tablas',
    COUNT(*)::text
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
" 2>/dev/null || echo "  ⚠️  No se pudo conectar a la base de datos"

echo ""
echo "📦 ARCHIVOS:"
echo "  Config: $(du -sh docker-compose*.yml api/.env api/config docker/ 2>/dev/null | awk '{sum+=$1} END {print sum}') archivos"
echo "  Scripts: $(ls scripts/*.sh 2>/dev/null | wc -l) scripts"
echo "  Storage: $(du -sh api/storage 2>/dev/null | cut -f1 || echo '0')"

echo ""
echo "🐳 DOCKER:"
sudo docker compose ps --format "table {{.Service}}\t{{.Status}}" 2>/dev/null || echo "  ⚠️  Docker no disponible"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 UBICACIÓN DEL BACKUP: /mnt/g/Users/GAMEMAX/Documents/CREAI/backups/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
