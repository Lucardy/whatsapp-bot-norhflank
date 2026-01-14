# Script para diagnosticar problemas de conexion SSH
# Ejecuta: powershell -ExecutionPolicy Bypass -File scripts\diagnosticar-ssh.ps1

param(
    [string]$VpsHost = "89.117.33.122",
    [string]$VpsUser = "root"
)

Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "DIAGNOSTICO DE CONEXION SSH" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""

$sshDir = "$env:USERPROFILE\.ssh"
$keyPath = "$sshDir\id_ed25519_vps"
$publicKeyPath = "$sshDir\id_ed25519_vps.pub"
$configPath = "$sshDir\config"

# 1. Verificar que existe la clave privada
Write-Host "1. Verificando clave SSH..." -ForegroundColor Cyan
if (Test-Path $keyPath) {
    Write-Host "   [OK] Clave privada encontrada: $keyPath" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Clave privada NO encontrada" -ForegroundColor Red
    Write-Host "   Ejecuta: scripts\configurar-ssh-local.ps1" -ForegroundColor Yellow
    exit 1
}

# 2. Verificar que existe la clave publica
if (Test-Path $publicKeyPath) {
    Write-Host "   [OK] Clave publica encontrada: $publicKeyPath" -ForegroundColor Green
    $publicKey = Get-Content $publicKeyPath
    $keyPreview = if ($publicKey.Length -gt 50) { $publicKey.Substring(0, 50) + "..." } else { $publicKey }
    Write-Host "   Clave: $keyPreview" -ForegroundColor Gray
} else {
    Write-Host "   [ERROR] Clave publica NO encontrada" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. Verificar configuracion SSH
Write-Host "2. Verificando configuracion SSH..." -ForegroundColor Cyan
if (Test-Path $configPath) {
    Write-Host "   [OK] Archivo config encontrado" -ForegroundColor Green
    $configContent = Get-Content $configPath -Raw
    if ($configContent -match "vps-whatsapp") {
        Write-Host "   [OK] Configuracion vps-whatsapp encontrada" -ForegroundColor Green
    } else {
        Write-Host "   [ADVERTENCIA] Configuracion vps-whatsapp NO encontrada" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [ADVERTENCIA] Archivo config NO encontrado" -ForegroundColor Yellow
}

Write-Host ""

# 4. Verificar conectividad basica
Write-Host "3. Verificando conectividad con el VPS..." -ForegroundColor Cyan
$ping = Test-Connection -ComputerName $VpsHost -Count 2 -Quiet -ErrorAction SilentlyContinue
if ($ping) {
    Write-Host "   [OK] El VPS responde al ping" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] El VPS NO responde al ping" -ForegroundColor Red
    Write-Host "   Verifica que la IP sea correcta: $VpsHost" -ForegroundColor Yellow
}

Write-Host ""

# 5. Verificar puerto SSH
Write-Host "4. Verificando puerto SSH (22)..." -ForegroundColor Cyan
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connect = $tcpClient.BeginConnect($VpsHost, 22, $null, $null)
    $wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)
    if ($wait) {
        $tcpClient.EndConnect($connect)
        Write-Host "   [OK] Puerto 22 esta abierto" -ForegroundColor Green
        $tcpClient.Close()
    } else {
        Write-Host "   [ERROR] Puerto 22 NO responde (timeout)" -ForegroundColor Red
    }
} catch {
    Write-Host "   [ERROR] No se puede conectar al puerto 22: $_" -ForegroundColor Red
}

Write-Host ""

# Mostrar informacion util
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "INFORMACION UTIL" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Clave publica que debes agregar al VPS:" -ForegroundColor White
Write-Host $publicKey -ForegroundColor Cyan
Write-Host ""
Write-Host "Si no puedes conectarte con contrasena, verifica:" -ForegroundColor White
Write-Host "1. Que la contrasena sea correcta" -ForegroundColor Gray
Write-Host "2. Que el usuario root permita login por contrasena" -ForegroundColor Gray
Write-Host "3. Que el servidor SSH este configurado para aceptar contrasenas" -ForegroundColor Gray
Write-Host ""
Write-Host "Para agregar la clave manualmente:" -ForegroundColor White
Write-Host "1. Conectate al VPS con otro metodo (panel web, otra clave, etc.)" -ForegroundColor Gray
Write-Host "2. Ejecuta estos comandos en el VPS:" -ForegroundColor Gray
Write-Host "   mkdir -p ~/.ssh" -ForegroundColor Cyan
Write-Host "   chmod 700 ~/.ssh" -ForegroundColor Cyan
$echoCommand = "   echo '" + $publicKey.Trim() + "' >> ~/.ssh/authorized_keys"
Write-Host $echoCommand -ForegroundColor Cyan
Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Prueba conectarte sin contrasena:" -ForegroundColor White
Write-Host "   ssh ${VpsUser}@${VpsHost}" -ForegroundColor Cyan
Write-Host ""
