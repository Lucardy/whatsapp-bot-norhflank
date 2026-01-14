# Configurar SSH config
$sshDir = Join-Path $env:USERPROFILE ".ssh"
$configPath = Join-Path $sshDir "config"
$keyPath = Join-Path $sshDir "id_ed25519_vps"

$configEntry = @"
Host vps-whatsapp
    HostName 89.117.33.122
    User root
    IdentityFile $keyPath
    IdentitiesOnly yes

"@

if (Test-Path $configPath) {
    $existingConfig = Get-Content $configPath -Raw
    if ($existingConfig -notmatch "vps-whatsapp") {
        Add-Content -Path $configPath -Value $configEntry
        Write-Host "Configuracion SSH agregada" -ForegroundColor Green
    } else {
        Write-Host "Configuracion ya existe" -ForegroundColor Yellow
    }
} else {
    Set-Content -Path $configPath -Value $configEntry
    Write-Host "Archivo config creado" -ForegroundColor Green
}
