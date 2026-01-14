# 🗄️ Acceder a Prisma Studio desde el VPS

## Opción 1: Túnel SSH (Recomendado - Más Seguro)

Esta opción ejecuta Prisma Studio en el VPS y crea un túnel SSH para acceder desde tu máquina local.

### Paso 1: Crear túnel SSH desde tu máquina local

En PowerShell de Windows, ejecuta:

```powershell
ssh -L 5555:localhost:5555 root@89.117.33.122
```

**¿Qué hace esto?**
- `-L 5555:localhost:5555` = Crea un túnel que redirige el puerto 5555 local al puerto 5555 del VPS
- `root@89.117.33.122` = Tu conexión SSH al VPS

**⚠️ IMPORTANTE:** Deja esta ventana de PowerShell abierta mientras uses Prisma Studio.

### Paso 2: En el VPS, ejecutar Prisma Studio

En el terminal web del VPS, ejecuta:

```bash
cd ~/whatsapp-bot-norhflank
npx prisma studio --port 5555
```

### Paso 3: Acceder desde tu navegador

Abre tu navegador y ve a:
```
http://localhost:5555
```

¡Listo! Verás Prisma Studio con tu base de datos.

---

## Opción 2: Ejecutar Prisma Studio directamente en el VPS

Si prefieres ejecutarlo directamente en el VPS (sin túnel):

### En el terminal web del VPS:

```bash
cd ~/whatsapp-bot-norhflank
npx prisma studio --port 5555 --host 0.0.0.0
```

Luego abre en tu navegador:
```
http://89.117.33.122:5555
```

**⚠️ IMPORTANTE:** Necesitarás abrir el puerto 5555 en el firewall:
```bash
ufw allow 5555/tcp
```

---

## Opción 3: Usar un Cliente de Base de Datos (pgAdmin, DBeaver, etc.)

Si prefieres usar una herramienta gráfica más completa:

### Configurar PostgreSQL para conexiones remotas

1. **Editar configuración de PostgreSQL en el VPS:**

```bash
nano /etc/postgresql/16/main/postgresql.conf
```

Busca la línea:
```
#listen_addresses = 'localhost'
```

Cámbiala a:
```
listen_addresses = '*'
```

Guarda: `Ctrl + X`, luego `Y`, luego `Enter`

2. **Configurar pg_hba.conf:**

```bash
nano /etc/postgresql/16/main/pg_hba.conf
```

Agrega al final:
```
host    whatsapp_bot    whatsapp_user    0.0.0.0/0    md5
```

Guarda y reinicia PostgreSQL:
```bash
systemctl restart postgresql
```

3. **Abrir puerto en firewall:**

```bash
ufw allow 5432/tcp
```

4. **Conectar desde tu cliente:**

- **Host:** `89.117.33.122`
- **Puerto:** `5432`
- **Base de datos:** `whatsapp_bot`
- **Usuario:** `whatsapp_user`
- **Contraseña:** `8Wjnmyrq123-`

---

## ⚠️ Seguridad

**Opción 1 (Túnel SSH)** es la más segura porque:
- No expone la base de datos directamente a internet
- Usa el cifrado de SSH
- Solo tú puedes acceder

**Opción 2 y 3** exponen la base de datos a internet, así que:
- Usa contraseñas fuertes
- Considera usar un firewall más restrictivo
- O mejor aún, usa Opción 1

---

## 🎯 Recomendación

**Usa la Opción 1 (Túnel SSH)** - Es la más segura y fácil de usar.
