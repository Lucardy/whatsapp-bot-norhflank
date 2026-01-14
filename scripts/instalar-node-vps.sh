#!/bin/bash
# Script para instalar Node.js en el VPS
# Ejecuta estos comandos DESPUÉS de conectarte por SSH

echo "🔍 Paso 1: Verificando sistema operativo..."
cat /etc/os-release

echo ""
echo "📦 Paso 2: Actualizando sistema..."
apt update
apt upgrade -y

echo ""
echo "🟢 Paso 3: Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo ""
echo "✅ Paso 4: Verificando instalación..."
echo "Versión de Node.js:"
node --version
echo "Versión de npm:"
npm --version

echo ""
echo "🎉 ¡Instalación completada!"
