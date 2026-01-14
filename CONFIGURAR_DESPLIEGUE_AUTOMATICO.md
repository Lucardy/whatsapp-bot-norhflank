# 🚀 Configurar Despliegue Automático - Paso a Paso

Una vez configurado, solo necesitarás hacer `git push` y el bot se actualizará automáticamente en el VPS.

---

## 📋 Paso 1: Generar Clave SSH en el VPS

En el terminal web del VPS, ejecuta estos comandos:

```bash
# Generar una clave SSH específica para GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions -N ""

# Ver la clave pública (la necesitarás después)
cat ~/.ssh/github_actions.pub
```

**⚠️ IMPORTANTE:** Copia TODO el contenido de la clave pública (empieza con `ssh-ed25519`).

---

## 📋 Paso 2: Agregar la Clave al VPS

```bash
# Agregar la clave pública a authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# Asegurar permisos correctos
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

---

## 📋 Paso 3: Obtener la Clave Privada

```bash
# Ver la clave privada (la necesitarás para GitHub Secrets)
cat ~/.ssh/github_actions
```

**⚠️ IMPORTANTE:** Copia TODO el contenido de la clave privada (incluye las líneas `-----BEGIN OPENSSH PRIVATE KEY-----` y `-----END OPENSSH PRIVATE KEY-----`).

---

## 📋 Paso 4: Configurar Secrets en GitHub

1. Ve a tu repositorio en GitHub: `https://github.com/Lucardy/whatsapp-bot-norhflank`
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**

### Crear estos 4 secrets:

#### Secret 1: `VPS_HOST`
- **Name:** `VPS_HOST`
- **Value:** `89.117.33.122`

#### Secret 2: `VPS_USER`
- **Name:** `VPS_USER`
- **Value:** `root`

#### Secret 3: `VPS_SSH_KEY`
- **Name:** `VPS_SSH_KEY`
- **Value:** La clave privada completa que copiaste en el Paso 3 (incluye `-----BEGIN...` y `-----END...`)

#### Secret 4: `VPS_PORT` (opcional)
- **Name:** `VPS_PORT`
- **Value:** `22` (o déjalo vacío si es el puerto estándar)

---

## 📋 Paso 5: Verificar la Rama Principal

Asegúrate de que tu rama principal se llama `main`. Si se llama `master`, necesitamos actualizar el workflow.

Verifica en GitHub o ejecuta:
```bash
git branch
```

Si tu rama se llama `master` en lugar de `main`, avísame y actualizo el workflow.

---

## 📋 Paso 6: Hacer Commit y Push de los Cambios

Desde tu máquina local, ejecuta:

```bash
git add .
git commit -m "Configurar despliegue automático"
git push origin main
```

(Reemplaza `main` por `master` si esa es tu rama principal)

---

## 📋 Paso 7: Verificar el Despliegue

1. Ve a tu repositorio en GitHub
2. Click en la pestaña **Actions**
3. Deberías ver un workflow ejecutándose llamado "Deploy to VPS"
4. Click en él para ver el progreso

Si todo está bien configurado, verás:
- ✅ Se conecta al VPS
- ✅ Hace `git pull`
- ✅ Instala dependencias
- ✅ Reinicia el bot con PM2

---

## 🎉 ¡Listo!

Ahora cada vez que hagas `git push origin main`, el bot se actualizará automáticamente en el VPS.

**Flujo completo:**
1. Trabajas en local
2. `git add .`
3. `git commit -m "tu mensaje"`
4. `git push origin main`
5. GitHub Actions se ejecuta automáticamente
6. El bot se actualiza en el VPS
7. ¡Listo! 🚀

---

## 🐛 Solución de Problemas

### Error: "Permission denied (publickey)"

**Solución:**
1. Verifica que la clave privada en `VPS_SSH_KEY` esté completa (incluye `-----BEGIN...` y `-----END...`)
2. Verifica que la clave pública esté en `~/.ssh/authorized_keys` en el VPS
3. Verifica los permisos: `chmod 600 ~/.ssh/authorized_keys`

### Error: "git: command not found"

**Solución:**
```bash
apt install -y git
```

### El bot no se reinicia después del despliegue

**Solución:**
1. Verifica que el bot esté corriendo: `pm2 list`
2. Si no está, inícialo manualmente: `pm2 start src/index.js --name "whatsapp-bot" -- --skip-menu`
3. Guarda: `pm2 save`

---

## 📝 Notas

- El workflow está configurado para ejecutarse cuando haces push a `main`
- Si tu rama principal se llama `master`, avísame y lo cambio
- El script de despliegue actualiza el código, instala dependencias y reinicia el bot automáticamente
