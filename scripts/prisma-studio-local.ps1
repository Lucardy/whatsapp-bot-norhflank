# Script para ejecutar Prisma Studio usando .env.local
# Ejecuta: powershell -ExecutionPolicy Bypass -File scripts\prisma-studio-local.ps1

$projectRoot = Split-Path -Parent $PSScriptRoot
$envLocalPath = Join-Path $projectRoot ".env.local"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "PRISMA STUDIO - CONEXION AL VPS VIA TUNEL SSH" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""

# Verificar que el tunel SSH esta corriendo
Write-Host "Verificando tunel SSH..." -ForegroundColor Cyan
$tunnelRunning = $false
try {
    $connection = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        if ($process -and $process.ProcessName -eq "ssh") {
            $tunnelRunning = $true
            Write-Host "   [OK] Tunel SSH esta corriendo (PID: $($process.Id))" -ForegroundColor Green
        }
    }
} catch {
    # Ignorar errores
}

if (-not $tunnelRunning) {
    Write-Host "   [ADVERTENCIA] No se detecto el tunel SSH corriendo" -ForegroundColor Yellow
    Write-Host "   Ejecuta primero: npm run tunnel:start" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Quieres continuar de todas formas? (s/n)" -ForegroundColor Yellow
    $respuesta = Read-Host
    if ($respuesta -ne "s" -and $respuesta -ne "S") {
        Write-Host "   Operacion cancelada" -ForegroundColor Yellow
        exit 0
    }
}

# Verificar que existe .env.local
if (-not (Test-Path $envLocalPath)) {
    Write-Host "   [ERROR] No se encuentra .env.local" -ForegroundColor Red
    Write-Host "   Ubicacion esperada: $envLocalPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Crea el archivo .env.local con:" -ForegroundColor Yellow
    Write-Host "   DATABASE_URL=postgresql://usuario:password@localhost:5433/whatsapp_bot?schema=public" -ForegroundColor Cyan
    exit 1
}

Write-Host "   [OK] Archivo .env.local encontrado" -ForegroundColor Green
Write-Host ""

# Cargar variables de .env.local
Write-Host "Cargando variables de .env.local..." -ForegroundColor Cyan
$envVars = @{}
Get-Content $envLocalPath | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($key -and $value) {
            $envVars[$key] = $value
        }
    }
}

# Establecer DATABASE_URL en el entorno
if ($envVars.ContainsKey('DATABASE_URL')) {
    $env:DATABASE_URL = $envVars['DATABASE_URL']
    Write-Host "   [OK] DATABASE_URL configurada" -ForegroundColor Green
    Write-Host "   Conexion: $($envVars['DATABASE_URL'] -replace ':[^:@]+@', ':****@')" -ForegroundColor Gray
} else {
    Write-Host "   [ERROR] No se encuentra DATABASE_URL en .env.local" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "INICIANDO PRISMA STUDIO" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Prisma Studio se abrira en tu navegador" -ForegroundColor White
Write-Host "URL: http://localhost:5555" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para cerrar Prisma Studio, presiona Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Cambiar al directorio del proyecto
Set-Location $projectRoot

# Ejecutar Prisma Studio
npx prisma studio
