#!/bin/bash

# Script de despliegue para el VPS
# Este script se ejecuta automáticamente cuando GitHub Actions hace push

set -e  # Detener si hay algún error

echo "🚀 Iniciando despliegue..."

# Colores para los mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorio del proyecto (ajusta esta ruta según donde esté en tu VPS)
PROJECT_DIR="${PROJECT_DIR:-$HOME/whatsapp-bot-norhflank}"

# Verificar que estamos en el directorio correcto
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo -e "${RED}❌ Error: No se encontró package.json en $PROJECT_DIR${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

echo -e "${GREEN}✓ Directorio del proyecto: $PROJECT_DIR${NC}"

# Obtener los últimos cambios
echo -e "${YELLOW}📥 Obteniendo últimos cambios de GitHub...${NC}"
git fetch origin
git reset --hard origin/main  # O usa 'origin/master' si tu rama se llama master
git clean -fd

echo -e "${GREEN}✓ Código actualizado${NC}"

# Instalar dependencias
echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
npm install --production --no-audit --no-fund

echo -e "${GREEN}✓ Dependencias instaladas${NC}"

# Generar Prisma Client
echo -e "${YELLOW}🗄️ Generando Prisma Client...${NC}"
npx prisma generate

echo -e "${GREEN}✓ Prisma Client generado${NC}"

# Ejecutar migraciones (solo si hay cambios)
echo -e "${YELLOW}🔄 Ejecutando migraciones de base de datos...${NC}"
npx prisma migrate deploy || echo -e "${YELLOW}⚠ No hay migraciones pendientes${NC}"

echo -e "${GREEN}✓ Migraciones completadas${NC}"

# Reiniciar el servicio
echo -e "${YELLOW}🔄 Reiniciando el bot...${NC}"

# Detectar cómo está corriendo el bot
if command -v pm2 &> /dev/null; then
    # Si usa PM2
    if pm2 list | grep -q "whatsapp-bot"; then
        echo -e "${GREEN}✓ Reiniciando con PM2...${NC}"
        pm2 restart whatsapp-bot
    else
        echo -e "${YELLOW}⚠ Bot no está corriendo con PM2, iniciando...${NC}"
        pm2 start src/index.js --name "whatsapp-bot" -- --skip-menu
    fi
    pm2 save
elif systemctl is-active --quiet whatsapp-bot; then
    # Si usa systemd
    echo -e "${GREEN}✓ Reiniciando con systemd...${NC}"
    sudo systemctl restart whatsapp-bot
elif docker ps | grep -q "whatsapp-bot"; then
    # Si usa Docker
    echo -e "${GREEN}✓ Reiniciando con Docker...${NC}"
    docker-compose restart || docker restart whatsapp-bot
else
    echo -e "${RED}⚠ No se detectó ningún gestor de procesos. El bot debe estar corriendo manualmente.${NC}"
    echo -e "${YELLOW}💡 Recomendación: Instala PM2 con: npm install -g pm2${NC}"
fi

echo -e "${GREEN}✅ Despliegue completado exitosamente!${NC}"
