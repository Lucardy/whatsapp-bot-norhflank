# Script de instalación de PostgreSQL para Windows
# Este script te guiará a través de la instalación

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Instalación de PostgreSQL para Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Opciones de instalación:" -ForegroundColor Yellow
Write-Host "1. Descargar instalador oficial (Recomendado)" -ForegroundColor Green
Write-Host "2. Instalar con Chocolatey (si lo tienes)" -ForegroundColor Green
Write-Host "3. Usar Docker (si tienes Docker Desktop)" -ForegroundColor Green
Write-Host ""

$option = Read-Host "Elige una opción (1-3)"

switch ($option) {
    "1" {
        Write-Host ""
        Write-Host "Pasos para instalar PostgreSQL:" -ForegroundColor Yellow
        Write-Host "1. Abre tu navegador y ve a: https://www.postgresql.org/download/windows/" -ForegroundColor White
        Write-Host "2. Haz clic en 'Download the installer'" -ForegroundColor White
        Write-Host "3. Descarga el instalador (ejecutable .exe)" -ForegroundColor White
        Write-Host "4. Ejecuta el instalador y sigue las instrucciones:" -ForegroundColor White
        Write-Host "   - Port: 5432 (por defecto)" -ForegroundColor Cyan
        Write-Host "   - Superuser password: ELIGE UNA CONTRASEÑA SEGURA" -ForegroundColor Cyan
        Write-Host "   - Locale: Spanish, Argentina (o el que prefieras)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "IMPORTANTE: Anota la contraseña que elijas, la necesitarás para configurar DATABASE_URL" -ForegroundColor Red
        Write-Host ""
        Write-Host "Una vez instalado, presiona Enter para continuar..." -ForegroundColor Yellow
        Read-Host
    }
    "2" {
        Write-Host ""
        Write-Host "Instalando PostgreSQL con Chocolatey..." -ForegroundColor Yellow
        choco install postgresql --params '/Password:postgres' -y
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PostgreSQL instalado correctamente" -ForegroundColor Green
            Write-Host "Contraseña por defecto: postgres" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Error instalando PostgreSQL. Asegúrate de tener Chocolatey instalado." -ForegroundColor Red
            exit 1
        }
    }
    "3" {
        Write-Host ""
        Write-Host "Iniciando PostgreSQL con Docker..." -ForegroundColor Yellow
        docker run --name whatsapp-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=whatsapp_bot -p 5432:5432 -d postgres:14
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PostgreSQL iniciado en Docker" -ForegroundColor Green
            Write-Host "Contraseña: postgres" -ForegroundColor Yellow
            Write-Host "Base de datos: whatsapp_bot (ya creada)" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Error iniciando PostgreSQL en Docker. Asegúrate de tener Docker Desktop instalado y corriendo." -ForegroundColor Red
            exit 1
        }
    }
    default {
        Write-Host "Opción inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuración completada" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

