# Guía de Instalación de PostgreSQL - Paso a Paso

## 📋 Resumen

Necesitamos instalar PostgreSQL localmente para que el bot pueda usar la base de datos. Te guiaré paso a paso.

## 🚀 Instalación Rápida

### Paso 1: Descargar PostgreSQL

1. Abre tu navegador
2. Ve a: **https://www.postgresql.org/download/windows/**
3. Haz clic en el botón **"Download the installer"**
4. Se descargará un archivo `.exe` (ejecutable)

### Paso 2: Instalar PostgreSQL

1. **Ejecuta el instalador** que descargaste
2. Sigue estos pasos en el asistente:

   **a) Welcome Screen**
   - Haz clic en "Next"

   **b) Installation Directory**
   - Deja el predeterminado: `C:\Program Files\PostgreSQL\15`
   - Haz clic en "Next"

   **c) Select Components**
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4 (interfaz gráfica, útil para ver la DB)
   - ✅ Stack Builder (opcional)
   - ✅ Command Line Tools (IMPORTANTE - para psql)
   - Haz clic en "Next"

   **d) Data Directory**
   - Deja el predeterminado
   - Haz clic en "Next"

   **e) Password (MUY IMPORTANTE)**
   - **Elige una contraseña segura**
   - **ANÓTALA** - la necesitarás después
   - Ejemplo: `MiPassword123!`
   - Haz clic en "Next"

   **f) Port**
   - Deja `5432` (predeterminado)
   - Haz clic en "Next"

   **g) Advanced Options**
   - Deja "Default locale" (o elige Spanish, Argentina)
   - Haz clic en "Next"

   **h) Pre Installation Summary**
   - Revisa la configuración
   - Haz clic en "Next"

   **i) Ready to Install**
   - Haz clic en "Next"
   - Espera a que termine la instalación (puede tardar unos minutos)

   **j) Completing the Setup Wizard**
   - ✅ Desmarca "Launch Stack Builder" (no lo necesitamos)
   - Haz clic en "Finish"

### Paso 3: Verificar Instalación

1. Abre **PowerShell** (como Administrador si es posible)
2. Ejecuta:
   ```powershell
   psql --version
   ```

   Si ves algo como `psql (PostgreSQL) 15.x`, ¡está instalado correctamente!

   **Si no funciona:**
   - Cierra y vuelve a abrir PowerShell
   - O reinicia tu computadora

## ⚙️ Configurar la Base de Datos

Una vez instalado PostgreSQL, ejecuta el script de configuración:

```powershell
# Desde la raíz del proyecto
.\scripts\setup-database.ps1
```

El script te pedirá:
- La contraseña que elegiste durante la instalación
- Creará la base de datos `whatsapp_bot`
- Creará el archivo `.env` con la configuración

## 🔧 Si el Script No Funciona

### Opción A: Configuración Manual

1. **Abre PowerShell** y ejecuta:
   ```powershell
   # Establecer la contraseña (reemplaza TU_CONTRASEÑA)
   $env:PGPASSWORD = "TU_CONTRASEÑA"
   
   # Crear la base de datos
   psql -U postgres -c "CREATE DATABASE whatsapp_bot;"
   ```

2. **Crea el archivo `.env`** en la raíz del proyecto:
   ```env
   DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/whatsapp_bot?schema=public"
   PORT=3000
   SESSION_BASE_DIR=./sessions
   ```
   
   Reemplaza `TU_CONTRASEÑA` con la contraseña que elegiste.

### Opción B: Usar pgAdmin (Interfaz Gráfica)

1. Abre **pgAdmin 4** (debería estar en el menú de inicio)
2. Conéctate al servidor (te pedirá la contraseña)
3. Click derecho en "Databases" → "Create" → "Database"
4. Nombre: `whatsapp_bot`
5. Haz clic en "Save"
6. Crea el archivo `.env` manualmente (ver Opción A, paso 2)

## ✅ Verificar que Todo Funciona

Después de configurar, ejecuta:

```bash
# Crear las tablas en la base de datos
npm run db:migrate

# Poblar con datos iniciales (Unikuo y Pablo)
npm run db:seed

# Iniciar el bot
npm start
```

Deberías ver en la consola:
```
✅ Base de datos conectada - usando configuración desde DB
📋 Sesiones configuradas: [ 'unikuo', 'pablo' ]
```

## 🆘 Problemas Comunes

### "psql no se reconoce como comando"
**Solución:**
1. Reinicia PowerShell/Terminal
2. O reinicia tu computadora
3. O agrega PostgreSQL al PATH manualmente:
   - Busca "Variables de entorno" en Windows
   - Agrega `C:\Program Files\PostgreSQL\15\bin` al PATH

### "Error de autenticación"
**Solución:**
- Verifica que la contraseña sea correcta
- Si olvidaste la contraseña, puedes resetearla desde pgAdmin

### "La base de datos ya existe"
**Solución:**
- No es un problema, significa que ya está creada
- Puedes continuar con `npm run db:migrate`

### "No se puede conectar al servidor"
**Solución:**
- Verifica que el servicio de PostgreSQL esté corriendo:
  - Abre "Servicios" en Windows
  - Busca "postgresql-x64-15" (o similar)
  - Si está detenido, inícialo

## 📚 Recursos Adicionales

- Documentación oficial: https://www.postgresql.org/docs/
- pgAdmin (interfaz gráfica): Se instala automáticamente con PostgreSQL

## 🎯 Siguiente Paso

Una vez que PostgreSQL esté instalado y configurado, continúa con:
```bash
npm run db:migrate
npm run db:seed
npm start
```

