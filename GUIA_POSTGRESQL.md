# Guía de PostgreSQL - Preguntas Frecuentes

## 🔄 ¿Cómo se ejecuta PostgreSQL?

### PostgreSQL es un Servicio de Windows

PostgreSQL **NO se ejecuta automáticamente** cuando ejecutas `npm start`. Es un **servicio de Windows** que debe estar corriendo en segundo plano.

### ¿Cómo funciona?

1. **PostgreSQL se instala como un servicio de Windows**
   - Una vez instalado, el servicio se configura para iniciarse automáticamente al arrancar tu computadora
   - O puede iniciarse manualmente cuando lo necesites

2. **Cuando ejecutas `npm start`:**
   - El bot Node.js se conecta a PostgreSQL (que debe estar corriendo)
   - Si PostgreSQL no está corriendo, verás un error de conexión

### Verificar si PostgreSQL está corriendo

Abre PowerShell y ejecuta:

```powershell
Get-Service | Where-Object {$_.DisplayName -like "*postgres*"}
```

O busca en:
- **Menú de Inicio** → Busca "Services" (Servicios)
- Busca servicios que contengan "postgres" o "PostgreSQL"

### Iniciar PostgreSQL si no está corriendo

**Opción 1: Desde PowerShell (como Administrador)**
```powershell
# Buscar el nombre exacto del servicio
Get-Service | Where-Object {$_.DisplayName -like "*postgres*"}

# Iniciar el servicio (reemplaza NOMBRE_DEL_SERVICIO)
Start-Service -Name "NOMBRE_DEL_SERVICIO"
```

**Opción 2: Desde la Interfaz Gráfica**
1. Presiona `Win + R`
2. Escribe `services.msc` y presiona Enter
3. Busca "PostgreSQL" en la lista
4. Click derecho → "Start" (Iniciar)

**Opción 3: Configurar para que inicie automáticamente**
1. Abre Services (`services.msc`)
2. Busca el servicio de PostgreSQL
3. Click derecho → Properties (Propiedades)
4. En "Startup type" (Tipo de inicio), selecciona "Automatic" (Automático)
5. Click en "Start" (Iniciar) si no está corriendo
6. Click en "OK"

### Verificar que está funcionando

```powershell
# Probar conexión
Test-NetConnection -ComputerName localhost -Port 5432
```

Si responde `True`, PostgreSQL está corriendo y escuchando en el puerto 5432.

---

## 👀 ¿Dónde ver las tablas y datos de la base de datos?

Tienes **3 opciones** principales:

### Opción 1: Prisma Studio (⭐ RECOMENDADO - Más fácil)

**Prisma Studio** es una interfaz web que te permite ver y editar los datos fácilmente.

```bash
npm run db:studio
```

Esto abrirá automáticamente tu navegador en: **http://localhost:5555**

**Ventajas:**
- ✅ Muy fácil de usar
- ✅ Interfaz visual moderna
- ✅ Puedes editar datos directamente
- ✅ No necesitas saber SQL
- ✅ Muestra las relaciones entre tablas

**Cómo usar:**
1. Ejecuta `npm run db:studio`
2. Se abrirá en tu navegador
3. Click en cualquier tabla para ver los datos
4. Puedes editar, agregar o eliminar registros directamente

### Opción 2: pgAdmin (Interfaz Gráfica de PostgreSQL)

**pgAdmin** viene instalado automáticamente con PostgreSQL.

**Cómo abrir:**
1. Menú de Inicio → Busca "pgAdmin 4"
2. Se abrirá en tu navegador (normalmente http://127.0.0.1:xxxxx)
3. Te pedirá una contraseña (la que configuraste durante la instalación)

**Cómo conectarte:**
1. Click derecho en "Servers" → "Create" → "Server"
2. En la pestaña "General":
   - Name: `WhatsApp Bot` (o el nombre que quieras)
3. En la pestaña "Connection":
   - Host: `localhost`
   - Port: `5432`
   - Maintenance database: `postgres`
   - Username: `postgres`
   - Password: Tu contraseña de PostgreSQL
4. Click en "Save"

**Para ver tus datos:**
1. Expande: Servers → WhatsApp Bot → Databases → whatsapp_bot → Schemas → public → Tables
2. Click derecho en una tabla → "View/Edit Data" → "All Rows"

**Ventajas:**
- ✅ Interfaz completa de PostgreSQL
- ✅ Puedes ejecutar consultas SQL
- ✅ Ver estructura de tablas, índices, etc.
- ✅ Herramientas avanzadas de administración

### Opción 3: Línea de Comandos (psql)

Si prefieres usar la terminal:

```powershell
# Conectarte a la base de datos
psql -U postgres -d whatsapp_bot

# O si psql no está en el PATH, usa la ruta completa:
# "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d whatsapp_bot
```

**Comandos útiles en psql:**
```sql
-- Listar todas las tablas
\dt

-- Ver estructura de una tabla
\d clients

-- Ver todos los datos de una tabla
SELECT * FROM clients;

-- Salir
\q
```

---

## 📋 Resumen Rápido

### Para iniciar PostgreSQL:
```powershell
# Ver servicios de PostgreSQL
Get-Service | Where-Object {$_.DisplayName -like "*postgres*"}

# Iniciar (reemplaza con el nombre real del servicio)
Start-Service -Name "postgresql-x64-15"
```

### Para ver los datos:
```bash
# Opción más fácil
npm run db:studio
```

### Para verificar que está corriendo:
```powershell
Test-NetConnection -ComputerName localhost -Port 5432
```

---

## ⚠️ Problemas Comunes

### "Error: Can't reach database server"
**Solución:** PostgreSQL no está corriendo. Inícialo desde Services o con PowerShell.

### "psql no se reconoce como comando"
**Solución:** PostgreSQL no está en el PATH. Usa la ruta completa o reinicia PowerShell después de instalar PostgreSQL.

### "Password authentication failed"
**Solución:** La contraseña en el archivo `.env` no coincide con la contraseña de PostgreSQL.

---

## 💡 Recomendación

Para desarrollo diario, usa **Prisma Studio** (`npm run db:studio`). Es la forma más rápida y fácil de ver y editar tus datos.

Para tareas más avanzadas o administración, usa **pgAdmin**.

