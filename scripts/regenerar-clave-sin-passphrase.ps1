# Regenerar clave SSH sin passphrase
$keyPath = Join-Path $env:USERPROFILE ".ssh\id_ed25519_vps"

# Eliminar clave anterior si existe
if (Test-Path $keyPath) {
    Remove-Item $keyPath -Force -ErrorAction SilentlyContinue
    Remove-Item "$keyPath.pub" -Force -ErrorAction SilentlyContinue
    Write-Host "Clave anterior eliminada" -ForegroundColor Yellow
}

# Generar nueva clave sin passphrase (omitir -N para que no pida passphrase)
Write-Host "Generando nueva clave sin passphrase..." -ForegroundColor Green
Write-Host "NOTA: Si te pregunta por passphrase, presiona Enter dos veces" -ForegroundColor Yellow

# Usar el método que funcionó antes
ssh-keygen -t ed25519 -C "vps-whatsapp" -f $keyPath -q

if (Test-Path "$keyPath.pub") {
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host "NUEVA CLAVE PUBLICA:" -ForegroundColor Yellow
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host ""
    $publicKey = Get-Content "$keyPath.pub"
    Write-Host $publicKey -ForegroundColor White
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "IMPORTANTE: Agrega esta nueva clave al VPS" -ForegroundColor Red
    Write-Host ""
    Write-Host "Ejecuta en el VPS:" -ForegroundColor White
    Write-Host "echo '$publicKey' >> ~/.ssh/authorized_keys" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "Error: No se pudo generar la clave" -ForegroundColor Red
}
