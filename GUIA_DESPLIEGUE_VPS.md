# 🚀 Guía de Despliegue Automático a VPS

Esta guía te explica paso a paso cómo configurar el despliegue automático desde GitHub a tu VPS en Hostinger.

## 📋 Requisitos Previos

- ✅ VPS en Hostinger configurado
- ✅ Acceso SSH al VPS
- ✅ Proyecto subido a GitHub
- ✅ Node.js y npm instalados en el VPS
- ✅ Git instalado en el VPS

---

## 🔧 Paso 1: Preparar el VPS

### 1.1 Conectarte al VPS por SSH

Desde tu terminal local (PowerShell en Windows), conéctate a tu VPS:

```bash
ssh usuario@tu-ip-del-vps
```

**¿No sabes tu usuario o IP?**
- En Hostinger, ve a tu panel de control del VPS
- Busca la sección "SSH Access" o "Acceso SSH"
- Ahí verás la IP y el usuario (generalmente `root` o `ubuntu`)

### 1.2 Instalar Node.js en el VPS

Si aún no tienes Node.js instalado:

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20 (que es lo que requiere tu proyecto)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

### 1.3 Instalar Git (si no está instalado)

```bash
sudo apt install git -y
```

### 1.4 Clonar el repositorio en el VPS

```bash
# Ir al directorio home (o donde prefieras)
cd ~

# Clonar tu repositorio
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git whatsapp-bot-norhflank

# Entrar al directorio
cd whatsapp-bot-norhflank
```

**⚠️ Importante:** Reemplaza `TU_USUARIO` y `TU_REPOSITORIO` con los valores reales de tu GitHub.

### 1.5 Instalar dependencias y configurar

```bash
# Instalar dependencias
npm install --production

# Generar Prisma Client
npx prisma generate

# Crear el archivo .env con tus variables de entorno
nano .env
```

Copia el contenido de `env.example` y completa con tus valores reales (base de datos, tokens, etc.).

### 1.6 Instalar PM2 (recomendado para mantener el bot corriendo)

PM2 es un gestor de procesos que mantiene tu bot corriendo incluso si se reinicia el servidor:

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar el bot con PM2
pm2 start npm --name "whatsapp-bot" -- start:direct

# Guardar la configuración para que se inicie automáticamente
pm2 save
pm2 startup  # Esto te dará un comando para ejecutar, cópialo y ejecútalo
```

---

## 🔐 Paso 2: Configurar SSH para GitHub Actions

Para que GitHub Actions pueda conectarse a tu VPS, necesitas crear una clave SSH.

### 2.1 Generar clave SSH en el VPS

En tu VPS, ejecuta:

```bash
# Generar una nueva clave SSH (si no tienes una)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""

# Ver la clave pública (la necesitarás después)
cat ~/.ssh/github_actions.pub
```

**Copia el contenido completo** de la clave pública (empieza con `ssh-ed25519`).

### 2.2 Agregar la clave al archivo authorized_keys

```bash
# Agregar la clave pública a authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# Asegurar permisos correctos
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### 2.3 Obtener la clave privada

```bash
# Ver la clave privada (la necesitarás para GitHub Secrets)
cat ~/.ssh/github_actions
```

**⚠️ IMPORTANTE:** Copia TODO el contenido de la clave privada (incluye `-----BEGIN OPENSSH PRIVATE KEY-----` y `-----END OPENSSH PRIVATE KEY-----`).

---

## 🔑 Paso 3: Configurar Secrets en GitHub

Ahora vamos a configurar los "secrets" en GitHub para que GitHub Actions pueda conectarse a tu VPS.

### 3.1 Ir a la configuración de Secrets

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**

### 3.2 Agregar los siguientes secrets:

Crea estos 4 secrets uno por uno:

#### Secret 1: `VPS_HOST`
- **Name:** `VPS_HOST`
- **Value:** La IP de tu VPS (ejemplo: `185.123.45.67`)

