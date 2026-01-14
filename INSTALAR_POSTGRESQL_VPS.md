# 🐘 Instalar PostgreSQL en el VPS - Paso a Paso

## 📋 Paso 1: Instalar PostgreSQL

En el terminal web del VPS, ejecuta:

```bash
# Actualizar la lista de paquetes
apt update

# Instalar PostgreSQL
apt install -y postgresql postgresql-contrib
```

**¿Qué hace esto?**
- `postgresql` = El servidor de base de datos PostgreSQL
- `postgresql-contrib` = Extensiones y utilidades adicionales

---

## 📋 Paso 2: Verificar que PostgreSQL está corriendo

```bash
# Verificar el estado del servicio
systemctl status postgresql
```

Deberías ver que está "active (running)".

---

## 📋 Paso 3: Configurar PostgreSQL

### 3.1 Cambiar a usuario postgres

PostgreSQL crea un usuario especial llamado `postgres`. Necesitamos usarlo para configurar:

```bash
# Cambiar al usuario postgres
sudo -u postgres psql
```

Esto te llevará al prompt de PostgreSQL (verás `postgres=#`).

---

### 3.2 Crear la base de datos y usuario

Dentro del prompt de PostgreSQL, ejecuta estos comandos uno por uno:

```sql
-- Crear la base de datos
CREATE DATABASE whatsapp_bot;

-- Crear un usuario para el bot
CREATE USER whatsapp_user WITH PASSWORD 'cambia_esta_contraseña_por_una_segura';

-- Dar permisos al usuario sobre la base de datos
GRANT ALL PRIVILEGES ON DATABASE whatsapp_bot TO whatsapp_user;

-- Salir de PostgreSQL
\q
```

**⚠️ IMPORTANTE:** Cambia `'cambia_esta_contraseña_por_una_segura'` por una contraseña segura. Guárdala porque la necesitarás después.

---

## 📋 Paso 4: Configurar autenticación (si es necesario)

Por defecto, PostgreSQL puede requerir autenticación. Vamos a configurarlo:

```bash
# Editar el archivo de configuración
nano /etc/postgresql/*/main/pg_hba.conf
```

Busca la línea que dice:
```
local   all             all                                     peer
```

Cámbiala a:
```
local   all             all                                     md5
```

Guarda con `Ctrl + X`, luego `Y`, luego `Enter`.

**Reiniciar PostgreSQL:**
```bash
systemctl restart postgresql
```

---

## 📋 Paso 5: Probar la conexión

```bash
# Probar conexión con el nuevo usuario
psql -U whatsapp_user -d whatsapp_bot -h localhost
```

Te pedirá la contraseña. Si conecta, escribe `\q` para salir.

---

## 📋 Paso 6: Actualizar el archivo .env en el VPS

```bash
# Ir al directorio del proyecto
cd ~/whatsapp-bot-norhflank

# Editar el archivo .env
nano .env
```

Busca la línea:
```
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_bot
```

Cámbiala a (reemplaza `TU_CONTRASEÑA` con la que creaste):
```
DATABASE_URL=postgresql://whatsapp_user:TU_CONTRASEÑA@localhost:5432/whatsapp_bot
```

Guarda con `Ctrl + X`, luego `Y`, luego `Enter`.

---

## 📋 Paso 7: Ejecutar migraciones de Prisma

```bash
# Asegúrate de estar en el directorio del proyecto
cd ~/whatsapp-bot-norhflank

# Ejecutar migraciones
npx prisma migrate deploy
```

Esto creará las tablas en la base de datos.

---

## 📋 Paso 8: Reiniciar el bot

```bash
# Reiniciar el bot con PM2
pm2 restart whatsapp-bot

# Ver los logs para verificar que no hay errores
pm2 logs whatsapp-bot --lines 30
```

---

## ✅ Verificar que todo funciona

```bash
# Verificar que PostgreSQL está corriendo
systemctl status postgresql

# Verificar que el bot está corriendo
pm2 status

# Ver logs del bot
pm2 logs whatsapp-bot --lines 20
```

Si no ves errores de conexión a la base de datos, ¡todo está funcionando! 🎉

---

## 🐛 Solución de Problemas

### Error: "password authentication failed"

**Solución:** Verifica que la contraseña en `.env` sea la correcta.

### Error: "database does not exist"

**Solución:** Verifica que creaste la base de datos correctamente:
```bash
sudo -u postgres psql -c "\l"
```

### Error: "role does not exist"

**Solución:** Verifica que creaste el usuario correctamente:
```bash
sudo -u postgres psql -c "\du"
```

---

## 📝 Notas Importantes

1. **Contraseña segura:** Usa una contraseña fuerte para el usuario de PostgreSQL
2. **Backup:** Considera hacer backups regulares de la base de datos
3. **Seguridad:** El archivo `.env` contiene información sensible, no lo subas a GitHub

---

## 🎉 ¡Listo!

Una vez completados estos pasos, tu bot estará conectado a PostgreSQL y funcionando correctamente.
