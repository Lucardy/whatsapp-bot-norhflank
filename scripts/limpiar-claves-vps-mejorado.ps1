# Script para mostrar comandos mejorados para limpiar claves duplicadas en el VPS
# Ejecuta: powershell -ExecutionPolicy Bypass -File scripts\limpiar-claves-vps-mejorado.ps1

$sshDir = "$env:USERPROFILE\.ssh"
$publicKeyPath = "$sshDir\id_ed25519_vps.pub"

if (-not (Test-Path $publicKeyPath)) {
    Write-Host "Error: No se encuentra la clave publica" -ForegroundColor Red
    exit 1
}

$publicKey = Get-Content $publicKeyPath -Raw
$publicKey = $publicKey.Trim()
$publicKeyHash = $publicKey.Substring($publicKey.IndexOf(" ") + 1, 20)

Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "LIMPIEZA MEJORADA DE CLAVES EN EL VPS" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Este proceso:" -ForegroundColor White
Write-Host "1. Separa claves que estan en la misma linea" -ForegroundColor Gray
Write-Host "2. Elimina duplicados" -ForegroundColor Gray
Write-Host "3. Mantiene todas las claves unicas" -ForegroundColor Gray
Write-Host ""
Write-Host "PASO 1: Hacer backup" -ForegroundColor Cyan
Write-Host "   cp ~/.ssh/authorized_keys ~/.ssh/authorized_keys.backup2" -ForegroundColor White
Write-Host ""
Write-Host "PASO 2: Separar claves en lineas diferentes y limpiar duplicados" -ForegroundColor Cyan
Write-Host "   awk '{for(i=1;i<=NF;i++) if($i ~ /^(ssh-|ecdsa-|sk-)/) print $i\" \"$(i+1)\" \"$(i+2)}' ~/.ssh/authorized_keys | sort | uniq > ~/.ssh/authorized_keys.tmp" -ForegroundColor White
Write-Host "   mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "PASO 3: Verificar resultado" -ForegroundColor Cyan
Write-Host "   cat ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "METODO ALTERNATIVO (mas simple, manual):" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Si el metodo automatico no funciona, puedes:" -ForegroundColor White
Write-Host ""
Write-Host "1. Editar el archivo manualmente:" -ForegroundColor Cyan
Write-Host "   nano ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host ""
Write-Host "2. Buscar y eliminar:" -ForegroundColor Cyan
Write-Host "   - La clave antigua: IJ/6jjInFNZqu97sD62tHO+XBVZwlvIEyD67UFaMw1h2" -ForegroundColor White
Write-Host "   - La linea que tiene dos claves juntas (la que termina en #hostinger-managed-keyssh-ed25519)" -ForegroundColor White
Write-Host ""
Write-Host "3. Dejar solo estas claves:" -ForegroundColor Cyan
Write-Host "   - github-actions-deploy" -ForegroundColor White
Write-Host "   - Tu clave nueva: IKdHtNhr7HRvSYhDCIf2TA" -ForegroundColor White
Write-Host "   - Las claves hostinger-managed-key (si las necesitas)" -ForegroundColor White
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "COMANDO COMPLETO (metodo simple):" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "cp ~/.ssh/authorized_keys ~/.ssh/authorized_keys.backup2" -ForegroundColor Green
Write-Host "grep -v 'IJ/6jjInFNZqu97sD62tHO' ~/.ssh/authorized_keys | grep -v '#hostinger-managed-keyssh-ed25519' | sed 's/#hostinger-managed-keyssh-ed25519.*//' > ~/.ssh/authorized_keys.tmp && mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Green
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "TU CLAVE PUBLICA (debe quedar solo esta):" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host $publicKey -ForegroundColor Cyan
Write-Host ""
Write-Host "Identificador: IKdHtNhr7HRvSYhDCIf2TA" -ForegroundColor Gray
Write-Host ""
