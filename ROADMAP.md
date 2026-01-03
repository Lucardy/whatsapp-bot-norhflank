# 🗺️ ROADMAP - Escalado del Bot de WhatsApp Multi-Cliente

## 📋 Índice
1. [Contexto Actual](#contexto-actual)
2. [Visión del Producto](#visión-del-producto)
3. [Arquitectura Propuesta](#arquitectura-propuesta)
4. [Etapas de Implementación](#etapas-de-implementación)
5. [Consideraciones Técnicas](#consideraciones-técnicas)
6. [Migración Gradual](#migración-gradual)
7. [Testing y QA](#testing-y-qa)
8. [Deployment y Producción](#deployment-y-producción)

---

## 🎯 Contexto Actual

### Estado Actual del Sistema
- ✅ Bot funcional para un solo cliente (Unikuo)
- ✅ Respuestas automáticas con menú de opciones
- ✅ Sistema de lock exclusivo para evitar múltiples instancias
- ✅ Endpoints HTTP para monitoreo (/health, /state, /qr, /restart)
- ✅ Persistencia de sesión con LocalAuth
- ✅ Funciona localmente y en producción (Northflank)
- ✅ Logs detallados para debugging

### Limitaciones Actuales
- ❌ Solo soporta una cuenta de WhatsApp
- ❌ Configuración hardcodeada en el código
- ❌ Sin base de datos
- ❌ Sin panel de administración
- ❌ Sin sistema de planes/pagos
- ❌ Sin multi-tenancy

---

## 🚀 Visión del Producto

### ¿Qué es el producto?
**SaaS de Bots de WhatsApp Multi-Cliente**

Un sistema que permite a múltiples negocios tener su propio bot de WhatsApp automatizado, cada uno con:
- Su propia cuenta de WhatsApp
- Sus propias respuestas personalizadas
- Sus propias encuestas (futuro)
- Su propio panel de administración
- Sus propios datos y métricas

### ¿Qué NO es?
- ❌ No es un sistema de marketing masivo
- ❌ No es un CRM completo
- ❌ No es un sistema de e-commerce
- ❌ No es un chatbot con IA (por ahora)

### Cliente Ideal
- **Restaurantes**: Menús, horarios, reservas
- **Comercios**: Catálogos, precios, ubicación
- **Servicios**: Información, contacto, cotizaciones
- **Profesionales**: Portfolio, servicios, contacto

### Propuesta de Valor
> "Automatizá las respuestas de tu WhatsApp y gestioná encuestas sin necesidad de estar disponible 24/7"

---

## 🏗️ Arquitectura Propuesta

### Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE 1 (Unikuo)                    │
│  WhatsApp Account → Session 1 → Respuestas Personalizadas│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    CLIENTE 2 (Restaurante)                │
│  WhatsApp Account → Session 2 → Respuestas Personalizadas│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    CLIENTE N (Negocio)                    │
│  WhatsApp Account → Session N → Respuestas Personalizadas│
└─────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  BACKEND ÚNICO  │
                    │  (Node.js/Express)│
                    └─────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  BASE DE DATOS  │
                    │   (PostgreSQL)  │
                    └─────────────────┘
```

### Decisiones Técnicas

#### ✅ Backend Monolítico (por ahora)
- **Razón**: Más simple de desarrollar y mantener inicialmente
- **Futuro**: Separar en microservicios si crece mucho

#### ✅ WhatsApp-web.js como Motor
- **Razón**: Ya funciona, es estable, soporta multi-sesión
- **Alternativa futura**: WhatsApp Business API (oficial, pero más costoso)

#### ✅ Multi-Sesión
- Cada cliente = una instancia de `Client()` independiente
- Cada sesión en carpeta separada: `/sessions/cliente_{id}/`
- Todas las sesiones activas simultáneamente

#### ✅ Base de Datos Centralizada
- **PostgreSQL** (recomendado) o **MySQL**
- Todas las configuraciones, sesiones y datos en un solo lugar
- Fácil de hacer backups y migraciones

#### ✅ Hosting Flexible
- Funciona en Northflank, pero debe ser portable
- Variables de entorno para configuración
- Docker para consistencia local/producción

---

## 📊 Etapas de Implementación

### 🟦 ETAPA 1 – Definición y Preparación (Días 1-2)

#### Tarea 1.1: Documentar Requerimientos
- [ ] Listar todas las funcionalidades actuales
- [ ] Definir funcionalidades nuevas necesarias
- [ ] Priorizar features por valor de negocio
- [ ] Estimar esfuerzo por feature

#### Tarea 1.2: Setup del Entorno de Desarrollo
- [ ] Configurar PostgreSQL localmente
- [ ] Crear estructura de carpetas para multi-cliente
- [ ] Setup de migraciones de base de datos
- [ ] Configurar variables de entorno

**Estructura de Carpetas Propuesta:**
```
whatsapp-bot-norhflank/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── whatsapp.js
│   ├── models/
│   │   ├── Client.js
│   │   ├── Session.js
│   │   └── Message.js
│   ├── services/
│   │   ├── sessionManager.js
│   │   ├── messageHandler.js
│   │   └── responseBuilder.js
│   ├── routes/
│   │   ├── clients.js
│   │   ├── sessions.js
│   │   └── messages.js
│   └── utils/
├── sessions/          # Carpeta para sesiones (gitignored)
│   ├── cliente_1/
│   ├── cliente_2/
│   └── ...
├── migrations/        # Migraciones de DB
├── tests/
├── index.js          # Entry point
└── package.json
```

#### Tarea 1.3: Backup del Código Actual
- [ ] Crear branch `mono-cliente-backup`
- [ ] Documentar estado actual
- [ ] Crear tag de versión estable

**Resultado**: Base sólida para comenzar la migración

---

### 🟦 ETAPA 2 – Modelo de Datos (Días 3-4)

#### Tarea 2.1: Diseño de Base de Datos

**Entidades Principales:**

1. **users** (Administradores del sistema)
   - `id` (PK)
   - `email` (unique)
   - `password_hash`
   - `role` (admin, support)
   - `created_at`
   - `updated_at`

2. **clients** (Negocios que usan el bot)
   - `id` (PK)
   - `name` (nombre del negocio)
   - `contact_phone`
   - `contact_email`
   - `status` (active, suspended, trial)
   - `plan_id` (FK → plans)
   - `created_at`
   - `updated_at`

3. **plans** (Planes de suscripción)
   - `id` (PK)
   - `name` (básico, pro, premium)
   - `price_monthly`
   - `max_sessions` (cuántos WhatsApp puede tener)
   - `max_messages_per_month`
   - `features` (JSON)
   - `created_at`

4. **whatsapp_sessions** (Sesiones de WhatsApp)
   - `id` (PK)
   - `client_id` (FK → clients)
   - `session_name` (identificador único)
   - `phone_number` (número asociado)
   - `status` (connected, disconnected, qr_pending, error)
   - `last_activity`
   - `session_path` (ruta donde se guarda la sesión)
   - `created_at`
   - `updated_at`

5. **client_configs** (Configuración de respuestas por cliente)
   - `id` (PK)
   - `client_id` (FK → clients)
   - `welcome_message` (texto)
   - `menu_options` (JSON)
   - `auto_responses` (JSON)
   - `created_at`
   - `updated_at`

6. **messages** (Log de mensajes - opcional para analytics)
   - `id` (PK)
   - `session_id` (FK → whatsapp_sessions)
   - `from_number`
   - `to_number`
   - `message_body`
   - `direction` (inbound, outbound)
   - `response_sent` (boolean)
   - `created_at`

7. **surveys** (Encuestas - futuro)
   - `id` (PK)
   - `client_id` (FK → clients)
   - `name`
   - `is_active`
   - `created_at`

8. **survey_questions** (Preguntas de encuestas)
   - `id` (PK)
   - `survey_id` (FK → surveys)
   - `question_text`
   - `question_order`
   - `question_type` (text, multiple_choice, etc.)

9. **survey_responses** (Respuestas a encuestas)
   - `id` (PK)
   - `question_id` (FK → survey_questions)
   - `phone_number`
   - `response_text`
   - `created_at`

10. **payments** (Pagos - futuro)
    - `id` (PK)
    - `client_id` (FK → clients)
    - `amount`
    - `payment_method`
    - `status` (pending, completed, failed)
    - `due_date`
    - `paid_at`

#### Tarea 2.2: Crear Migraciones de Base de Datos

**Herramienta recomendada**: `node-pg-migrate` o `knex.js`

**Ejemplo de migración inicial:**
```sql
-- migrations/001_initial_schema.sql
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'trial',
  plan_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE whatsapp_sessions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  session_name VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'qr_pending',
  last_activity TIMESTAMP,
  session_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ... más tablas
```

#### Tarea 2.3: Setup de ORM o Query Builder
- [ ] Elegir herramienta: Sequelize, TypeORM, Prisma, o Knex
- [ ] Configurar conexión a DB
- [ ] Crear modelos/entidades
- [ ] Testear conexión local y producción

**Resultado**: Base de datos diseñada y lista para usar

---

### 🟦 ETAPA 3 – Sistema Multi-Sesión (Días 5-7)

#### Tarea 3.1: Refactorizar Session Manager

**Antes (mono-cliente):**
```javascript
let client = null;
function buildClient() {
  const c = new Client({
    authStrategy: new LocalAuth({ dataPath: '/wwebjs_auth' })
  });
  // ...
}
```

**Después (multi-cliente):**
```javascript
class SessionManager {
  constructor() {
    this.sessions = new Map(); // session_name -> Client instance
  }

  async createSession(clientId, sessionName) {
    const sessionPath = path.join(SESSION_BASE_DIR, `cliente_${clientId}`, sessionName);
    
    const client = new Client({
      authStrategy: new LocalAuth({ dataPath: sessionPath }),
      // ... otras configs
    });
    
    this.setupEventHandlers(client, clientId, sessionName);
    await client.initialize();
    
    this.sessions.set(sessionName, {
      client,
      clientId,
      status: 'initializing',
      lastActivity: new Date()
    });
    
    return client;
  }

  async getSession(sessionName) {
    return this.sessions.get(sessionName);
  }

  async getAllSessions() {
    return Array.from(this.sessions.values());
  }

  async destroySession(sessionName) {
    const session = this.sessions.get(sessionName);
    if (session) {
      await session.client.destroy();
      this.sessions.delete(sessionName);
    }
  }
}
```

#### Tarea 3.2: Sistema de Rutas de Sesión

**Estructura de carpetas:**
```
sessions/
├── cliente_1/
│   ├── session_unikuo/
│   │   ├── .wwebjs_auth/
│   │   └── .wwebjs_cache/
│   └── session_backup/
├── cliente_2/
│   └── session_restaurante/
└── ...
```

**Variables de entorno:**
```env
SESSION_BASE_DIR=./sessions  # Local
SESSION_BASE_DIR=/app/sessions  # Producción
```

#### Tarea 3.3: Gestión de Estado de Sesiones

**Estados posibles:**
- `qr_pending`: Esperando escaneo de QR
- `connecting`: Conectando
- `connected`: Conectado y funcionando
- `disconnected`: Desconectado
- `error`: Error en la sesión

**Lógica de reconexión:**
```javascript
async function reconnectSession(sessionName) {
  const session = await db.getSessionByName(sessionName);
  if (session.status === 'disconnected') {
    await sessionManager.createSession(session.client_id, sessionName);
  }
}
```

#### Tarea 3.4: Manejo de Mensajes Multi-Sesión

**Problema**: ¿Cómo saber a qué sesión pertenece un mensaje entrante?

**Solución**: Cada `Client` tiene su propio listener, pero necesitamos identificar la sesión.

```javascript
// En setupEventHandlers
client.on('message_create', async (msg) => {
  // msg.from contiene el número
  // Necesitamos saber a qué cliente pertenece este número
  
  const session = await db.getSessionByPhoneNumber(msg.from);
  const clientConfig = await db.getClientConfig(session.client_id);
  
  await handleMessage(msg, session, clientConfig);
});
```

**Resultado**: Sistema capaz de manejar múltiples sesiones simultáneamente

---

### 🟦 ETAPA 4 – Sistema de Configuración por Cliente (Días 8-9)

#### Tarea 4.1: Modelo de Configuración

**Estructura JSON para `client_configs.menu_options`:**
```json
{
  "welcome_message": "👋 ¡Hola! Bienvenido a Unikuo...",
  "options": [
    {
      "key": "1",
      "label": "Consultar precios",
      "response": "💰 Nuestros planes..."
    },
    {
      "key": "2",
      "label": "Información de trabajos",
      "response": "🎨 Nuestros trabajos..."
    },
    {
      "key": "3",
      "label": "Ver página web",
      "response": "🌐 https://unikuoweb.com/"
    },
    {
      "key": "4",
      "label": "Hablar con agente",
      "response": "👤 Un agente se comunicará..."
    }
  ],
  "default_response": "👋 ¡Hola! Elige una opción..."
}
```

#### Tarea 4.2: Response Builder Dinámico

```javascript
class ResponseBuilder {
  static async buildResponse(messageText, clientConfig) {
    const text = messageText.trim().toLowerCase();
    
    // Buscar opción en configuración
    const option = clientConfig.options.find(opt => opt.key === text);
    
    if (option) {
      return option.response;
    }
    
    // Respuesta por defecto
    return clientConfig.default_response || clientConfig.welcome_message;
  }
}
```

#### Tarea 4.3: Migración de Configuración Actual

**Script de migración:**
```javascript
// migrations/migrate_unikuo_config.js
async function migrateUnikuoConfig() {
  const client = await db.createClient({
    name: 'Unikuo',
    contact_email: 'contacto@unikuoweb.com',
    status: 'active'
  });
  
  await db.createClientConfig(client.id, {
    welcome_message: "👋 ¡Hola! Bienvenido a Unikuo...",
    menu_options: [
      // ... opciones actuales
    ]
  });
}
```

**Resultado**: Cada cliente tiene su propia configuración de respuestas

---

### 🟦 ETAPA 5 – Onboarding de Clientes (Días 10-12)

#### Tarea 5.1: Flujo de Registro

**Pasos del onboarding:**
1. Cliente se registra (formulario web o panel admin)
2. Se crea registro en `clients`
3. Se crea sesión vacía en `whatsapp_sessions`
4. Se genera QR único para esa sesión
5. Cliente escanea QR
6. Sistema detecta conexión exitosa
7. Cliente activado

#### Tarea 5.2: API de Onboarding

**Endpoints necesarios:**
```
POST /api/clients
  - Crea nuevo cliente
  - Retorna: { client_id, session_name }

GET /api/clients/:id/qr
  - Obtiene QR de la sesión
  - Retorna: imagen QR o URL

GET /api/clients/:id/status
  - Estado de la sesión
  - Retorna: { status, connected_at, last_activity }

POST /api/clients/:id/activate
  - Activa cliente manualmente (admin)
```

#### Tarea 5.3: Panel de Onboarding (Básico)

**Página simple con:**
- Formulario de registro
- Visualización de QR
- Estado de conexión
- Instrucciones paso a paso

**Tecnología**: Puede ser simple HTML + JS, o React/Vue si quieres algo más profesional

**Resultado**: Clientes pueden darse de alta sin intervención manual

---

### 🟦 ETAPA 6 – Panel de Administración (Días 13-16)

#### Tarea 6.1: Panel Interno (Admin)

**Funcionalidades:**
- [ ] Listado de clientes
- [ ] Ver estado de sesiones
- [ ] Forzar reconexión de sesiones
- [ ] Editar configuración de clientes
- [ ] Ver logs de mensajes
- [ ] Suspender/activar clientes
- [ ] Ver pagos y facturación

**Endpoints API:**
```
GET /api/admin/clients
GET /api/admin/clients/:id
PUT /api/admin/clients/:id
POST /api/admin/clients/:id/sessions/:sessionId/reconnect
GET /api/admin/sessions
GET /api/admin/messages
```

#### Tarea 6.2: Panel del Cliente

**Funcionalidades:**
- [ ] Ver estado de su WhatsApp
- [ ] Editar mensajes de bienvenida
- [ ] Editar opciones del menú
- [ ] Ver estadísticas (mensajes recibidos, respuestas enviadas)
- [ ] Ver/descargar datos de encuestas (futuro)
- [ ] Ver facturación y pagos

**Endpoints API:**
```
GET /api/client/me
PUT /api/client/me/config
GET /api/client/me/stats
GET /api/client/me/sessions
```

#### Tarea 6.3: Autenticación y Autorización

**Sistema de roles:**
- `admin`: Acceso total
- `client`: Solo su propia información
- `support`: Acceso de solo lectura

**Implementación:**
- JWT tokens para autenticación
- Middleware de autorización por rol
- Protección de rutas

**Resultado**: Paneles funcionales para administrar el sistema

---

### 🟦 ETAPA 7 – Sistema de Planes y Pagos (Días 17-20)

#### Tarea 7.1: Definir Planes

**Planes sugeridos:**

**Plan Básico:**
- 1 WhatsApp
- 1 encuesta activa
- Hasta 500 mensajes/mes
- Soporte por email
- Precio: $XX/mes

**Plan Pro:**
- 1 WhatsApp
- Múltiples encuestas
- Hasta 2000 mensajes/mes
- Exportar datos
- Soporte prioritario
- Precio: $XX/mes

**Plan Premium:**
- Múltiples WhatsApp
- Encuestas ilimitadas
- Mensajes ilimitados
- API access
- Soporte 24/7
- Precio: $XX/mes

#### Tarea 7.2: Integración de Pagos

**Opciones:**
1. **MercadoPago** (Argentina/Latinoamérica)
2. **Stripe** (Internacional)
3. **Transferencia manual** (inicial)

**Flujo:**
1. Cliente elige plan
2. Se genera link de pago
3. Cliente paga
4. Webhook confirma pago
5. Plan activado automáticamente
6. WhatsApp se conecta (si estaba suspendido)

#### Tarea 7.3: Lógica de Suscripciones

**Estados de cliente:**
- `trial`: Período de prueba (7-14 días)
- `active`: Pagando y activo
- `suspended`: No pagó, suspendido
- `cancelled`: Canceló suscripción

**Lógica de suspensión:**
```javascript
async function checkPayments() {
  const overdueClients = await db.getOverdueClients();
  
  for (const client of overdueClients) {
    await suspendClient(client.id);
    await disconnectSessions(client.id);
  }
}

// Ejecutar diariamente con cron
```

**Resultado**: Sistema de cobro funcional

---

### 🟦 ETAPA 8 – Seguridad y Límites (Días 21-22)

#### Tarea 8.1: Control de Abusos

**Límites por plan:**
- Mensajes por mes
- Respuestas automáticas por día
- Tamaño de mensajes
- Frecuencia de envío

**Implementación:**
```javascript
async function checkLimits(clientId, messageCount) {
  const client = await db.getClient(clientId);
  const plan = await db.getPlan(client.plan_id);
  
  const monthlyMessages = await db.getMonthlyMessageCount(clientId);
  
  if (monthlyMessages >= plan.max_messages_per_month) {
    throw new Error('Límite de mensajes alcanzado');
  }
}
```

#### Tarea 8.2: Anti-Spam

**Protecciones:**
- Cooldown entre mensajes (ya implementado)
- Límite de mensajes por número por hora
- Blacklist de números
- Detección de patrones sospechosos

#### Tarea 8.3: Logs y Auditoría

**Qué registrar:**
- Todos los mensajes entrantes/salientes
- Cambios de configuración
- Acciones de admin
- Errores y excepciones
- Accesos al panel

**Resultado**: Sistema seguro y protegido contra abusos

---

### 🟦 ETAPA 9 – Testing y QA (Días 23-25)

#### Tarea 9.1: Tests Unitarios

**Qué testear:**
- SessionManager
- ResponseBuilder
- MessageHandler
- Database queries

**Herramientas**: Jest, Mocha

#### Tarea 9.2: Tests de Integración

**Escenarios:**
- Crear cliente → Generar QR → Escanear → Recibir mensaje
- Múltiples clientes simultáneos
- Reconexión de sesiones
- Cambio de configuración en tiempo real

#### Tarea 9.3: Tests de Carga

**Objetivos:**
- 10 clientes simultáneos
- 100 mensajes/minuto
- Múltiples sesiones activas

**Herramientas**: Artillery, k6

**Resultado**: Sistema probado y confiable

---

### 🟦 ETAPA 10 – Escalado y Optimización (Días 26-30)

#### Tarea 10.1: Optimización de Base de Datos

**Acciones:**
- Índices en columnas frecuentemente consultadas
- Particionado de tablas grandes (messages)
- Caché de configuraciones
- Connection pooling

#### Tarea 10.2: Separación de Workers (Futuro)

**Arquitectura propuesta:**
```
┌─────────────┐
│  API Server │  (Express, maneja HTTP)
└──────┬──────┘
       │
┌──────▼──────┐
│  Message    │  (Worker, procesa mensajes)
│  Processor  │
└──────┬──────┘
       │
┌──────▼──────┐
│  Session    │  (Worker, maneja sesiones)
│  Manager    │
└─────────────┘
```

#### Tarea 10.3: Monitoreo y Alertas

**Métricas a monitorear:**
- Sesiones activas
- Mensajes por minuto
- Errores y excepciones
- Uso de recursos (CPU, memoria)
- Estado de base de datos

**Herramientas**: 
- Prometheus + Grafana
- Sentry para errores
- Logs centralizados (ELK stack)

#### Tarea 10.4: Backups y Recuperación

**Estrategia:**
- Backup diario de base de datos
- Backup de sesiones de WhatsApp (importante!)
- Plan de recuperación documentado
- Tests de restauración periódicos

**Resultado**: Sistema preparado para crecer

---

## 🔧 Consideraciones Técnicas

### Variables de Entorno

**Archivo `.env.example`:**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_bot
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_bot
DB_USER=user
DB_PASSWORD=password

# Sessions
SESSION_BASE_DIR=./sessions
FORCE_LOCK_RESET=false

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Payments (futuro)
MERCADOPAGO_ACCESS_TOKEN=
STRIPE_SECRET_KEY=

# Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme
```

### Estructura de Configuración

**`src/config/index.js`:**
```javascript
export default {
  database: {
    url: process.env.DATABASE_URL,
    // ...
  },
  whatsapp: {
    sessionBaseDir: process.env.SESSION_BASE_DIR || './sessions',
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // ...
      ]
    }
  },
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  }
};
```

### Manejo de Errores

**Estrategia:**
- Try-catch en todas las funciones async
- Logs estructurados (usar winston o pino)
- Notificaciones de errores críticos (email/Slack)
- Retry logic para operaciones críticas

### Performance

**Optimizaciones:**
- Caché de configuraciones de clientes (Redis opcional)
- Lazy loading de sesiones
- Procesamiento asíncrono de mensajes
- Connection pooling para DB

---

## 🔄 Migración Gradual

### Fase 1: Preparación (Semana 1)
- [ ] Setup de base de datos
- [ ] Crear modelos y migraciones
- [ ] Migrar configuración actual de Unikuo a DB

### Fase 2: Refactorización (Semana 2)
- [ ] Crear SessionManager
- [ ] Refactorizar código actual para usar SessionManager
- [ ] Mantener compatibilidad con sistema actual

### Fase 3: Multi-Sesión (Semana 3)
- [ ] Implementar soporte para múltiples sesiones
- [ ] Testing con 2-3 clientes de prueba
- [ ] Ajustes y correcciones

### Fase 4: Paneles (Semana 4)
- [ ] Panel de administración básico
- [ ] Panel de cliente básico
- [ ] Autenticación y autorización

### Fase 5: Producción (Semana 5)
- [ ] Migrar Unikuo a nuevo sistema
- [ ] Onboarding de primeros clientes reales
- [ ] Monitoreo y ajustes

---

## 🧪 Testing y QA

### Checklist de Testing

**Funcionalidad:**
- [ ] Crear cliente nuevo
- [ ] Generar QR
- [ ] Escanear QR y conectar
- [ ] Enviar mensaje y recibir respuesta
- [ ] Múltiples clientes simultáneos
- [ ] Cambiar configuración en tiempo real
- [ ] Reconexión automática de sesiones
- [ ] Suspensión por falta de pago

**Performance:**
- [ ] 10 sesiones activas simultáneas
- [ ] 100 mensajes/minuto
- [ ] Tiempo de respuesta < 2 segundos

**Seguridad:**
- [ ] Autenticación funciona
- [ ] Clientes solo ven sus datos
- [ ] Límites de plan se respetan
- [ ] No hay inyección SQL

---

## 🚀 Deployment y Producción

### Checklist Pre-Deployment

- [ ] Todas las migraciones ejecutadas
- [ ] Variables de entorno configuradas
- [ ] Volumen persistente para sesiones montado
- [ ] Base de datos respaldada
- [ ] Logs configurados
- [ ] Monitoreo activo
- [ ] Plan de rollback preparado

### Proceso de Deployment

1. **Backup completo**
   ```bash
   pg_dump whatsapp_bot > backup_$(date +%Y%m%d).sql
   ```

2. **Deploy código nuevo**
   - Push a GitHub
   - Northflank detecta cambios
   - Build automático

3. **Ejecutar migraciones**
   ```bash
   npm run migrate:up
   ```

4. **Verificar**
   - Health check
   - Probar con cliente de prueba
   - Monitorear logs

5. **Rollback si es necesario**
   ```bash
   npm run migrate:down
   # Revertir a versión anterior
   ```

### Monitoreo en Producción

**Métricas clave:**
- Sesiones activas
- Mensajes procesados/minuto
- Tasa de error
- Tiempo de respuesta
- Uso de recursos

**Alertas:**
- Sesión desconectada > 5 minutos
- Tasa de error > 5%
- CPU > 80%
- Memoria > 90%

---

## 📝 Notas Finales

### Prioridades

1. **Crítico**: Multi-sesión funcional
2. **Importante**: Base de datos y configuración
3. **Deseable**: Paneles y pagos
4. **Futuro**: Encuestas, analytics avanzados

### Decisiones Pendientes

- [ ] ¿Qué ORM usar? (Sequelize, Prisma, Knex)
- [ ] ¿Panel frontend? (React, Vue, o simple HTML)
- [ ] ¿Sistema de pagos? (MercadoPago, Stripe)
- [ ] ¿Hosting definitivo? (Northflank, AWS, otros)

### Recursos Útiles

- Documentación WhatsApp-web.js: https://wwebjs.dev/
- PostgreSQL docs: https://www.postgresql.org/docs/
- Node.js best practices: https://github.com/goldbergyoni/nodebestpractices

---

## ✅ Checklist General de Progreso

### Fase Actual: Preparación
- [ ] Base de datos diseñada
- [ ] Migraciones creadas
- [ ] Estructura de carpetas definida
- [ ] Variables de entorno configuradas

### Próximos Pasos
1. Implementar modelo de datos
2. Crear SessionManager
3. Migrar código actual
4. Testing básico
5. Primer cliente de prueba

---

**Última actualización**: 2026-01-02
**Versión del roadmap**: 1.0

