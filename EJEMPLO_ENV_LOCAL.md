# 📝 Ejemplo Completo de `.env.local`

Este es un ejemplo de cómo debería quedar tu archivo `.env.local` para usar la base de datos del VPS cuando ejecutas el bot localmente.

## 🔑 Archivo `.env.local` Completo

```env
# ============================================
# CONFIGURACIÓN LOCAL - BASE DE DATOS DEL VPS
# ============================================
# Este archivo sobrescribe las variables de .env
# Solo se usa cuando ejecutas el bot localmente
# NO se sube a GitHub (está en .gitignore)
# ============================================

# ============================================
# DATABASE - CONEXIÓN AL VPS
# ============================================
# IMPORTANTE: Esta es la única variable que DEBES cambiar
# Reemplaza con la URL de conexión de tu VPS
# Formato: postgresql://usuario:password@host:puerto/nombre_db?schema=public
# ============================================
DATABASE_URL=postgresql://whatsapp_user:TU_PASSWORD_AQUI@TU_VPS_IP:5432/whatsapp_bot?schema=public

# Si tu VPS requiere SSL, agrega &sslmode=require al final:
# DATABASE_URL=postgresql://whatsapp_user:TU_PASSWORD_AQUI@TU_VPS_IP:5432/whatsapp_bot?schema=public&sslmode=require

# Si usas túnel SSH (más seguro), usa localhost con el puerto del túnel:
# DATABASE_URL=postgresql://whatsapp_user:TU_PASSWORD_AQUI@localhost:5433/whatsapp_bot?schema=public

# ============================================
# SESSIONS
# ============================================
# Estas variables normalmente NO necesitas cambiarlas
# Se usan las mismas que en .env
SESSION_BASE_DIR=./sessions
FORCE_LOCK_RESET=false

# ============================================
# SERVER
# ============================================
# Puerto donde corre el servidor HTTP local
# Puedes cambiarlo si el 3000 está ocupado
PORT=3000
NODE_ENV=development

# ============================================
# JWT (futuro - para autenticación)
# ============================================
# Normalmente NO necesitas cambiar esto
# Se usa el mismo secret que en .env
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# ============================================
# PAYMENTS - MERCADO PAGO
# ============================================
# Si quieres testear pagos localmente, puedes usar los mismos tokens del VPS
# O dejarlos vacíos si no vas a testear pagos
MERCADOPAGO_ACCESS_TOKEN=TU_ACCESS_TOKEN_DE_MERCADOPAGO
WEBHOOK_URL=https://tu-dominio.com/webhooks/mercadopago
FRONTEND_URL=https://tu-dominio.com
STRIPE_SECRET_KEY=

# ============================================
# ADMIN (futuro)
# ============================================
# Credenciales de administrador
# Normalmente NO necesitas cambiar esto
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme
```

## 🎯 Versión Mínima (Solo lo Esencial)

Si solo quieres cambiar la base de datos y dejar todo lo demás igual, puedes crear un `.env.local` con solo esto:

```env
# Solo sobrescribir la base de datos para usar el VPS
DATABASE_URL=postgresql://whatsapp_user:TU_PASSWORD_AQUI@TU_VPS_IP:5432/whatsapp_bot?schema=public
```

El resto de las variables se tomarán del archivo `.env` automáticamente.

## 📋 Pasos para Configurarlo

1. **Crea el archivo `.env.local` en la raíz del proyecto**

2. **Copia el contenido del ejemplo de arriba** (versión mínima o completa)

3. **Reemplaza estos valores:**
   - `TU_PASSWORD_AQUI` → La contraseña del usuario de PostgreSQL en el VPS
   - `TU_VPS_IP` → La IP o dominio de tu VPS
   - `whatsapp_user` → El usuario de PostgreSQL (puede ser `postgres` o `whatsapp_user`)

4. **Para obtener la URL correcta del VPS:**
   ```bash
   ssh usuario@tu-vps
   cd ~/whatsapp-bot-norhflank
   cat .env | grep DATABASE_URL
   ```
   Copia esa línea y pégala en tu `.env.local`

## ✅ Ejemplo Real (Reemplaza con tus datos)

```env
DATABASE_URL=postgresql://whatsapp_user:8Wjnmyrq123-@192.168.1.100:5432/whatsapp_bot?schema=public
```

O si usas túnel SSH:

```env
DATABASE_URL=postgresql://whatsapp_user:8Wjnmyrq123-@localhost:5433/whatsapp_bot?schema=public
```

## 🔍 Verificar que Funciona

Después de crear el archivo, ejecuta:

```bash
npm start
```

Deberías ver en la consola:
```
📝 Usando configuración de .env.local (sobrescribe .env)
✅ Conexión a base de datos exitosa
```

Si ves errores de conexión, verifica:
- ✅ Que la IP del VPS sea correcta
- ✅ Que el usuario y contraseña sean correctos
- ✅ Que PostgreSQL acepte conexiones remotas
- ✅ Que el firewall permita conexiones en el puerto 5432
