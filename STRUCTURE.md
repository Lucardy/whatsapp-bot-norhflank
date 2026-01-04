# 🏗️ Estructura del Proyecto

## 📁 Organización de Carpetas

```
whatsapp-bot-norhflank/
├── src/                          # Código fuente principal
│   ├── config/
│   │   └── index.js             # Configuración del sistema
│   ├── services/
│   │   ├── sessionManager.js    # Gestión de sesiones de WhatsApp
│   │   └── messageHandler.js    # Procesamiento de mensajes
│   ├── routes/
│   │   └── index.js             # Rutas HTTP (API)
│   ├── utils/
│   │   └── logger.js            # Utilidad de logging
│   └── index.js                 # Entry point principal
│
├── sessions/                     # Sesiones de WhatsApp (se suben a GitHub)
│   ├── unikuo/
│   ├── pablo/
│   └── ...
│
├── manage-sessions.js           # Script interactivo para gestionar sesiones
├── sessions-config.json         # Configuración de sesiones
├── index.js                     # (Legacy - mantener por compatibilidad)
├── package.json
├── Dockerfile
└── README.md
```

## 📦 Módulos y Responsabilidades

### `src/config/index.js`
**Responsabilidad**: Carga y gestión de configuración
- Carga de sesiones desde variable de entorno o archivo JSON
- Configuración de rutas y puertos
- Valores por defecto

**Exporta**:
- `loadSessionsConfig()` - Función para cargar sesiones
- `config` - Objeto con toda la configuración

### `src/utils/logger.js`
**Responsabilidad**: Logging consistente
- Formato uniforme de logs
- Logs con prefijo de sesión

**Exporta**:
- `log(...args)` - Log general
- `logSession(sessionId, ...args)` - Log con prefijo de sesión

### `src/services/sessionManager.js`
**Responsabilidad**: Gestión de múltiples sesiones de WhatsApp
- Creación y destrucción de sesiones
- Manejo de eventos de WhatsApp (ready, qr, disconnected, etc.)
- Inicialización y reconexión automática

**Clase**: `SessionManager`
- `createSession(sessionId)` - Crea una nueva sesión
- `getSession(sessionId)` - Obtiene datos de una sesión
- `getAllSessions()` - Lista todas las sesiones
- `ensureInit(sessionId)` - Inicializa/reinicia una sesión

### `src/services/messageHandler.js`
**Responsabilidad**: Procesamiento de mensajes entrantes
- Filtrado de mensajes (propios, grupos, estado)
- Cooldown anti-spam
- Lógica de respuestas según el texto recibido

**Exporta**:
- `handleMessage(msg, sessionId)` - Procesa un mensaje y envía respuesta

### `src/routes/index.js`
**Responsabilidad**: Endpoints HTTP del servidor
- Rutas para monitoreo y gestión
- Endpoints de QR, estado, health check

**Exporta**:
- `setupRoutes(app, sessionManager, sessionsConfig)` - Configura todas las rutas

### `src/index.js`
**Responsabilidad**: Entry point y orquestación
- Inicialización del sistema
- Setup del servidor HTTP
- Heartbeat de sesiones
- Manejo de errores globales

## 🔄 Flujo de Ejecución

1. **Inicio** (`src/index.js`)
   - Carga configuración
   - Crea SessionManager
   - Inicializa servidor HTTP
   - Inicia todas las sesiones configuradas

2. **Sesión** (`src/services/sessionManager.js`)
   - Crea cliente de WhatsApp
   - Configura listeners de eventos
   - Inicializa conexión
   - Registra handler de mensajes

3. **Mensaje** (`src/services/messageHandler.js`)
   - Recibe mensaje
   - Filtra y valida
   - Determina respuesta
   - Envía respuesta

4. **HTTP** (`src/routes/index.js`)
   - Recibe requests
   - Consulta SessionManager
   - Retorna información/QRs

## 🔌 Dependencias entre Módulos

```
src/index.js
  ├── config/index.js
  ├── services/sessionManager.js
  │   ├── utils/logger.js
  │   └── services/messageHandler.js
  │       └── utils/logger.js
  └── routes/index.js
      └── utils/logger.js
```

## 📝 Convenciones

### Nombres de Archivos
- `camelCase.js` para archivos de módulos
- `index.js` para puntos de entrada de carpetas

### Exportaciones
- Usar `export` (ES modules)
- Un archivo = una responsabilidad principal

### Logging
- Usar `log()` para logs generales
- Usar `logSession(sessionId, ...)` para logs de sesión específica

## 🚀 Próximos Pasos (Según ROADMAP)

1. **Base de Datos**: Agregar `src/models/` y `src/db/`
2. **Configuración por Cliente**: Agregar `src/services/configService.js`
3. **Panel Admin**: Agregar `src/routes/admin.js` y `src/routes/client.js`
4. **Autenticación**: Agregar `src/middleware/auth.js`

## ✅ Ventajas de esta Estructura

- ✅ **Separación de responsabilidades**: Cada módulo tiene una función clara
- ✅ **Escalable**: Fácil agregar nuevos módulos sin afectar existentes
- ✅ **Testeable**: Cada módulo se puede testear independientemente
- ✅ **Mantenible**: Código organizado y fácil de encontrar
- ✅ **Reutilizable**: Módulos pueden usarse en diferentes contextos

