# Instalación de PostgreSQL en Windows

## Opción 1: Instalador Oficial (Recomendado)

### Paso 1: Descargar PostgreSQL
1. Ve a: https://www.postgresql.org/download/windows/
2. Haz clic en **"Download the installer"**
3. Descarga el instalador (ejecutable .exe) - versión más reciente

### Paso 2: Instalar PostgreSQL
1. Ejecuta el instalador descargado
2. Sigue el asistente de instalación:
   - **Installation Directory**: Deja el predeterminado (C:\Program Files\PostgreSQL\15)
   - **Select Components**: Marca todo (PostgreSQL Server, pgAdmin 4, Stack Builder, Command Line Tools)
   - **Data Directory**: Deja el predeterminado
   - **Password**: **ELIGE UNA CONTRASEÑA SEGURA Y ANÓTALA** (la necesitarás)
   - **Port**: 5432 (deja el predeterminado)
   - **Advanced Options**: Deja los valores predeterminados
   - **Pre Installation Summary**: Revisa y haz clic en Next
   - **Ready to Install**: Haz clic en Next y espera a que termine

3. **IMPORTANTE**: Al finalizar, desmarca "Launch Stack Builder" (no lo necesitamos)

### Paso 3: Verificar Instalación
Abre PowerShell y ejecuta:
```powershell
psql --version
```

Si ves la versión, está instalado correctamente.

## Opción 2: Chocolatey (Si lo tienes instalado)

```powershell
choco install postgresql --params '/Password:postgres' -y
```

**Nota**: La contraseña será `postgres` (cámbiala después por seguridad)

## Opción 3: Docker (Si tienes Docker Desktop)

```powershell
docker run --name whatsapp-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=whatsapp_bot -p 5432:5432 -d postgres:14
```

**Nota**: La contraseña será `postgres` y la base de datos `whatsapp_bot` se crea automáticamente.

## Configurar la Base de Datos

Una vez instalado PostgreSQL, ejecuta el script de configuración:

```powershell
# Desde la raíz del proyecto
.\scripts\setup-database.ps1
```

El script te pedirá:
- La contraseña del usuario `postgres` (la que elegiste durante la instalación)
- Creará la base de datos `whatsapp_bot`
- Creará el archivo `.env` con la configuración

## Si el script no funciona

Puedes configurar manualmente:

### 1. Crear la base de datos:
```powershell
# Establecer la contraseña como variable de entorno
$env:PGPASSWORD = "TU_CONTRASEÑA"

# Crear la base de datos
psql -U postgres -c "CREATE DATABASE whatsapp_bot;"
```

### 2. Crear archivo `.env`:
Crea un archivo `.env` en la raíz del proyecto con:
```env
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/whatsapp_bot?schema=public"
PORT=3000
SESSION_BASE_DIR=./sessions
```

Reemplaza `TU_CONTRASEÑA` con la contraseña que elegiste.

## Problemas Comunes

### "psql no se reconoce como comando"
PostgreSQL no está en el PATH. Soluciones:
1. Reinicia PowerShell/Terminal después de instalar
2. O usa la ruta completa: `"C:\Program Files\PostgreSQL\15\bin\psql.exe"`
3. O agrega PostgreSQL al PATH manualmente

### "Error de autenticación"
- Verifica que la contraseña sea correcta
- Si usaste Docker, la contraseña por defecto es `postgres`

### "La base de datos ya existe"
No es un problema, significa que ya está creada. Puedes continuar.

## Siguiente Paso

Una vez configurado, ejecuta:
```bash
npm run db:migrate
npm run db:seed
npm start
```

