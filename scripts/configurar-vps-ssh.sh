#!/bin/bash
# Script para configurar SSH en el VPS
# Ejecuta este script en el terminal web del VPS

echo "🔑 Configurando SSH para GitHub Actions..."
echo ""

# Generar clave SSH
echo "Generando clave SSH..."
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions -N ""

if [ -f ~/.ssh/github_actions.pub ]; then
    echo ""
    echo "✅ Clave SSH generada correctamente!"
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "CLAVE PÚBLICA (agregar al VPS):"
    echo "═══════════════════════════════════════════════════════"
    cat ~/.ssh/github_actions.pub
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "Agregando clave al VPS..."
    echo "═══════════════════════════════════════════════════════"
    
    # Agregar al authorized_keys
    cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
    chmod 700 ~/.ssh
    
    echo "✅ Clave agregada al VPS"
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "CLAVE PRIVADA (para GitHub Secrets - VPS_SSH_KEY):"
    echo "═══════════════════════════════════════════════════════"
    cat ~/.ssh/github_actions
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "✅ Configuración completada!"
    echo ""
    echo "Próximos pasos:"
    echo "1. Copia la CLAVE PRIVADA de arriba"
    echo "2. Ve a GitHub → Settings → Secrets → Actions"
    echo "3. Crea estos secrets:"
    echo "   - VPS_HOST = 89.117.33.122"
    echo "   - VPS_USER = root"
    echo "   - VPS_SSH_KEY = (pega la clave privada)"
    echo "   - VPS_PORT = 22 (opcional)"
    echo ""
else
    echo "❌ Error al generar la clave SSH"
    exit 1
fi
