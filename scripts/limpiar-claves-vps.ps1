# Script para mostrar comandos para limpiar claves duplicadas en el VPS
# Ejecuta: powershell -ExecutionPolicy Bypass -File scripts\limpiar-claves-vps.ps1

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
Write-Host "LIMPIEZA DE CLAVES DUPLICADAS EN EL VPS" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Este proceso eliminara claves duplicadas manteniendo solo una copia de cada una." -ForegroundColor White
Write-Host ""
Write-Host "PASO 1: Hacer backup del archivo actual (IMPORTANTE)" -ForegroundColor Cyan
Write-Host "   cp ~/.ssh/authorized_keys ~/.ssh/authorized_keys.backup" -ForegroundColor White
Write-Host ""
Write-Host "PASO 2: Ver el contenido actual (para verificar)" -ForegroundColor Cyan
Write-Host "   cat ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "PASO 3: Limpiar duplicados (mantiene todas las claves unicas)" -ForegroundColor Cyan
Write-Host "   sort ~/.ssh/authorized_keys | uniq > ~/.ssh/authorized_keys.tmp" -ForegroundColor White
Write-Host "   mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "PASO 4: Verificar el resultado" -ForegroundColor Cyan
Write-Host "   cat ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "PASO 5: Verificar que tu clave sigue ahi" -ForegroundColor Cyan
Write-Host "   grep 'vps-whatsapp' ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "COMANDO COMPLETO (copia todo esto):" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "cp ~/.ssh/authorized_keys ~/.ssh/authorized_keys.backup && sort ~/.ssh/authorized_keys | uniq > ~/.ssh/authorized_keys.tmp && mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'Limpieza completada' && cat ~/.ssh/authorized_keys" -ForegroundColor Green
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "SI ALGO SALE MAL (restaurar backup):" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "cp ~/.ssh/authorized_keys.backup ~/.ssh/authorized_keys" -ForegroundColor Red
Write-Host "chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Red
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "TU CLAVE PUBLICA (debe aparecer una sola vez):" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host $publicKey -ForegroundColor Cyan
Write-Host ""
