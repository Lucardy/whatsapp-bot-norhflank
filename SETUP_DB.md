# Configuración de Base de Datos - ETAPA 2

Este documento explica cómo configurar la base de datos PostgreSQL para el proyecto.

## Opciones de Base de Datos

### Opción 1: PostgreSQL Local (Recomendado para desarrollo)

#### Windows:
1. **Instalar PostgreSQL:**
   - Descarga desde: https://www.postgresql.org/download/windows/
   - O usa un instalador como PostgreSQL Installer
   - Durante la instalación, configura una contraseña para el usuario `postgres`

2. **Crear la base de datos:**
   ```bash
   # Conectarse a PostgreSQL (abre psql desde el menú de inicio o desde la terminal)
   psql -U postgres
   
   # Crear la base de datos
   CREATE DATABASE whatsapp_bot;
   
   # Salir
   \q
   ```

3. **Configurar DATABASE_URL en `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/whatsapp_bot?schema=public"
   ```
   Reemplaza `TU_PASSWORD` con la contraseña que configuraste durante la instalación.

#### macOS (con Homebrew):
```bash
# Instalar PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Crear base de datos
createdb whatsapp_bot

# Configurar DATABASE_URL en .env
DATABASE_URL="postgresql://$(whoami)@localhost:5432/whatsapp_bot?schema=public"
```

#### Linux (Ubuntu/Debian):
```bash
# Instalar PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Crear base de datos
sudo -u postgres createdb whatsapp_bot

# Configurar DATABASE_URL en .env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/whatsapp_bot?schema=public"
```

### Opción 2: Supabase (Gratis, en la nube)

1. **Crear cuenta en Supabase:**
   - Ve a https://supabase.com
   - Crea un proyecto nuevo
   - Ve a Settings > Database
   - Copia la "Connection string" (URI)

2. **Configurar DATABASE_URL en `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:[TU_PASSWORD]@db.[TU_PROJECT].supabase.co:5432/postgres?schema=public"
   ```
   Reemplaza `[TU_PASSWORD]` y `[TU_PROJECT]` con tus valores.

### Opción 3: Railway (Gratis, en la nube)

1. **Crear cuenta en Railway:**
   - Ve a https://railway.app
   - Crea un proyecto nuevo
   - Agrega un servicio PostgreSQL
   - Copia la "DATABASE_URL" de las variables de entorno

2. **Configurar DATABASE_URL en `.env`:**
   ```env
   DATABASE_URL="[URL_DE_RAILWAY]"
   ```

## Pasos para Configurar el Proyecto

Una vez que tengas la base de datos configurada:

### 1. Crear archivo `.env` (si no existe):
```bash
cp env.example .env
```

### 2. Editar `.env` y agregar DATABASE_URL:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/whatsapp_bot?schema=public"
```

### 3. Crear las migraciones:
```bash
npm run db:migrate
```
Esto creará todas las tablas en la base de datos.

### 4. Poblar la base de datos con datos iniciales:
```bash
npm run db:seed
```
Esto creará:
- Planes básicos (básico, pro)
- Clientes (Unikuo, Pablo)
- Sesiones de WhatsApp (unikuo, pablo)
- Configuraciones de respuestas

### 5. Verificar que todo funciona:
```bash
npm start
```

Deberías ver en la consola:
```
✅ Base de datos conectada - usando configuración desde DB
📋 Sesiones configuradas: [ 'unikuo', 'pablo' ]
```

## Verificar la Base de Datos

Puedes usar Prisma Studio para ver los datos:
```bash
npm run db:studio
```

Esto abrirá una interfaz web en http://localhost:5555 donde podrás ver y editar los datos.

## Para Producción (Northflank)

En Northflank, configura la variable de entorno `DATABASE_URL` en el panel de configuración del servicio. Northflank puede crear automáticamente una base de datos PostgreSQL para ti, o puedes usar una externa.

## Troubleshooting

### Error: "Can't reach database server"
- Verifica que PostgreSQL esté corriendo
- Verifica que la URL de conexión sea correcta
- Verifica que el puerto (5432 por defecto) esté abierto

### Error: "password authentication failed"
- Verifica que la contraseña en DATABASE_URL sea correcta
- En PostgreSQL local, puedes resetear la contraseña del usuario postgres

### Error: "database does not exist"
- Crea la base de datos manualmente (ver instrucciones arriba)
- O usa `createdb whatsapp_bot` desde la terminal