#### Secret 2: `VPS_USER`
- **Name:** `VPS_USER`
- **Value:** Tu usuario SSH (generalmente `root` o `ubuntu`)

#### Secret 3: `VPS_SSH_KEY`
- **Name:** `VPS_SSH_KEY`
- **Value:** La clave privada completa que copiaste en el paso 2.3 (incluye las líneas `-----BEGIN...` y `-----END...`)

#### Secret 4: `VPS_PORT` (opcional, solo si no usas el puerto 22)
- **Name:** `VPS_PORT`
- **Value:** El puerto SSH (generalmente `22`)

---

## ✅ Paso 4: Verificar la Configuración

### 4.1 Hacer un cambio y hacer push

Haz un pequeño cambio en tu código local (por ejemplo, agrega un comentario):

```bash
# Desde tu máquina local
git add .
git commit -m "Configurar despliegue automático"
git push origin main
```

### 4.2 Verificar en GitHub Actions

1. Ve a tu repositorio en GitHub
2. Click en la pestaña **Actions**
3. Deberías ver un workflow ejecutándose llamado "Deploy to VPS"
4. Click en él para ver el progreso

Si todo está bien configurado, verás que:
- ✅ Se conecta al VPS
- ✅ Hace `git pull`
- ✅ Instala dependencias
- ✅ Reinicia el bot

---

## 🐛 Solución de Problemas

### Error: "Permission denied (publickey)"

**Problema:** GitHub Actions no puede conectarse por SSH.

**Solución:**
1. Verifica que la clave privada en `VPS_SSH_KEY` esté completa (incluye las líneas `-----BEGIN...` y `-----END...`)
2. Verifica que la clave pública esté en `~/.ssh/authorized_keys` en el VPS
3. Verifica los permisos: `chmod 600 ~/.ssh/authorized_keys`

### Error: "git: command not found"

**Problema:** Git no está instalado en el VPS.

**Solución:**
```bash
sudo apt install git -y
```

### Error: "pm2: command not found"

**Problema:** PM2 no está instalado.

**Solución:**
```bash
sudo npm install -g pm2
```

### El bot no se reinicia después del despliegue

**Problema:** El script no encuentra el proceso del bot.

**Solución:**
1. Verifica que el bot esté corriendo: `pm2 list`
2. Si no está, inícialo manualmente: `pm2 start npm --name "whatsapp-bot" -- start:direct`
3. Guarda la configuración: `pm2 save`

### Error: "No se encontró package.json"

**Problema:** El directorio del proyecto no es correcto.

**Solución:**
Edita el archivo `scripts/deploy.sh` y cambia la variable `PROJECT_DIR` al directorio correcto donde está tu proyecto en el VPS.

---

## 📝 Notas Importantes

1. **Rama principal:** El workflow está configurado para ejecutarse cuando haces push a `main`. Si tu rama principal se llama `master`, edita `.github/workflows/deploy.yml` y cambia `main` por `master`.

2. **Variables de entorno:** Asegúrate de tener el archivo `.env` configurado en el VPS con todas las variables necesarias.

3. **Base de datos:** Si usas PostgreSQL, asegúrate de que esté corriendo y accesible desde el VPS.

4. **Sesiones de WhatsApp:** Las sesiones se guardan en la carpeta `sessions/`. Asegúrate de que esta carpeta exista y tenga los permisos correctos.

---

## 🎉 ¡Listo!

Ahora cada vez que hagas `git push origin main`, tu bot se desplegará automáticamente en el VPS. 

**Flujo completo:**
1. Haces cambios en tu código local
2. `git add .`
3. `git commit -m "tu mensaje"`
4. `git push origin main`
5. GitHub Actions se ejecuta automáticamente
6. El bot se actualiza en el VPS
7. ¡Listo! 🚀

---

## 📞 ¿Necesitas ayuda?

Si tienes problemas, revisa:
- Los logs de GitHub Actions (pestaña Actions en GitHub)
- Los logs del bot en el VPS: `pm2 logs whatsapp-bot`
- El estado del bot: `pm2 status`
