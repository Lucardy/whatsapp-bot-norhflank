# Script para generar claves SSH para GitHub Actions
# Este script genera las claves y muestra las instrucciones

Write-Host "🔑 Generando claves SSH para GitHub Actions..." -ForegroundColor Green
Write-Host ""

# Verificar si ssh-keygen está disponible
if (-not (Get-Command ssh-keygen -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: ssh-keygen no está disponible en Windows PowerShell" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solución: Ejecuta estos comandos en el VPS (terminal web):" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "ssh-keygen -t ed25519 -C `"github-actions-deploy`" -f ~/.ssh/github_actions -N `"`"" -ForegroundColor Cyan
    Write-Host "cat ~/.ssh/github_actions.pub" -ForegroundColor Cyan
    Write-Host "cat ~/.ssh/github_actions" -ForegroundColor Cyan
    exit 1
}

# Directorio para las claves
$sshDir = "$env:USERPROFILE\.ssh"
if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir | Out-Null
}

$privateKeyPath = "$sshDir\github_actions"
$publicKeyPath = "$sshDir\github_actions.pub"

# Generar clave SSH
Write-Host "Generando clave SSH..." -ForegroundColor Yellow
ssh-keygen -t ed25519 -C "github-actions-deploy" -f $privateKeyPath -N '""'

if (Test-Path $publicKeyPath) {
    Write-Host ""
    Write-Host "✅ Clave SSH generada correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "CLAVE PÚBLICA (para agregar al VPS):" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host ""
    $publicKey = Get-Content $publicKeyPath
    Write-Host $publicKey -ForegroundColor White
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "CLAVE PRIVADA (para GitHub Secrets):" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host ""
    $privateKey = Get-Content $privateKeyPath
    Write-Host $privateKey -ForegroundColor White
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "INSTRUCCIONES:" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Copia la CLAVE PÚBLICA de arriba" -ForegroundColor White
    Write-Host "2. En el VPS (terminal web), ejecuta:" -ForegroundColor White
    Write-Host "   cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys" -ForegroundColor Cyan
    Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Copia la CLAVE PRIVADA de arriba" -ForegroundColor White
    Write-Host "4. Ve a GitHub → Settings → Secrets → Actions" -ForegroundColor White
    Write-Host "5. Crea el secret VPS_SSH_KEY con la clave privada" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Error al generar la clave SSH" -ForegroundColor Red
}
