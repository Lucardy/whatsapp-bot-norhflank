# Script para configurar PostgreSQL en el puerto 5432
# Ejecutar como administrador

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configurando PostgreSQL en puerto 5432" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si estamos ejecutando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Este script requiere permisos de administrador" -ForegroundColor Yellow
    Write-Host "Ejecuta PowerShell como administrador" -ForegroundColor Yellow
    exit 1
}

Write-Host "Configurando puerto: 5432" -ForegroundColor Green
Write-Host ""

# Buscar PostgreSQL
$postgresPath = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1

if (-not $postgresPath) {
    Write-Host "No se encontro PostgreSQL instalado" -ForegroundColor Red
    exit 1
}

Write-Host "PostgreSQL encontrado en: $($postgresPath.FullName)" -ForegroundColor Green
Write-Host ""

# Buscar archivo postgresql.conf
$confPath = Join-Path $postgresPath.FullName "data\postgresql.conf"

if (-not (Test-Path $confPath)) {
    Write-Host "No se encontro postgresql.conf en: $confPath" -ForegroundColor Red
    exit 1
}

Write-Host "Archivo de configuracion: $confPath" -ForegroundColor Green
Write-Host ""

# Hacer backup del archivo
$backupPath = "$confPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
Copy-Item $confPath $backupPath
Write-Host "Backup creado: $backupPath" -ForegroundColor Green
Write-Host ""

# Leer y modificar el archivo
$content = Get-Content $confPath -Raw

# Buscar y reemplazar el puerto
if ($content -match "port\s*=\s*\d+") {
    $content = $content -replace "port\s*=\s*\d+", "port = 5432"
    Write-Host "Puerto actualizado a 5432 en postgresql.conf" -ForegroundColor Green
} else {
    # Si no existe, agregarlo
    $content += "`nport = 5432`n"
    Write-Host "Puerto agregado (5432) a postgresql.conf" -ForegroundColor Green
}

# Guardar el archivo
Set-Content -Path $confPath -Value $content -NoNewline
Write-Host ""

# Reiniciar el servicio
$service = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue

if ($service) {
    Write-Host "Servicio encontrado: $($service.Name)" -ForegroundColor Green
    Write-Host "Reiniciando servicio..." -ForegroundColor Yellow
    
    try {
        Restart-Service -Name $service.Name -Force
        Write-Host "Servicio reiniciado exitosamente" -ForegroundColor Green
        Start-Sleep -Seconds 3
        
        # Verificar que el puerto esté escuchando
        $listening = netstat -ano | Select-String ":5432" | Select-String "LISTENING"
        if ($listening) {
            Write-Host "✅ PostgreSQL esta escuchando en el puerto 5432" -ForegroundColor Green
        } else {
            Write-Host "⚠️ El puerto 5432 no esta escuchando. Verifica los logs de PostgreSQL." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error reiniciando servicio: $_" -ForegroundColor Red
        Write-Host "Reinicia manualmente el servicio de PostgreSQL desde Services" -ForegroundColor Yellow
    }
} else {
    Write-Host "No se encontro el servicio postgresql-x64-18" -ForegroundColor Yellow
    Write-Host "Reinicia manualmente el servicio desde Services (services.msc)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuracion completada" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PostgreSQL ahora esta configurado en el puerto 5432" -ForegroundColor Green
Write-Host ""
