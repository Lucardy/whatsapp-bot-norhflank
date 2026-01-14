# Script para mostrar los comandos que debes ejecutar en el VPS
# Ejecuta: powershell -ExecutionPolicy Bypass -File scripts\mostrar-comandos-vps.ps1

$sshDir = "$env:USERPROFILE\.ssh"
$publicKeyPath = "$sshDir\id_ed25519_vps.pub"

if (-not (Test-Path $publicKeyPath)) {
    Write-Host "Error: No se encuentra la clave publica" -ForegroundColor Red
    Write-Host "Ejecuta primero: scripts\configurar-ssh-local.ps1" -ForegroundColor Yellow
    exit 1
}

$publicKey = Get-Content $publicKeyPath -Raw
$publicKey = $publicKey.Trim()

Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "COMANDOS PARA EJECUTAR EN EL VPS" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Copia y pega estos comandos UNO POR UNO en la terminal del VPS:" -ForegroundColor White
Write-Host ""
Write-Host "1. Crear directorio .ssh (si no existe):" -ForegroundColor Cyan
Write-Host "   mkdir -p ~/.ssh" -ForegroundColor White
Write-Host ""
Write-Host "2. Ajustar permisos del directorio:" -ForegroundColor Cyan
Write-Host "   chmod 700 ~/.ssh" -ForegroundColor White
Write-Host ""
Write-Host "3. Agregar tu clave publica:" -ForegroundColor Cyan
Write-Host "   echo '$publicKey' >> ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "4. Ajustar permisos del archivo:" -ForegroundColor Cyan
Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "COMANDO COMPLETO (copia todo esto):" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
$comandoCompleto = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$publicKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
Write-Host $comandoCompleto -ForegroundColor Green
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "CLAVE PUBLICA (por si necesitas copiarla manualmente):" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host $publicKey -ForegroundColor Cyan
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "DESPUES DE EJECUTAR LOS COMANDOS EN EL VPS:" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Prueba conectarte desde tu maquina local:" -ForegroundColor White
Write-Host "   ssh root@89.117.33.122" -ForegroundColor Cyan
Write-Host ""
Write-Host "O usando el alias:" -ForegroundColor White
Write-Host "   ssh vps-whatsapp" -ForegroundColor Cyan
Write-Host ""
