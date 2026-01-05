# 📚 ETAPA 2 - Instrucciones de Implementación

## 🎯 Objetivo
Configurar la base de datos PostgreSQL y crear el modelo de datos para el sistema multi-cliente.

## ✅ Lo que ya está hecho

1. ✅ Schema de Prisma creado (`prisma/schema.prisma`)
2. ✅ Configuración de DB creada (`src/config/database.js`)
3. ✅ Dependencias agregadas a `package.json`
4. ✅ Scripts de Prisma agregados

## 📋 Pasos para Completar la ETAPA 2

### Paso 1: Instalar PostgreSQL

**Windows:**
1. Descargar desde: https://www.postgresql.org/download/windows/
2. Instalar con valores por defecto
3. Recordar la contraseña del usuario `postgres`

**Alternativa rápida (Docker):**
```bash
docker run --name postgres-whatsapp -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=whatsapp_bot -p 5432:5432 -d postgres:15
```

### Paso 2: Crear Base de Datos

**Opción A - Desde psql:**
```bash
psql -U postgres
CREATE DATABASE whatsapp_bot;
\q
```

**Opción B - Desde línea de comandos:**
```bash
createdb -U postgres whatsapp_bot
```

### Paso 3: Configurar Variables de Entorno

1. Copiar `env.example` a `.env`:
   ```bash
   cp env.example .env
   ```

2. Editar `.env` y configurar `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/whatsapp_bot
   ```

### Paso 4: Instalar Dependencias

```bash
npm install
```

### Paso 5: Generar Cliente de Prisma

```bash
npm run db:generate
```

### Paso 6: Crear Migraciones

```bash
npm run db:migrate
```

Esto creará las tablas en la base de datos.

### Paso 7: (Opcional) Abrir Prisma Studio

```bash
npm run db:studio
```

Esto abre una interfaz visual para ver y editar datos.

## 🧪 Verificar que Funciona

Crear un archivo de prueba `test-db.js`:

```javascript
import { getPrisma, testConnection } from './src/config/database.js';

async function test() {
  const connected = await testConnection();
  if (!connected) {
    console.log('❌ No se pudo conectar');
    process.exit(1);
  }
  
  const db = getPrisma();
  
  // Crear un plan de prueba
  const plan = await db.plan.create({
    data: {
      name: 'básico',
      price_monthly: 0,
      max_sessions: 1,
      max_messages_per_month: 500
    }
  });
  
  console.log('✅ Plan creado:', plan);
  
  await db.$disconnect();
}

test();
```

Ejecutar: `node test-db.js`

## 📊 Estructura de Tablas Creadas

1. **plans** - Planes de suscripción
2. **clients** - Clientes/negocios
3. **whatsapp_sessions** - Sesiones de WhatsApp
4. **client_configs** - Configuración de respuestas
5. **users** - Administradores (futuro)
6. **messages** - Log de mensajes (opcional)

## 🔄 Próximos Pasos (Después de completar ETAPA 2)

1. Migrar sesiones actuales de `sessions-config.json` a DB
2. Integrar DB con SessionManager
3. Crear servicios para gestionar clientes
4. Implementar configuración dinámica por cliente

---

**¿Necesitas ayuda con algún paso?** Avísame y te guío.

