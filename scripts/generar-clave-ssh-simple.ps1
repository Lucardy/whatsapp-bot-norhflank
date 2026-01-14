# Script simple para generar clave SSH
$sshDir = "$env:USERPROFILE\.ssh"
$keyPath = "$sshDir\id_ed25519_vps"

# Crear directorio si no existe
if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir | Out-Null
}

# Generar clave si no existe
if (-not (Test-Path $keyPath)) {
    Write-Host "Generando clave SSH..." -ForegroundColor Yellow
    # Usar -q para modo silencioso y omitir -N para que pregunte interactivamente
    # Pero como no podemos interactuar, usamos un workaround
    $null = echo y | ssh-keygen -t ed25519 -C "vps-whatsapp" -f $keyPath -q -N [string]::Empty 2>&1
}

# Mostrar clave pública si existe
if (Test-Path "$keyPath.pub") {
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host "CLAVE PUBLICA:" -ForegroundColor Yellow
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host ""
    Get-Content "$keyPath.pub"
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Yellow
} else {
    Write-Host "Error: No se pudo generar la clave" -ForegroundColor Red
}
