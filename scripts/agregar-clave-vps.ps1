# Script para agregar la clave pública SSH al VPS
# Ejecuta: powershell -ExecutionPolicy Bypass -File scripts\agregar-clave-vps.ps1

param(
    [string]$VpsHost = "89.117.33.122",
    [string]$VpsUser = "root"
)

Write-Host "Agregando clave pública SSH al VPS..." -ForegroundColor Green
Write-Host ""

$sshDir = "$env:USERPROFILE\.ssh"
$publicKeyPath = "$sshDir\id_ed25519_vps.pub"

# Verificar que existe la clave pública
if (-not (Test-Path $publicKeyPath)) {
    Write-Host "Error: No se encuentra la clave pública en: $publicKeyPath" -ForegroundColor Red
    Write-Host "Ejecuta primero: scripts\configurar-ssh-local.ps1" -ForegroundColor Yellow
    exit 1
}

$publicKey = Get-Content $publicKeyPath -Raw
$publicKey = $publicKey.Trim()

Write-Host "Clave pública encontrada:" -ForegroundColor Green
Write-Host $publicKey -ForegroundColor Gray
Write-Host ""

# Intentar usar ssh-copy-id si está disponible (más fácil)
Write-Host "Intentando agregar la clave automáticamente..." -ForegroundColor Yellow
Write-Host ""

# Verificar si ssh-copy-id está disponible
$sshCopyId = Get-Command ssh-copy-id -ErrorAction SilentlyContinue

if ($sshCopyId) {
    Write-Host "Usando ssh-copy-id..." -ForegroundColor Green
    Write-Host "Te pedirá la contraseña del VPS una vez" -ForegroundColor Yellow
    Write-Host ""
    
    $sshCopyIdCommand = "ssh-copy-id -i $publicKeyPath ${VpsUser}@${VpsHost}"
    Write-Host "Ejecutando: $sshCopyIdCommand" -ForegroundColor Gray
    Write-Host ""
    
    Invoke-Expression $sshCopyIdCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "¡Clave agregada exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Prueba conectarte sin contraseña:" -ForegroundColor Yellow
        Write-Host "ssh ${VpsUser}@${VpsHost}" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host ""
        Write-Host "ssh-copy-id falló. Usando método manual..." -ForegroundColor Yellow
        Write-Host ""
    }
}

# Método alternativo: agregar manualmente
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "MÉTODO MANUAL - Sigue estos pasos:" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Conéctate al VPS (te pedirá la contraseña):" -ForegroundColor White
Write-Host "   ssh ${VpsUser}@${VpsHost}" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Una vez conectado, ejecuta estos comandos:" -ForegroundColor White
Write-Host ""
Write-Host "   mkdir -p ~/.ssh" -ForegroundColor Cyan
Write-Host "   chmod 700 ~/.ssh" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Agrega tu clave pública (copia y pega este comando completo):" -ForegroundColor White
Write-Host ""
Write-Host "   echo '$publicKey' >> ~/.ssh/authorized_keys" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Ajusta los permisos:" -ForegroundColor White
Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Sal del VPS:" -ForegroundColor White
Write-Host "   exit" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Prueba conectarte sin contraseña:" -ForegroundColor White
Write-Host "   ssh ${VpsUser}@${VpsHost}" -ForegroundColor Cyan
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "CLAVE PÚBLICA (copia esto):" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host $publicKey -ForegroundColor White
Write-Host ""
