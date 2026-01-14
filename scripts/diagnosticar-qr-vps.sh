#!/bin/bash
# Script de diagnostico para problemas de QR en el VPS
# Ejecuta en el VPS: bash scripts/diagnosticar-qr-vps.sh

echo "==============================================="
echo "DIAGNOSTICO: PROBLEMA DE GENERACION DE QR"
echo "==============================================="
echo ""

# 1. Verificar procesos de Chrome/Puppeteer colgados
echo "1. Verificando procesos de Chrome/Puppeteer..."
CHROME_PROCESSES=$(ps aux | grep -i chrome | grep -v grep | wc -l)
if [ "$CHROME_PROCESSES" -gt 0 ]; then
    echo "   [ADVERTENCIA] Se encontraron $CHROME_PROCESSES proceso(s) de Chrome corriendo:"
    ps aux | grep -i chrome | grep -v grep | head -5
    echo ""
    echo "   Puede que haya procesos colgados. Para matarlos:"
    echo "   pkill -f chrome"
    echo "   pkill -f chromium"
else
    echo "   [OK] No hay procesos de Chrome corriendo"
fi
echo ""

# 2. Verificar si Puppeteer puede encontrar Chrome
echo "2. Verificando instalacion de Puppeteer y Chrome..."
cd ~/whatsapp-bot-norhflank 2>/dev/null || cd /root/whatsapp-bot-norhflank 2>/dev/null || echo "   [ERROR] No se encontro el directorio del proyecto"

if [ -d "node_modules/puppeteer" ]; then
    echo "   [OK] Puppeteer esta instalado"
    
    # Intentar obtener la ruta de Chrome
    CHROME_PATH=$(node -e "const puppeteer = require('puppeteer'); console.log(puppeteer.executablePath());" 2>&1)
    if [ $? -eq 0 ] && [ -f "$CHROME_PATH" ]; then
        echo "   [OK] Chrome encontrado en: $CHROME_PATH"
        echo "   [OK] Chrome es ejecutable: $(test -x "$CHROME_PATH" && echo 'SI' || echo 'NO')"
    else
        echo "   [ERROR] No se puede encontrar Chrome"
        echo "   Chrome path: $CHROME_PATH"
    fi
else
    echo "   [ERROR] Puppeteer no esta instalado"
    echo "   Ejecuta: npm install"
fi
echo ""

# 3. Verificar dependencias del sistema
echo "3. Verificando dependencias del sistema..."
MISSING_DEPS=""

for dep in libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2; do
    if ! dpkg -l | grep -q "^ii.*$dep"; then
        MISSING_DEPS="$MISSING_DEPS $dep"
    fi
done

if [ -z "$MISSING_DEPS" ]; then
    echo "   [OK] Dependencias del sistema instaladas"
else
    echo "   [ADVERTENCIA] Faltan dependencias: $MISSING_DEPS"
    echo "   Instalar con: sudo apt-get update && sudo apt-get install -y $MISSING_DEPS"
fi
echo ""

# 4. Verificar espacio en disco
echo "4. Verificando espacio en disco..."
df -h / | tail -1 | awk '{print "   Espacio disponible: " $4 " de " $2 " (" $5 " usado)"}'
echo ""

# 5. Verificar memoria
echo "5. Verificando memoria..."
free -h | grep Mem | awk '{print "   Memoria: " $3 " usada de " $2 " (" int($3/$2*100) "% usado)"}'
echo ""

# 6. Verificar logs recientes
echo "6. Verificando logs recientes del bot..."
if [ -f "sessions/unikuo/.wwebjs_cache/chrome_debug.log" ]; then
    echo "   [OK] Log de Chrome encontrado"
    echo "   Ultimas lineas del log:"
    tail -20 "sessions/unikuo/.wwebjs_cache/chrome_debug.log" | sed 's/^/   /'
else
    echo "   [INFO] No se encontro log de Chrome (puede ser normal si no se ha iniciado)"
fi
echo ""

# 7. Verificar permisos de sesiones
echo "7. Verificando permisos de directorio de sesiones..."
if [ -d "sessions/unikuo" ]; then
    PERMS=$(stat -c "%a" "sessions/unikuo" 2>/dev/null || stat -f "%OLp" "sessions/unikuo" 2>/dev/null)
    echo "   Permisos de sessions/unikuo: $PERMS"
    if [ "$PERMS" != "755" ] && [ "$PERMS" != "775" ]; then
        echo "   [ADVERTENCIA] Permisos pueden ser incorrectos. Deberian ser 755 o 775"
    fi
else
    echo "   [INFO] Directorio sessions/unikuo no existe (se creara al iniciar)"
fi
echo ""

# 8. Recomendaciones
echo "==============================================="
echo "RECOMENDACIONES"
echo "==============================================="
echo ""
echo "Si hay procesos colgados, ejecuta:"
echo "  pkill -f chrome"
echo "  pkill -f chromium"
echo ""
echo "Si faltan dependencias, ejecuta:"
echo "  sudo apt-get update"
echo "  sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2"
echo ""
echo "Para limpiar sesion y empezar de nuevo:"
echo "  rm -rf sessions/unikuo"
echo ""
echo "Para ver logs en tiempo real mientras inicia el bot:"
echo "  npm start 2>&1 | tee bot.log"
echo ""
