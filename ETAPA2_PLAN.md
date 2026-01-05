# 🗺️ ETAPA 2 - Modelo de Datos - Plan de Implementación

## 🎯 Objetivo
Implementar base de datos PostgreSQL para almacenar clientes, sesiones, configuraciones y datos del sistema.

## 📋 Tareas

### Tarea 2.1: Setup Inicial de Base de Datos
- [ ] Instalar PostgreSQL (si no está instalado)
- [ ] Crear base de datos `whatsapp_bot`
- [ ] Elegir ORM/Query Builder
- [ ] Instalar dependencias necesarias

**Recomendación de ORM**: **Prisma** 
- ✅ Moderno y type-safe
- ✅ Migraciones automáticas
- ✅ Excelente para TypeScript (aunque usamos JS, funciona bien)
- ✅ Fácil de usar y mantener
- ✅ Alternativa: **Knex.js** (más ligero, más control)

### Tarea 2.2: Configuración de Conexión
- [ ] Crear `src/config/database.js`
- [ ] Configurar variables de entorno
- [ ] Crear archivo `.env.example`
- [ ] Testear conexión local

### Tarea 2.3: Crear Migraciones
- [ ] Tabla `plans` (planes de suscripción)
- [ ] Tabla `clients` (negocios/clientes)
- [ ] Tabla `whatsapp_sessions` (sesiones de WhatsApp)
- [ ] Tabla `client_configs` (configuración de respuestas)
- [ ] Tabla `users` (administradores - futuro)

### Tarea 2.4: Crear Modelos
- [ ] `src/models/Plan.js`
- [ ] `src/models/Client.js`
- [ ] `src/models/WhatsAppSession.js`
- [ ] `src/models/ClientConfig.js`

### Tarea 2.5: Migración de Datos Actuales
- [ ] Script para migrar sesiones de `sessions-config.json` a DB
- [ ] Migrar configuración actual de Unikuo
- [ ] Verificar que todo funcione

## 🔧 Decisiones Técnicas

### ORM Elegido: Prisma
**Razones:**
- Migraciones automáticas y versionadas
- Type-safe (aunque usemos JS)
- Excelente documentación
- Fácil de mantener

**Alternativa si prefieres más control**: Knex.js

### Estructura de Base de Datos

**Tablas prioritarias (implementar primero):**
1. `plans` - Planes de suscripción
2. `clients` - Clientes/negocios
3. `whatsapp_sessions` - Sesiones de WhatsApp
4. `client_configs` - Configuración de respuestas

**Tablas futuras (después):**
5. `users` - Administradores
6. `messages` - Log de mensajes
7. `surveys` - Encuestas
8. `payments` - Pagos

## 📝 Próximos Pasos Inmediatos

1. **Decidir ORM**: ¿Prisma o Knex?
2. **Instalar PostgreSQL** (si no está)
3. **Configurar conexión**
4. **Crear primera migración**

---

¿Comenzamos con la configuración de Prisma y PostgreSQL?

