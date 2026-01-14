#!/bin/bash
# Script completo para instalar Node.js en el VPS
# Ejecuta este script DESPUÉS de conectarte por SSH

echo "🔍 Verificando sistema operativo..."
cat /etc/os-release

echo ""
echo "📦 Actualizando sistema (esto puede tardar unos minutos)..."
apt update
apt upgrade -y

echo ""
echo "🟢 Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo ""
echo "✅ Verificando instalación..."
echo "Versión de Node.js:"
node --version
echo "Versión de npm:"
npm --version

echo ""
echo "🎉 ¡Node.js instalado correctamente!"
echo ""
echo "Próximos pasos:"
echo "1. Instalar Git (si no está instalado): apt install -y git"
echo "2. Clonar tu repositorio de GitHub"
echo "3. Instalar dependencias del proyecto"
