# Script alternativo para crear tunel SSH con contraseña
# SOLO USAR SI NO PUEDES CONFIGURAR CLAVES SSH
# Ejecuta: powershell -ExecutionPolicy Bypass -File scripts\tunel-ssh-postgres-con-password.ps1

param(
    [string]$Password = "vL3+3)kz)T7(55Vs@gO@",
    [string]$VpsHost = "89.117.33.122",
    [string]$VpsUser = "root",
    [int]$LocalPort = 5433,
    [int]$RemotePort = 5432
)

Write-Host "Creando tunel SSH con contraseña..." -ForegroundColor Yellow
Write-Host "ADVERTENCIA: Este metodo es menos seguro" -ForegroundColor Red
Write-Host ""

# Verificar si sshpass está disponible
$sshpassAvailable = Get-Command sshpass -ErrorAction SilentlyContinue

if ($sshpassAvailable) {
    Write-Host "Usando sshpass..." -ForegroundColor Green
    $sshCommand = "sshpass -p `"$Password`" ssh -N -L ${LocalPort}:localhost:${RemotePort} ${VpsUser}@${VpsHost}"
    
    Write-Host "Ejecutando: sshpass -p '***' ssh -N -L ${LocalPort}:localhost:${RemotePort} ${VpsUser}@${VpsHost}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "El tunel se ejecutara en esta terminal." -ForegroundColor Yellow
    Write-Host "Para cerrarlo, presiona Ctrl+C" -ForegroundColor Yellow
    Write-Host ""
    
    Invoke-Expression $sshCommand
} else {
    Write-Host "sshpass no esta instalado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Yellow
    Write-Host "1. Instalar sshpass (recomendado para Windows con WSL)" -ForegroundColor White
    Write-Host "2. Usar el metodo manual (ver abajo)" -ForegroundColor White
    Write-Host "3. Configurar SSH con claves (mas seguro)" -ForegroundColor White
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host "METODO MANUAL:" -ForegroundColor Yellow
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ejecuta este comando y cuando te pida la contraseña, ingresa:" -ForegroundColor White
    Write-Host "$Password" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Comando:" -ForegroundColor White
    Write-Host "ssh -N -L ${LocalPort}:localhost:${RemotePort} ${VpsUser}@${VpsHost}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host "CONFIGURACION PARA .env.local:" -ForegroundColor Yellow
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "DATABASE_URL=postgresql://usuario:password@localhost:$LocalPort/whatsapp_bot?schema=public" -ForegroundColor Cyan
}
