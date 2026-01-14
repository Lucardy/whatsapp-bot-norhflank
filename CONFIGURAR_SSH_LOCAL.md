# 🔑 Configurar SSH desde tu Máquina Local

## Paso 1: Generar Clave SSH en tu Máquina Local

En PowerShell, ejecuta:

```powershell
ssh-keygen -t ed25519 -C "tu-email@ejemplo.com" -f $env:USERPROFILE\.ssh\id_ed25519_vps
```

Cuando te pregunte si quieres sobrescribir (si ya existe), presiona `N` (No) a menos que quieras crear una nueva.

Cuando te pregunte por una passphrase, puedes presionar Enter dos veces para dejarla vacía (o crear una si prefieres más seguridad).

---

## Paso 2: Ver tu Clave Pública

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519_vps.pub
```

**Copia TODO el contenido** que aparece (empieza con `ssh-ed25519`).

---

## Paso 3: Agregar la Clave al VPS

En el terminal web del VPS, ejecuta:

```bash
# Crear el archivo authorized_keys si no existe
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Agregar tu clave pública (pega la clave que copiaste)
echo "TU_CLAVE_PUBLICA_AQUI" >> ~/.ssh/authorized_keys

# Ajustar permisos
chmod 600 ~/.ssh/authorized_keys
```

**⚠️ IMPORTANTE:** Reemplaza `TU_CLAVE_PUBLICA_AQUI` con la clave pública que copiaste.

---

## Paso 4: Configurar SSH para usar la Clave Automáticamente

En tu máquina local, crea/edita el archivo de configuración SSH:

```powershell
# Crear el archivo si no existe
if (-not (Test-Path $env:USERPROFILE\.ssh\config)) {
    New-Item -ItemType File -Path $env:USERPROFILE\.ssh\config | Out-Null
}

# Agregar configuración
Add-Content -Path $env:USERPROFILE\.ssh\config -Value @"
Host vps-whatsapp
    HostName 89.117.33.122
    User root
    IdentityFile $env:USERPROFILE\.ssh\id_ed25519_vps
    IdentitiesOnly yes
"@
```

---

## Paso 5: Probar la Conexión

Ahora puedes conectarte simplemente con:

```powershell
ssh vps-whatsapp
```

O directamente:

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_vps root@89.117.33.122
```

---

## ✅ Después de Configurar

Podrás:
- Conectarte sin escribir contraseña
- Ejecutar comandos remotos fácilmente
- Ver logs del bot en tiempo real
- Trabajar cómodamente desde local
