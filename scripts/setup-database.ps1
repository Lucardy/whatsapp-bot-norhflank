# Script para configurar la base de datos después de instalar PostgreSQL
param(
    [string]$Password = "",
    [string]$Database = "whatsapp_bot",
    [string]$User = "postgres",
    [string]$Host = "localhost",
    [string]$Port = "5432"
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuración de Base de Datos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Si no se proporcionó contraseña, pedirla
if ([string]::IsNullOrEmpty($Password)) {
    Write-Host "Necesitamos la contraseña del usuario postgres" -ForegroundColor Yellow
    Write-Host "(La que elegiste durante la instalación de PostgreSQL)" -ForegroundColor Gray
    $securePassword = Read-Host "Ingresa la contraseña" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# Verificar si psql está disponible
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    # Intentar encontrar psql en ubicaciones comunes
    $commonPaths = @(
        "C:\Program Files\PostgreSQL\15\bin\psql.exe",
        "C:\Program Files\PostgreSQL\14\bin\psql.exe",
        "C:\Program Files\PostgreSQL\13\bin\psql.exe",
        "C:\Program Files (x86)\PostgreSQL\15\bin\psql.exe",
        "C:\Program Files (x86)\PostgreSQL\14\bin\psql.exe"
    )
    
    $psqlFound = $false
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $env:Path += ";$(Split-Path $path)"
            $psqlFound = $true
            Write-Host "✅ PostgreSQL encontrado en: $path" -ForegroundColor Green
            break
        }
    }
    
    if (-not $psqlFound) {
        Write-Host "❌ No se encontró psql. Asegúrate de que PostgreSQL esté instalado." -ForegroundColor Red
        Write-Host ""
        Write-Host "Puedes instalarlo desde: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
        Write-Host "O ver la guía en: GUIA_INSTALACION.md" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "Creando base de datos '$Database'..." -ForegroundColor Yellow

# Crear la base de datos
$env:PGPASSWORD = $Password
try {
    $createDbCommand = "CREATE DATABASE $Database;"
    $createDbResult = echo $createDbCommand | & psql -U $User -h $Host -p $Port -d postgres 2>&1 | Out-String
    
    if ($LASTEXITCODE -eq 0 -or $createDbResult -match "already exists" -or $createDbResult -match "ERROR.*already exists") {
        Write-Host "✅ Base de datos '$Database' lista" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Resultado: $createDbResult" -ForegroundColor Yellow
        # Intentar verificar si existe
        $checkDb = echo "SELECT 1 FROM pg_database WHERE datname='$Database';" | & psql -U $User -h $Host -p $Port -d postgres -t 2>&1 | Out-String
        if ($checkDb -match "1") {
            Write-Host "✅ Base de datos '$Database' ya existe" -ForegroundColor Green
        } else {
            Write-Host "❌ Error creando base de datos." -ForegroundColor Red
            Write-Host "Verifica:" -ForegroundColor Yellow
            Write-Host "  - Que la contraseña sea correcta" -ForegroundColor Yellow
            Write-Host "  - Que PostgreSQL esté corriendo (verifica en Servicios de Windows)" -ForegroundColor Yellow
            exit 1
        }
    }
} catch {
    Write-Host "❌ Error ejecutando psql: $_" -ForegroundColor Red
    Write-Host "Asegúrate de que PostgreSQL esté instalado y corriendo" -ForegroundColor Yellow
    exit 1
}

# Crear archivo .env
Write-Host ""
Write-Host "Creando archivo .env..." -ForegroundColor Yellow

# Escapar caracteres especiales en la contraseña para la URL
# Solo los más comunes que pueden causar problemas
$escapedPassword = $Password
$escapedPassword = $escapedPassword -replace '%', '%25'
$escapedPassword = $escapedPassword -replace ':', '%3A'
$escapedPassword = $escapedPassword -replace '@', '%40'
$escapedPassword = $escapedPassword -replace '/', '%2F'
$escapedPassword = $escapedPassword -replace '\?', '%3F'
$escapedPassword = $escapedPassword -replace '#', '%23'
$escapedPassword = $escapedPassword -replace '\[', '%5B'
$escapedPassword = $escapedPassword -replace '\]', '%5D'
$escapedPassword = $escapedPassword -replace ' ', '%20'

$envContent = @"
# Base de datos PostgreSQL
DATABASE_URL="postgresql://$User`:$escapedPassword@$Host`:$Port/$Database?schema=public"

# Puerto del servidor HTTP
PORT=3000

# Directorio base para sesiones de WhatsApp
SESSION_BASE_DIR=./sessions
"@

$envPath = Join-Path (Get-Location) ".env"
$envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force

Write-Host "✅ Archivo .env creado en: $envPath" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuración completada!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Ejecuta: npm run db:migrate" -ForegroundColor White
Write-Host "2. Ejecuta: npm run db:seed" -ForegroundColor White
Write-Host "3. Ejecuta: npm start" -ForegroundColor White
Write-Host ""
