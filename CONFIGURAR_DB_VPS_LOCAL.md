# 🔧 Configurar Base de Datos del VPS para Desarrollo Local

Este documento explica cómo configurar el bot para que use la base de datos del VPS cuando lo ejecutas localmente.

## 📋 ¿Por qué?

Cuando ejecutas `npm start` localmente, por defecto se usa la base de datos PostgreSQL local. Si quieres testear con los mismos datos que están en producción (VPS), puedes configurar el bot para que use la base de datos del VPS.

## 🚀 Configuración Rápida

### Paso 1: Crear archivo `.env.local`

En la raíz del proyecto, crea un archivo llamado `.env.local` (este archivo NO se subirá a GitHub):

```bash
# Windows PowerShell
New-Item -Path .env.local -ItemType File
```

### Paso 2: Configurar la URL de la base de datos del VPS

Abre el archivo `.env.local` y agrega la URL de conexión a tu base de datos del VPS:

```env
# Database - URL de conexión al VPS
DATABASE_URL=postgresql://usuario:password@tu-vps-ip:5432/whatsapp_bot?schema=public
```

**Ejemplo real:**
```env
DATABASE_URL=postgresql://whatsapp_user:tu_password@192.168.1.100:5432/whatsapp_bot?schema=public
```

### Paso 3: Obtener la URL de conexión del VPS

Para obtener la URL de conexión correcta, puedes:

1. **Conectarte al VPS y ver el archivo `.env`:**
   ```bash
   ssh usuario@tu-vps
   cd ~/whatsapp-bot-norhflank
   cat .env | grep DATABASE_URL
   ```

2. **O construirla manualmente:**
   - **Usuario**: El usuario de PostgreSQL en el VPS (ej: `whatsapp_user` o `postgres`)
   - **Password**: La contraseña del usuario
   - **Host**: La IP o dominio del VPS
   - **Puerto**: Generalmente `5432`
   - **Base de datos**: Generalmente `whatsapp_bot`

### Paso 4: Configurar acceso remoto a PostgreSQL (si es necesario)

Si PostgreSQL en el VPS no acepta conexiones remotas, necesitas configurarlo:

1. **Editar `postgresql.conf`:**
   ```bash
   sudo nano /etc/postgresql/14/main/postgresql.conf
   ```
   Busca `listen_addresses` y cámbialo a:
   ```
   listen_addresses = '*'
   ```

2. **Editar `pg_hba.conf`:**
   ```bash
   sudo nano /etc/postgresql/14/main/pg_hba.conf
   ```
   Agrega al final:
   ```
   host    all             all             0.0.0.0/0               md5
   ```

3. **Reiniciar PostgreSQL:**
   ```bash
   sudo systemctl restart postgresql
   ```

4. **Abrir el puerto en el firewall (si aplica):**
   ```bash
   sudo ufw allow 5432/tcp
   ```

⚠️ **IMPORTANTE**: Asegúrate de que solo tu IP local pueda conectarse, o usa un túnel SSH (ver opción alternativa abajo).

## 🔄 Cómo Funciona

1. Cuando ejecutas `npm start`, el código carga primero `.env` (valores por defecto)
2. Si existe `.env.local`, lo carga después y sobrescribe las variables de `.env`
3. Por lo tanto, `DATABASE_URL` de `.env.local` tiene prioridad

## ✅ Verificar que Funciona

1. Ejecuta el bot:
   ```bash
   npm start
   ```

2. Deberías ver en la consola:
   ```
   📝 Usando configuración de .env.local (sobrescribe .env)
   ✅ Conexión a base de datos exitosa
   ```

3. Si ves errores de conexión, verifica:
   - Que la URL de conexión sea correcta
   - Que PostgreSQL acepte conexiones remotas
   - Que el firewall permita la conexión
   - Que las credenciales sean correctas

## 🔒 Alternativa Segura: Túnel SSH

Si no quieres exponer PostgreSQL directamente, puedes usar un túnel SSH:

### En Windows (PowerShell):

```powershell
# Crear túnel SSH (ejecutar en una terminal separada)
ssh -L 5433:localhost:5432 usuario@tu-vps
```

Luego en `.env.local`:
```env
DATABASE_URL=postgresql://usuario:password@localhost:5433/whatsapp_bot?schema=public
```

Nota: El puerto local `5433` puede ser cualquier puerto disponible. El túnel redirige `localhost:5433` → `VPS:5432`.

## 🔄 Volver a Usar Base de Datos Local

Para volver a usar la base de datos local, simplemente:

1. **Renombrar o eliminar `.env.local`:**
   ```bash
   # Renombrar (para guardarlo)
   Rename-Item .env.local .env.local.backup
   
   # O eliminar
   Remove-Item .env.local
   ```

2. El bot usará automáticamente la configuración de `.env` (base de datos local)

## 📝 Notas

- El archivo `.env.local` está en `.gitignore`, por lo que NO se subirá a GitHub
- Puedes tener múltiples archivos `.env.local.*` para diferentes configuraciones
- Las variables en `.env.local` sobrescriben las de `.env`

## 🆘 Troubleshooting

### Error: "Can't reach database server"
- Verifica que la IP del VPS sea correcta
- Verifica que PostgreSQL esté corriendo en el VPS
- Verifica que el puerto 5432 esté abierto en el firewall

### Error: "password authentication failed"
- Verifica que el usuario y contraseña sean correctos
- Verifica que el usuario tenga permisos para conectarse desde tu IP

### Error: "Connection timeout"
- Verifica que el firewall del VPS permita conexiones en el puerto 5432
- Considera usar un túnel SSH en su lugar
