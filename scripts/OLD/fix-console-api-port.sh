#!/bin/bash
# Script para Corregir el Puerto del API en el Console
# Este script detecta el puerto HTTP configurado y actualiza console/fleetbase.config.json

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔧 CORREGIR PUERTO DEL API EN CONSOLE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ] && [ ! -f "docker-compose.override.yml" ]; then
    echo -e "${RED}❌ Error: No se encontró docker-compose.yml${NC}"
    echo -e "${YELLOW}Ejecuta este script desde el directorio raíz de tu instancia Fleetbase${NC}"
    exit 1
fi

# Detectar puerto HTTP del docker-compose.override.yml
echo -e "${YELLOW}🔍 Detectando puerto HTTP configurado...${NC}"

HTTP_PORT=""
if [ -f "docker-compose.override.yml" ]; then
    # Buscar el mapeo de puertos del servicio httpd
    HTTP_PORT=$(grep -A 5 "httpd:" docker-compose.override.yml | grep "ports:" -A 1 | grep -oP '\d+(?=:8000)' | head -1)
fi

# Si no se encontró en override, buscar en docker-compose.yml
if [ -z "$HTTP_PORT" ] && [ -f "docker-compose.yml" ]; then
    HTTP_PORT=$(grep -A 5 "httpd:" docker-compose.yml | grep "ports:" -A 1 | grep -oP '\d+(?=:8000|\:80)' | head -1)
fi

# Valor por defecto si no se encontró
HTTP_PORT=${HTTP_PORT:-8000}

echo -e "${GREEN}✓ Puerto HTTP detectado: ${HTTP_PORT}${NC}"
echo ""

# Verificar si existe console/fleetbase.config.json
if [ ! -f "console/fleetbase.config.json" ]; then
    echo -e "${YELLOW}⚠️  No se encontró console/fleetbase.config.json${NC}"
    echo -e "${YELLOW}   Creando archivo nuevo...${NC}"
    
    mkdir -p console
    
    cat > console/fleetbase.config.json << EOF
{
  "API_HOST": "http://localhost:${HTTP_PORT}",
  "SOCKETCLUSTER_HOST": "localhost",
  "SOCKETCLUSTER_PORT": "38000",
  "SOCKETCLUSTER_SECURE": "false"
}
EOF
    
    echo -e "${GREEN}✅ Archivo creado exitosamente${NC}"
else
    echo -e "${YELLOW}📝 Actualizando console/fleetbase.config.json...${NC}"
    
    # Leer el puerto actual del archivo
    CURRENT_PORT=$(grep "API_HOST" console/fleetbase.config.json | grep -oP ':\d+' | grep -oP '\d+' || echo "desconocido")
    
    echo -e "${BLUE}   Puerto actual en config: ${CURRENT_PORT}${NC}"
    echo -e "${BLUE}   Puerto detectado: ${HTTP_PORT}${NC}"
    
    if [ "$CURRENT_PORT" = "$HTTP_PORT" ]; then
        echo -e "${GREEN}✓ El puerto ya está correctamente configurado${NC}"
    else
        # Hacer backup del archivo original
        cp console/fleetbase.config.json console/fleetbase.config.json.backup
        echo -e "${YELLOW}   ⚠️  Backup creado: console/fleetbase.config.json.backup${NC}"
        
        # Actualizar el archivo
        cat > console/fleetbase.config.json << EOF
{
  "API_HOST": "http://localhost:${HTTP_PORT}",
  "SOCKETCLUSTER_HOST": "localhost",
  "SOCKETCLUSTER_PORT": "38000",
  "SOCKETCLUSTER_SECURE": "false"
}
EOF
        
        echo -e "${GREEN}✅ Puerto actualizado de ${CURRENT_PORT} a ${HTTP_PORT}${NC}"
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ CONFIGURACIÓN COMPLETADA${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Archivo actualizado:${NC}"
echo -e "${GREEN}   console/fleetbase.config.json${NC}"
echo ""
echo -e "${YELLOW}🔄 Próximos pasos:${NC}"
echo -e "${GREEN}   1. Reiniciar el contenedor console:${NC}"
echo -e "      ${BLUE}sudo docker compose restart console${NC}"
echo ""
echo -e "${GREEN}   2. Limpiar caché del navegador o hacer Ctrl+Shift+R${NC}"
echo ""
echo -e "${GREEN}   3. Acceder a la aplicación:${NC}"
echo -e "      ${BLUE}http://localhost:${HTTP_PORT}${NC}"
echo ""

