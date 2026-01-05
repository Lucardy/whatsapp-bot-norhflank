# Sistema de Menús Interactivos

Este directorio contiene todos los módulos relacionados con los menús interactivos del bot.

## 📁 Estructura

```
menu/
├── index.js              # Punto de entrada - exporta funciones principales
├── initialMenu.js         # Menú inicial al arrancar el bot
├── mainMenu.js            # Menú principal de gestión de sesiones
├── sessionHelpers.js      # Utilidades compartidas para sesiones
│
├── handlers/              # Acciones del menú (handlers)
│   ├── addSession.js      # Agregar nuevo cliente
│   ├── removeSession.js   # Eliminar cliente
│   ├── updateSession.js   # Actualizar cliente existente
│   ├── regenerateQR.js    # Regenerar QR / cambiar WhatsApp
│   ├── listSessions.js    # Listar clientes configurados
│
└── README.md             # Esta documentación
```

## 🔧 Módulos

### `index.js`
Punto de entrada principal. Exporta las funciones públicas del sistema de menús.

**Exporta:**
- `showInitialMenu()` - Menú inicial
- `showSessionManagementMenu()` - Menú de gestión
- Utilidades de `sessionHelpers.js`

### `initialMenu.js`
Muestra el menú inicial cuando se arranca el bot. Permite elegir entre:
- Iniciar bot directamente
- Gestionar sesiones primero
- Gestionar sesiones y luego iniciar bot
- Salir

### `mainMenu.js`
Menú principal de gestión de sesiones. Permite:
- Agregar nuevo cliente
- Actualizar cliente existente
- Cambiar WhatsApp de un cliente
- Eliminar cliente
- Ver clientes configurados
- Ver links de QR
- Continuar e iniciar bot (si no está corriendo)

### `sessionHelpers.js`
Utilidades compartidas para trabajar con sesiones:
- `loadSessions()` - Cargar sesiones desde DB o archivo
- `saveSessions()` - Guardar sesiones en DB y archivo
- `sessionExists()` - Verificar si una sesión existe físicamente
- `getSessionPath()` - Obtener ruta de una sesión
- `getAuthPath()` - Obtener ruta de autenticación
- `getPort()` - Obtener puerto configurado

### Handlers (`handlers/`)

Cada handler es responsable de una acción específica del menú:

#### `addSession.js`
Agrega un nuevo cliente/sesión. Si el bot está corriendo, crea la sesión dinámicamente.

#### `removeSession.js`
Elimina un cliente/sesión. Si el bot está corriendo, elimina la sesión dinámicamente.

#### `updateSession.js`
Actualiza información de un cliente existente:
- Renombrar cliente
- Cambiar cliente asociado
- Actualizar número de teléfono
- Actualizar estado

#### `regenerateQR.js`
Regenera el QR de un cliente (útil para cambiar WhatsApp).

#### `listSessions.js`
Lista todos los clientes configurados con su estado.

## 🚀 Uso

### Desde el código principal

```javascript
import { showInitialMenu, showSessionManagementMenu } from './utils/menu/index.js';

// Menú inicial
const result = await showInitialMenu();

// Menú de gestión (con bot corriendo)
await showSessionManagementMenu(sessionManager, true);
```

### Desde la línea de comandos

```bash
# Menú inicial (al arrancar)
npm start

# Menú de gestión (mientras el bot está corriendo)
npm run manage
```

## 📝 Convenciones

1. **Todos los handlers** reciben `sessionManager` como primer parámetro (puede ser `null`)
2. **Todos los handlers** usan `sessionHelpers.js` para operaciones comunes
3. **Todas las funciones** son `async` para soportar operaciones asíncronas
4. **Todas las funciones** muestran mensajes claros al usuario

## 🔄 Flujo de Datos

```
Usuario → Menú → Handler → SessionManager/DB → Resultado → Usuario
```

## 🛠️ Agregar Nuevo Handler

1. Crear archivo en `handlers/nuevoHandler.js`
2. Exportar función `async function nuevoHandler(sessionManager = null)`
3. Importar en `mainMenu.js`
4. Agregar opción en el menú
5. Agregar caso en el `switch`

## 📚 Dependencias

- `inquirer` - Para menús interactivos
- `fs` - Para operaciones de archivos
- `path` - Para rutas
- `getPrisma()` - Para acceso a base de datos
- `SessionManager` - Para gestión de sesiones

