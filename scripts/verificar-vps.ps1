# Script para mostrar comandos de verificacion en el VPS
# Ejecuta: powershell -ExecutionPolicy Bypass -File scripts\verificar-vps.ps1

$sshDir = "$env:USERPROFILE\.ssh"
$publicKeyPath = "$sshDir\id_ed25519_vps.pub"

if (-not (Test-Path $publicKeyPath)) {
    Write-Host "Error: No se encuentra la clave publica" -ForegroundColor Red
    exit 1
}

$publicKey = Get-Content $publicKeyPath -Raw
$publicKey = $publicKey.Trim()

Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "COMANDOS DE VERIFICACION PARA EL VPS" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ejecuta estos comandos en la terminal del VPS para verificar:" -ForegroundColor White
Write-Host ""
Write-Host "1. Verificar que existe el directorio .ssh:" -ForegroundColor Cyan
Write-Host "   ls -la ~/.ssh" -ForegroundColor White
Write-Host ""
Write-Host "2. Verificar que existe authorized_keys:" -ForegroundColor Cyan
Write-Host "   cat ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "3. Verificar permisos:" -ForegroundColor Cyan
Write-Host "   ls -la ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "4. Verificar que tu clave esta en el archivo:" -ForegroundColor Cyan
Write-Host "   grep 'vps-whatsapp' ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "SI LA CLAVE NO ESTA, EJECUTA ESTO EN EL VPS:" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "echo '$publicKey' >> ~/.ssh/authorized_keys" -ForegroundColor Green
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "SI HAY PROBLEMAS DE PERMISOS, EJECUTA:" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "chmod 700 ~/.ssh" -ForegroundColor Green
Write-Host "chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Green
Write-Host ""
