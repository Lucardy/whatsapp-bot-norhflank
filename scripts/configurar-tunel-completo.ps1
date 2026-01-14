# Script para configurar el tunel SSH y .env.local completo
# Ejecuta: powershell -ExecutionPolicy Bypass -File scripts\configurar-tunel-completo.ps1

Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "CONFIGURACION COMPLETA: TUNEL SSH + BASE DE DATOS" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$envLocalPath = Join-Path $projectRoot ".env.local"

Write-Host "PASO 1: Obtener credenciales de la base de datos del VPS" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta estos comandos en el VPS:" -ForegroundColor White
Write-Host "   ssh vps-whatsapp" -ForegroundColor Gray
Write-Host "   cat ~/whatsapp-bot-norhflank/.env | grep DATABASE_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "O si esta en otra ubicacion:" -ForegroundColor White
Write-Host "   find ~ -name '.env' -type f 2>/dev/null | head -5" -ForegroundColor Gray
Write-Host ""

Write-Host "PASO 2: Crear el tunel SSH" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta en PowerShell:" -ForegroundColor White
Write-Host "   npm run tunnel:start" -ForegroundColor Green
Write-Host ""
Write-Host "O directamente:" -ForegroundColor White
Write-Host "   powershell -ExecutionPolicy Bypass -File scripts\tunel-ssh-postgres.ps1" -ForegroundColor Green
Write-Host ""

Write-Host "PASO 3: Verificar que el tunel esta corriendo" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta:" -ForegroundColor White
Write-Host "   npm run tunnel:status" -ForegroundColor Green
Write-Host ""

Write-Host "PASO 4: Crear archivo .env.local" -ForegroundColor Cyan
Write-Host ""

# Verificar si ya existe .env.local
if (Test-Path $envLocalPath) {
    Write-Host "   [ADVERTENCIA] Ya existe un archivo .env.local" -ForegroundColor Yellow
    Write-Host "   Ubicacion: $envLocalPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Quieres sobrescribirlo? (s/n)" -ForegroundColor Yellow
    $respuesta = Read-Host
    if ($respuesta -ne "s" -and $respuesta -ne "S") {
        Write-Host "   Operacion cancelada" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "   Ingresa las credenciales de la base de datos:" -ForegroundColor White
Write-Host ""

# Solicitar datos
$dbUser = Read-Host "   Usuario de PostgreSQL (ej: whatsapp_user o postgres)"
$dbPassword = Read-Host "   Contrasena de PostgreSQL" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)
$dbName = Read-Host "   Nombre de la base de datos (ej: whatsapp_bot)"

Write-Host ""
Write-Host "   Creando archivo .env.local..." -ForegroundColor Yellow

# Crear contenido del archivo
$envContent = @"
# ============================================
# CONFIGURACION LOCAL - BASE DE DATOS DEL VPS
# ============================================
# Este archivo sobrescribe las variables de .env
# Solo se usa cuando ejecutas el bot localmente
# NO se sube a GitHub (esta en .gitignore)
# ============================================

# ============================================
# DATABASE - CONEXION AL VPS VIA TUNEL SSH
# ============================================
# IMPORTANTE: El tunel SSH debe estar corriendo antes de usar esto
# Para iniciar el tunel: npm run tunnel:start
# Para verificar: npm run tunnel:status
# ============================================
DATABASE_URL=postgresql://${dbUser}:${dbPasswordPlain}@localhost:5433/${dbName}?schema=public

# ============================================
# SESSIONS
# ============================================
SESSION_BASE_DIR=./sessions
FORCE_LOCK_RESET=false

# ============================================
# SERVER
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# JWT
# ============================================
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# ============================================
# PAYMENTS - MERCADO PAGO
# ============================================
MERCADOPAGO_ACCESS_TOKEN=
WEBHOOK_URL=
FRONTEND_URL=
STRIPE_SECRET_KEY=

# ============================================
# ADMIN
# ============================================
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme
"@

# Escribir archivo
Set-Content -Path $envLocalPath -Value $envContent -Encoding UTF8

Write-Host "   [OK] Archivo .env.local creado en: $envLocalPath" -ForegroundColor Green
Write-Host ""

Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "RESUMEN" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Inicia el tunel SSH:" -ForegroundColor White
Write-Host "   npm run tunnel:start" -ForegroundColor Green
Write-Host ""
Write-Host "2. Verifica que esta corriendo:" -ForegroundColor White
Write-Host "   npm run tunnel:status" -ForegroundColor Green
Write-Host ""
Write-Host "3. Ejecuta el bot:" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor Green
Write-Host ""
Write-Host "4. Para detener el tunel cuando termines:" -ForegroundColor White
Write-Host "   npm run tunnel:stop" -ForegroundColor Green
Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "NOTAS IMPORTANTES" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "- El tunel SSH debe estar corriendo ANTES de ejecutar npm start" -ForegroundColor White
Write-Host "- El archivo .env.local esta en .gitignore (no se sube a GitHub)" -ForegroundColor White
Write-Host "- Si cambias las credenciales, edita .env.local manualmente" -ForegroundColor White
Write-Host ""
