# Script para cerrar todas las instancias del bot de WhatsApp
Write-Host "🔍 Buscando procesos del bot..." -ForegroundColor Yellow

# Buscar procesos de Node.js que estén ejecutando el bot
$processes = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
  $_.Path -like "*whatsapp*" -or 
  (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine -like "*whatsapp-bot*"
}

if ($processes.Count -eq 0) {
  Write-Host "✅ No se encontraron procesos del bot corriendo." -ForegroundColor Green
} else {
  Write-Host "📋 Procesos encontrados:" -ForegroundColor Yellow
  $processes | ForEach-Object {
    Write-Host "   PID: $($_.Id) - $($_.ProcessName)" -ForegroundColor White
  }
  
  $confirm = Read-Host "¿Cerrar estos procesos? (S/N)"
  if ($confirm -eq 'S' -or $confirm -eq 's' -or $confirm -eq 'Y' -or $confirm -eq 'y') {
    $processes | Stop-Process -Force
    Write-Host "✅ Procesos cerrados." -ForegroundColor Green
  } else {
    Write-Host "❌ Operación cancelada." -ForegroundColor Red
  }
}

