# ⚡ Configuración Rápida del Despliegue Automático

## 🎯 Objetivo
Configurar todo para que solo necesites hacer `git push` y el bot se actualice automáticamente.

---

## 📋 Paso 1: Configurar SSH en el VPS (5 minutos)

### En el terminal web del VPS, ejecuta:

```bash
cd ~/whatsapp-bot-norhflank
bash scripts/configurar-vps-ssh.sh
```

O manualmente:

```bash
# Generar clave SSH
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions -N ""

# Agregar al VPS
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Ver la clave privada (cópiala completa)
cat ~/.ssh/github_actions
```

**⚠️ IMPORTANTE:** Copia TODO el contenido de la clave privada (incluye `-----BEGIN OPENSSH PRIVATE KEY-----` y `-----END OPENSSH PRIVATE KEY-----`).

---

## 📋 Paso 2: Configurar Secrets en GitHub (3 minutos)

1. Ve a: `https://github.com/Lucardy/whatsapp-bot-norhflank/settings/secrets/actions`

2. Click en **"New repository secret"** y crea estos 4 secrets:

   | Name | Value |
   |------|-------|
   | `VPS_HOST` | `89.117.33.122` |
   | `VPS_USER` | `root` |
   | `VPS_SSH_KEY` | (pega la clave privada completa del Paso 1) |
   | `VPS_PORT` | `22` |

3. Guarda cada secret haciendo click en **"Add secret"**

---

## 📋 Paso 3: Hacer Commit y Push (1 minuto)

En tu máquina local, ejecuta:

```bash
git add .
git commit -m "Configurar despliegue automático"
git push origin main
```

(Reemplaza `main` por `master` si esa es tu rama principal)

---

## ✅ Verificar que Funciona

1. Ve a: `https://github.com/Lucardy/whatsapp-bot-norhflank/actions`
2. Deberías ver un workflow ejecutándose llamado "Deploy to VPS"
3. Click en él para ver el progreso
4. Si todo está bien, verás ✅ en todos los pasos

---

## 🎉 ¡Listo!

Ahora cada vez que hagas `git push origin main`, el bot se actualizará automáticamente en el VPS.

**Flujo:**
1. Trabajas en local
2. `git add . && git commit -m "mensaje" && git push origin main`
3. GitHub Actions se ejecuta automáticamente
4. El bot se actualiza en el VPS
5. ¡Listo! 🚀

---

## 🐛 Si algo falla

### Error: "Permission denied"
- Verifica que la clave privada esté completa (incluye `-----BEGIN...` y `-----END...`)
- Verifica que la clave pública esté en `~/.ssh/authorized_keys` en el VPS

### El workflow no se ejecuta
- Verifica que tu rama principal se llame `main` (o cambia el workflow a `master`)
- Verifica que los secrets estén configurados correctamente

### El bot no se reinicia
- Verifica en el VPS: `pm2 list`
- Si no está corriendo: `pm2 start src/index.js --name "whatsapp-bot" -- --skip-menu`
