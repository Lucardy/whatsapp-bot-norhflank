# Script para configurar autenticación SSH por clave
# Esto te permitirá conectarte sin escribir contraseña cada vez

Write-Host "🔑 Configurando autenticación SSH por clave..." -ForegroundColor Green
Write-Host ""

# Verificar si ya existe una clave SSH
$sshKeyPath = "$env:USERPROFILE\.ssh\id_ed25519"
$publicKeyPath = "$env:USERPROFILE\.ssh\id_ed25519.pub"

if (Test-Path $sshKeyPath) {
    Write-Host "⚠️  Ya existe una clave SSH en: $sshKeyPath" -ForegroundColor Yellow
    Write-Host "¿Quieres usar la existente o crear una nueva? (s/n)" -ForegroundColor Yellow
    $respuesta = Read-Host
    if ($respuesta -ne "s") {
        Write-Host "Usando clave existente..." -ForegroundColor Green
    } else {
        Write-Host "Generando nueva clave SSH..." -ForegroundColor Green
        ssh-keygen -t ed25519 -f $sshKeyPath -N '""' -C "whatsapp-bot-vps"
    }
} else {
    Write-Host "Generando nueva clave SSH..." -ForegroundColor Green
    ssh-keygen -t ed25519 -f $sshKeyPath -N '""' -C "whatsapp-bot-vps"
}

# Leer la clave pública
if (Test-Path $publicKeyPath) {
    $publicKey = Get-Content $publicKeyPath
    Write-Host ""
    Write-Host "✅ Clave SSH generada correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Tu clave pública es:" -ForegroundColor Cyan
    Write-Host $publicKey -ForegroundColor White
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "INSTRUCCIONES PARA COMPLETAR LA CONFIGURACIÓN:" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Conéctate al VPS manualmente (esta será la última vez):" -ForegroundColor White
    Write-Host "   ssh root@89.117.33.122" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Una vez conectado, ejecuta estos comandos:" -ForegroundColor White
    Write-Host "   mkdir -p ~/.ssh" -ForegroundColor Cyan
    Write-Host "   chmod 700 ~/.ssh" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Luego ejecuta este comando (copia la clave de arriba):" -ForegroundColor White
    $comando = 'echo "' + $publicKey + '" >> ~/.ssh/authorized_keys'
    Write-Host "   $comando" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. Ajusta los permisos:" -ForegroundColor White
    Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "5. Sal del VPS:" -ForegroundColor White
    Write-Host "   exit" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ Después de esto, podrás conectarte sin contraseña!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "❌ Error: No se pudo generar la clave SSH" -ForegroundColor Red
}
