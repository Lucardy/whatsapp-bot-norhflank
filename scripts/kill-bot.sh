#!/bin/bash
# Script para cerrar todas las instancias del bot de WhatsApp (Linux/Mac)

echo "🔍 Buscando procesos del bot..."

# Buscar procesos de Node.js que estén ejecutando el bot
PIDS=$(ps aux | grep "node.*whatsapp-bot" | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
  echo "✅ No se encontraron procesos del bot corriendo."
else
  echo "📋 Procesos encontrados:"
  ps aux | grep "node.*whatsapp-bot" | grep -v grep
  
  read -p "¿Cerrar estos procesos? (S/N): " confirm
  if [ "$confirm" = "S" ] || [ "$confirm" = "s" ] || [ "$confirm" = "Y" ] || [ "$confirm" = "y" ]; then
    echo "$PIDS" | xargs kill -9
    echo "✅ Procesos cerrados."
  else
    echo "❌ Operación cancelada."
  fi
fi

