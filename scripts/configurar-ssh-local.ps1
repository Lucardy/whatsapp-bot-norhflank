# Script para configurar SSH desde tu máquina local al VPS
# Ejecuta: powershell -ExecutionPolicy Bypass -File scripts\configurar-ssh-local.ps1

Write-Host "Configurando SSH para conectarte al VPS sin contrasena..." -ForegroundColor Green
Write-Host ""

$sshDir = "$env:USERPROFILE\.ssh"
$keyPath = "$sshDir\id_ed25519_vps"
$publicKeyPath = "$sshDir\id_ed25519_vps.pub"
$configPath = "$sshDir\config"

# Crear directorio .ssh si no existe
if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir | Out-Null
    Write-Host "Directorio .ssh creado" -ForegroundColor Green
}

# Generar clave SSH si no existe
if (-not (Test-Path $keyPath)) {
    Write-Host "Generando clave SSH..." -ForegroundColor Yellow
    Write-Host "Generando clave sin passphrase..." -ForegroundColor Yellow
    
    # Método alternativo: ejecutar sin -N y usar echo para simular Enter
    # PowerShell no maneja bien -N con string vacío, así que usamos el método interactivo
    Write-Host "Presiona Enter dos veces cuando te pida la passphrase (déjala vacía)" -ForegroundColor Yellow
    $process = Start-Process -FilePath "ssh-keygen" -ArgumentList "-t", "ed25519", "-C", "vps-whatsapp", "-f", $keyPath -NoNewWindow -Wait -PassThru
    if ($process.ExitCode -eq 0 -and (Test-Path $keyPath)) {
        Write-Host "Clave SSH generada exitosamente" -ForegroundColor Green
    } else {
        Write-Host "Error: No se pudo generar la clave SSH" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Ya existe una clave SSH en: $keyPath" -ForegroundColor Yellow
    Write-Host "Quieres generar una nueva? (s/n)" -ForegroundColor Yellow
    $respuesta = Read-Host
    if ($respuesta -eq "s" -or $respuesta -eq "S") {
        Write-Host "Eliminando clave antigua..." -ForegroundColor Yellow
        Remove-Item $keyPath -Force -ErrorAction SilentlyContinue
        Remove-Item $publicKeyPath -Force -ErrorAction SilentlyContinue
        
        Write-Host "Generando nueva clave SSH..." -ForegroundColor Yellow
        Write-Host "Presiona Enter dos veces cuando te pida la passphrase (déjala vacía)" -ForegroundColor Yellow
        $process = Start-Process -FilePath "ssh-keygen" -ArgumentList "-t", "ed25519", "-C", "vps-whatsapp", "-f", $keyPath -NoNewWindow -Wait -PassThru
        if ($process.ExitCode -eq 0 -and (Test-Path $keyPath)) {
            Write-Host "Nueva clave SSH generada exitosamente" -ForegroundColor Green
        } else {
            Write-Host "Error al generar la nueva clave SSH" -ForegroundColor Red
            exit 1
        }
    }
}

# Leer la clave pública
if (Test-Path $publicKeyPath) {
    $publicKey = Get-Content $publicKeyPath
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host "CLAVE PUBLICA (copiala completa):" -ForegroundColor Yellow
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host $publicKey -ForegroundColor White
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host "INSTRUCCIONES:" -ForegroundColor Yellow
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Copia la CLAVE PUBLICA de arriba" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Conectate al VPS (usa la contraseña si es necesario):" -ForegroundColor White
    Write-Host "   ssh root@89.117.33.122" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Una vez conectado al VPS, ejecuta estos comandos:" -ForegroundColor White
    Write-Host "   mkdir -p ~/.ssh" -ForegroundColor Cyan
    Write-Host "   chmod 700 ~/.ssh" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. Agrega tu clave pública (copia y pega este comando completo):" -ForegroundColor White
    Write-Host "   echo '$publicKey' >> ~/.ssh/authorized_keys" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   O manualmente:" -ForegroundColor Gray
    Write-Host "   nano ~/.ssh/authorized_keys" -ForegroundColor Gray
    Write-Host "   (Pega la clave pública y guarda con Ctrl+X, luego Y, luego Enter)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Ajusta los permisos:" -ForegroundColor White
    Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Cyan
    Write-Host ""
    
    # Configurar SSH config
    $configEntry = "Host vps-whatsapp`n    HostName 89.117.33.122`n    User root`n    IdentityFile $keyPath`n    IdentitiesOnly yes`n`n"
    
    if (Test-Path $configPath) {
        $existingConfig = Get-Content $configPath -Raw
        if ($existingConfig -notmatch "vps-whatsapp") {
            Add-Content -Path $configPath -Value $configEntry
            Write-Host "Configuracion SSH agregada a config" -ForegroundColor Green
        } else {
            Write-Host "La configuracion para vps-whatsapp ya existe en config" -ForegroundColor Yellow
        }
    } else {
        Set-Content -Path $configPath -Value $configEntry
        Write-Host "Archivo config creado" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Configuracion completada!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Después de agregar la clave en el VPS, prueba con:" -ForegroundColor White
    Write-Host "ssh vps-whatsapp" -ForegroundColor Cyan
} else {
    Write-Host "Error: No se pudo generar la clave SSH" -ForegroundColor Red
}
