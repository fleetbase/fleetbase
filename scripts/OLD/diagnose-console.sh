#!/bin/bash
# Script para diagnosticar problemas con la consola de Fleetbase

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔍 DIAGNÓSTICO DE CONSOLA FLEETBASE${NC}"
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

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}1. Estado de los contenedores${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

$DOCKER_CMD compose ps

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}2. Puertos mapeados${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}Contenedor console:${NC}"
$DOCKER_CMD compose ps console | grep -v "NAME" | awk '{print $2}' || echo "No encontrado"

echo ""
echo -e "${GREEN}Todos los puertos:${NC}"
$DOCKER_CMD compose ps --format "table {{.Name}}\t{{.Ports}}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}3. Variables de entorno relevantes${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "api/.env" ]; then
    INTERNAL_SOCKET_PORT=$(grep "^SOCKET_PORT=" api/.env | cut -d'=' -f2 || echo "6001")
    CONSOLE_HOST=$(grep "^CONSOLE_HOST=" api/.env | cut -d'=' -f2 || echo "No definido")
    APP_URL=$(grep "^APP_URL=" api/.env | cut -d'=' -f2 || echo "No definido")
    
    echo -e "${GREEN}SOCKET_PORT (Interno):${NC} ${INTERNAL_SOCKET_PORT:-6001}"
    echo -e "${GREEN}CONSOLE_HOST:${NC} ${CONSOLE_HOST}"
    echo -e "${GREEN}APP_URL:${NC} ${APP_URL}"
else
    echo -e "${RED}❌ No se encuentra api/.env${NC}"
fi

# Extraer puerto de consola desde docker-compose.override.yml
if [ -f "docker-compose.override.yml" ]; then
    CONSOLE_PORT=$(grep -A 3 "console:" docker-compose.override.yml | grep "ports:" -A 1 | grep -oP '\d+(?=:4200)' | head -1)
    CONSOLE_PORT=${CONSOLE_PORT:-4200}
    echo -e "${GREEN}Puerto Console (Web):${NC} ${CONSOLE_PORT}"
fi

# Extraer puerto HTTP desde docker-compose.override.yml
if [ -f "docker-compose.override.yml" ]; then
    HTTP_PORT=$(grep -A 3 "httpd:" docker-compose.override.yml | grep "ports:" -A 1 | grep -oP '\d+(?=:8000)' | head -1)
    HTTP_PORT=${HTTP_PORT:-8000}
    echo -e "${GREEN}Puerto HTTP (API):${NC} ${HTTP_PORT}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}4. Verificando puertos en uso${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

CONSOLE_PORT=${CONSOLE_PORT:-4200}
HTTP_PORT=${HTTP_PORT:-8000}

echo -e "${GREEN}Puerto $CONSOLE_PORT (Console Web):${NC}"
if lsof -i :$CONSOLE_PORT >/dev/null 2>&1 || netstat -tuln 2>/dev/null | grep -q ":$CONSOLE_PORT "; then
    echo -e "   ${GREEN}✅ Puerto en uso${NC}"
    lsof -i :$CONSOLE_PORT 2>/dev/null || netstat -tuln 2>/dev/null | grep ":$CONSOLE_PORT"
else
    echo -e "   ${RED}❌ Puerto no está en uso${NC}"
fi

echo ""
echo -e "${GREEN}Puerto $HTTP_PORT (API):${NC}"
if lsof -i :$HTTP_PORT >/dev/null 2>&1 || netstat -tuln 2>/dev/null | grep -q ":$HTTP_PORT "; then
    echo -e "   ${GREEN}✅ Puerto en uso${NC}"
    lsof -i :$HTTP_PORT 2>/dev/null || netstat -tuln 2>/dev/null | grep ":$HTTP_PORT"
else
    echo -e "   ${RED}❌ Puerto no está en uso${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}5. Logs del contenedor console (últimas 50 líneas)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

$DOCKER_CMD compose logs --tail=50 console

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}6. Verificación de conectividad${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}Probando conexión a consola:${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$CONSOLE_PORT --max-time 5 2>/dev/null | grep -q "200\|301\|302"; then
    echo -e "   ${GREEN}✅ Consola responde${NC}"
else
    echo -e "   ${RED}❌ Consola no responde${NC}"
    echo -e "   ${YELLOW}💡 Intenta: curl -I http://localhost:$CONSOLE_PORT${NC}"
fi

echo ""
echo -e "${GREEN}Probando conexión a API:${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$HTTP_PORT/health --max-time 5 2>/dev/null | grep -q "200"; then
    echo -e "   ${GREEN}✅ API responde${NC}"
else
    echo -e "   ${RED}❌ API no responde${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}7. Configuración de docker-compose.override.yml${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "docker-compose.override.yml" ]; then
    echo -e "${GREEN}Configuración del servicio console:${NC}"
    grep -A 5 "console:" docker-compose.override.yml || echo "No encontrado"
else
    echo -e "${RED}❌ No se encuentra docker-compose.override.yml${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 RESUMEN Y RECOMENDACIONES${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar si console está corriendo
if $DOCKER_CMD compose ps console | grep -q "Up"; then
    echo -e "${GREEN}✅ Contenedor console está corriendo${NC}"
    
    # Verificar puerto
    if lsof -i :$CONSOLE_PORT >/dev/null 2>&1 || netstat -tuln 2>/dev/null | grep -q ":$CONSOLE_PORT "; then
        echo -e "${GREEN}✅ Puerto $CONSOLE_PORT está en uso${NC}"
        echo ""
        echo -e "${YELLOW}🌐 Intenta acceder a:${NC}"
        echo -e "   ${BLUE}http://localhost:$CONSOLE_PORT${NC}"
        echo -e "   ${BLUE}http://127.0.0.1:$CONSOLE_PORT${NC}"
        
        # Verificar si es WSL
        if grep -qi microsoft /proc/version 2>/dev/null; then
            echo ""
            echo -e "${YELLOW}💡 Estás en WSL. También intenta desde Windows:${NC}"
            WSL_IP=$(ip addr show eth0 | grep "inet\b" | awk '{print $2}' | cut -d/ -f1)
            echo -e "   ${BLUE}http://${WSL_IP}:${CONSOLE_PORT}${NC}"
        fi
    else
        echo -e "${RED}❌ Puerto $CONSOLE_PORT NO está en uso${NC}"
        echo ""
        echo -e "${YELLOW}💡 Soluciones:${NC}"
        echo -e "   1. Reinicia el contenedor: ${BLUE}docker compose restart console${NC}"
        echo -e "   2. Revisa los logs: ${BLUE}docker compose logs console${NC}"
        echo -e "   3. Verifica docker-compose.override.yml tiene el puerto correcto"
    fi
else
    echo -e "${RED}❌ Contenedor console NO está corriendo${NC}"
    echo ""
    echo -e "${YELLOW}💡 Soluciones:${NC}"
    echo -e "   1. Inicia los servicios: ${BLUE}docker compose up -d${NC}"
    echo -e "   2. Revisa errores: ${BLUE}docker compose logs console${NC}"
fi

echo ""

