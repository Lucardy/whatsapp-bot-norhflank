# Script para crear un tunel SSH hacia PostgreSQL en el VPS
# Ejecuta: powershell -ExecutionPolicy Bypass -File scripts\tunel-ssh-postgres.ps1

param(
    [switch]$Stop,
    [switch]$Status,
    [string]$VpsHost = "89.117.33.122",
    [string]$VpsUser = "root",
    [int]$LocalPort = 5433,
    [int]$RemotePort = 5432
)

# Funcion para verificar si el tunel esta corriendo
function Test-TunnelRunning {
    try {
        # Verificar si el puerto esta en uso (mas confiable que buscar procesos)
        $connection = Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue
        if ($connection) {
            # Verificar que sea un proceso SSH
            $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
            if ($process -and $process.ProcessName -eq "ssh") {
                return $true
            }
        }
        return $false
    } catch {
        return $false
    }
}

# Funcion para detener el tunel
function Stop-Tunnel {
    Write-Host "Deteniendo tunel SSH..." -ForegroundColor Yellow
    
    try {
        # Buscar conexiones en el puerto local
        $connections = Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue
        $stopped = $false
        
        foreach ($conn in $connections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process -and $process.ProcessName -eq "ssh") {
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                Write-Host "Proceso SSH detenido (PID: $($process.Id))" -ForegroundColor Green
                $stopped = $true
            }
        }
        
        if (-not $stopped) {
            Write-Host "No se encontro ningun tunel SSH corriendo en el puerto $LocalPort" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error al detener el tunel: $_" -ForegroundColor Yellow
    }
}

# Funcion para mostrar el estado
function Show-Status {
    if (Test-TunnelRunning) {
        Write-Host "Tunel SSH esta CORRIENDO" -ForegroundColor Green
        Write-Host "   Puerto local: $LocalPort" -ForegroundColor Cyan
        Write-Host "   Puerto remoto: $RemotePort" -ForegroundColor Cyan
        Write-Host "   VPS: $VpsUser@$VpsHost" -ForegroundColor Cyan
        
        # Mostrar informacion del proceso
        try {
            $connection = Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue
            if ($connection) {
                $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "   PID: $($process.Id)" -ForegroundColor Gray
                }
            }
        } catch {
            # Ignorar errores
        }
    } else {
        Write-Host "Tunel SSH NO esta corriendo" -ForegroundColor Red
        Write-Host "   Para iniciarlo: npm run tunnel:start" -ForegroundColor Yellow
    }
}

# Funcion para crear el tunel
function Start-Tunnel {
    # Verificar si ya esta corriendo
    if (Test-TunnelRunning) {
        Write-Host "Ya hay un tunel SSH corriendo en el puerto $LocalPort" -ForegroundColor Yellow
        Write-Host "   Si quieres detenerlo, ejecuta: .\scripts\tunel-ssh-postgres.ps1 -Stop" -ForegroundColor Yellow
        return
    }
    
    # Verificar si el puerto local esta en uso
    $portInUse = Get-NetTCPConnection -LocalPort $LocalPort -ErrorAction SilentlyContinue
    if ($portInUse) {
        Write-Host "El puerto $LocalPort ya esta en uso por otro proceso" -ForegroundColor Red
        Write-Host "   Puedes cambiar el puerto con: -LocalPort 5434" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Creando tunel SSH para PostgreSQL..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuracion:" -ForegroundColor Yellow
    Write-Host "   VPS: $VpsUser@$VpsHost" -ForegroundColor Cyan
    Write-Host "   Puerto local: $LocalPort" -ForegroundColor Cyan
    Write-Host "   Puerto remoto: $RemotePort" -ForegroundColor Cyan
    Write-Host "   Conexion: localhost:$LocalPort -> VPS:localhost:$RemotePort" -ForegroundColor Cyan
    Write-Host ""
    
    # Determinar el host SSH a usar
    $sshHost = "${VpsUser}@${VpsHost}"
    $sshConfig = "$env:USERPROFILE\.ssh\config"
    if (Test-Path $sshConfig) {
        $configContent = Get-Content $sshConfig -Raw
        if ($configContent -match "Host vps-whatsapp") {
            Write-Host "Usando configuracion SSH de vps-whatsapp" -ForegroundColor Green
            $sshHost = "vps-whatsapp"
        }
    }
    
    # Construir comando SSH
    $sshCommand = "ssh -N -L ${LocalPort}:localhost:${RemotePort} $sshHost"
    
    Write-Host "Ejecutando: $sshCommand" -ForegroundColor Gray
    Write-Host ""
    Write-Host "El tunel se ejecutara en segundo plano" -ForegroundColor Yellow
    Write-Host "Para detenerlo, ejecuta: npm run tunnel:stop" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host "CONFIGURACION PARA .env.local:" -ForegroundColor Yellow
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Agrega esto a tu archivo .env.local:" -ForegroundColor White
    Write-Host ""
    Write-Host "DATABASE_URL=postgresql://usuario:password@localhost:$LocalPort/whatsapp_bot?schema=public" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Yellow
    Write-Host ""
    
    # Ejecutar SSH
    Write-Host "Iniciando tunel SSH..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        # Intentar ejecutar en segundo plano
        $process = Start-Process -FilePath "ssh" -ArgumentList "-N", "-L", "${LocalPort}:localhost:${RemotePort}", $sshHost -WindowStyle Hidden -PassThru -ErrorAction Stop
        
        # Esperar un momento para verificar que se inicio
        Start-Sleep -Seconds 3
        
        if (Test-TunnelRunning) {
            Write-Host "Tunel SSH creado exitosamente!" -ForegroundColor Green
            Write-Host "   El tunel esta corriendo en segundo plano (PID: $($process.Id))" -ForegroundColor Green
            Write-Host ""
            Write-Host "Para verificar el estado: npm run tunnel:status" -ForegroundColor Yellow
            Write-Host "Para detenerlo: npm run tunnel:stop" -ForegroundColor Yellow
        } else {
            Write-Host "El tunel puede no haberse iniciado correctamente" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Probando conexion manual..." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Ejecuta este comando en una nueva terminal PowerShell:" -ForegroundColor White
            Write-Host "ssh -N -L ${LocalPort}:localhost:${RemotePort} $sshHost" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "O verifica que puedas conectarte al VPS:" -ForegroundColor White
            Write-Host "ssh $sshHost" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Error al crear el tunel: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "===============================================" -ForegroundColor Yellow
        Write-Host "SOLUCION ALTERNATIVA - Ejecuta manualmente:" -ForegroundColor Yellow
        Write-Host "===============================================" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Abre una nueva terminal PowerShell y ejecuta:" -ForegroundColor White
        Write-Host ""
        Write-Host "ssh -N -L ${LocalPort}:localhost:${RemotePort} $sshHost" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Deja esa terminal abierta mientras uses el bot." -ForegroundColor Yellow
        Write-Host "Para cerrar el tunel, presiona Ctrl+C en esa terminal." -ForegroundColor Yellow
    }
}

# Procesar parametros
if ($Stop) {
    Stop-Tunnel
} elseif ($Status) {
    Show-Status
} else {
    Start-Tunnel
}
