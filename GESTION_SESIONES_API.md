# API de Gestión de Sesiones en Tiempo Real

## 🚀 Gestión Dinámica de Sesiones

Ahora puedes gestionar sesiones **mientras el bot está corriendo**, sin necesidad de reiniciarlo.

## 📋 Endpoints Disponibles

### 1. Agregar Nueva Sesión

**POST** `/sessions/:sessionId`

Crea una nueva sesión dinámicamente mientras el bot está corriendo.

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/sessions/nuevo-cliente
```

**Respuesta:**
```json
{
  "ok": true,
  "sessionId": "nuevo-cliente",
  "message": "Sesión \"nuevo-cliente\" creada. El QR estará disponible en /qr/nuevo-cliente",
  "qrUrl": "http://localhost:3000/qr/nuevo-cliente"
}
```

**Uso:**
- Cuando llega un nuevo cliente y quieres agregar su sesión
- La sesión se crea inmediatamente y genera un QR
- No necesitas reiniciar el bot

---

### 2. Eliminar Sesión

**DELETE** `/sessions/:sessionId?deleteAuth=true`

Elimina una sesión del bot. Opcionalmente elimina también la autenticación guardada.

**Parámetros:**
- `deleteAuth=true` (opcional): Si se incluye, también elimina la carpeta de autenticación (`.wwebjs_auth`)

**Ejemplo:**
```bash
# Eliminar sesión sin eliminar autenticación
curl -X DELETE http://localhost:3000/sessions/unikuo

# Eliminar sesión Y autenticación (para cambiar de WhatsApp)
curl -X DELETE "http://localhost:3000/sessions/unikuo?deleteAuth=true"
```

**Respuesta:**
```json
{
  "ok": true,
  "sessionId": "unikuo",
  "message": "Sesión \"unikuo\" eliminada exitosamente"
}
```

**Uso:**
- Cuando un cliente cancela su servicio
- Cuando quieres cambiar el WhatsApp asociado a una sesión (usar `deleteAuth=true`)

---

### 3. Resetear Sesión (Cambiar WhatsApp)

**POST** `/sessions/:sessionId/reset`

Resetea una sesión: elimina la autenticación guardada y fuerza la generación de un nuevo QR. **Perfecto para cambiar el WhatsApp asociado a una sesión.**

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/sessions/unikuo/reset
```

**Respuesta:**
```json
{
  "ok": true,
  "sessionId": "unikuo",
  "message": "Sesión \"unikuo\" reseteada. Se generará un nuevo QR.",
  "qrUrl": "http://localhost:3000/qr/unikuo"
}
```

**Uso:**
- Cuando quieres cambiar el WhatsApp asociado a una sesión existente
- Cuando la sesión se desconectó y necesitas escanear el QR nuevamente
- **Este es el endpoint que necesitas para cambiar el WhatsApp de "unikuo"**

---

### 4. Reconectar Sesión

**POST** `/sessions/:sessionId/reconnect`

Reconecta una sesión sin eliminar la autenticación. Útil cuando la sesión se desconectó pero quieres mantener el mismo WhatsApp.

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/sessions/unikuo/reconnect
```

**Respuesta:**
```json
{
  "ok": true,
  "sessionId": "unikuo",
  "message": "Sesión \"unikuo\" reconectada"
}
```

**Uso:**
- Cuando la sesión se desconectó pero quieres mantener el mismo WhatsApp
- Para forzar una reconexión sin perder la autenticación

---

## 📖 Casos de Uso Comunes

### Caso 1: Agregar un Nuevo Cliente

```bash
# 1. Crear la sesión
curl -X POST http://localhost:3000/sessions/cliente-3

# 2. Ver el QR
# Abre en tu navegador: http://localhost:3000/qr/cliente-3

# 3. Escanear el QR con el WhatsApp del cliente
```

### Caso 2: Cambiar el WhatsApp de una Sesión Existente

```bash
# 1. Resetear la sesión (esto elimina la autenticación anterior)
curl -X POST http://localhost:3000/sessions/unikuo/reset

# 2. Ver el nuevo QR
# Abre en tu navegador: http://localhost:3000/qr/unikuo

# 3. Escanear el nuevo QR con el nuevo WhatsApp
```

### Caso 3: Eliminar un Cliente

```bash
# Eliminar sesión (sin eliminar autenticación, por si acaso)
curl -X DELETE http://localhost:3000/sessions/cliente-cancelado

# O eliminar completamente (incluyendo autenticación)
curl -X DELETE "http://localhost:3000/sessions/cliente-cancelado?deleteAuth=true"
```

---

## 🔄 Flujo Completo: Cambiar WhatsApp de "unikuo"

1. **El bot está corriendo** con la sesión "unikuo" activa
2. **Quieres cambiar el WhatsApp** asociado a "unikuo"
3. **Ejecuta:**
   ```bash
   curl -X POST http://localhost:3000/sessions/unikuo/reset
   ```
4. **Abre en tu navegador:**
   ```
   http://localhost:3000/qr/unikuo
   ```
5. **Escanear el nuevo QR** con el nuevo WhatsApp
6. **¡Listo!** La sesión ahora está asociada al nuevo WhatsApp

---

## 📱 Ver Estado de Sesiones

**GET** `/sessions`

Muestra todas las sesiones configuradas y su estado.

**Ejemplo:**
```bash
curl http://localhost:3000/sessions
```

**Respuesta:**
```json
{
  "sessions": [
    {
      "id": "pablo",
      "isReady": true,
      "hasQR": false,
      "status": "connected"
    },
    {
      "id": "unikuo",
      "isReady": true,
      "hasQR": false,
      "status": "connected"
    },
    {
      "id": "nuevo-cliente",
      "isReady": false,
      "hasQR": true,
      "status": "not_started"
    }
  ],
  "configured": ["pablo", "unikuo", "nuevo-cliente"],
  "active": ["pablo", "unikuo"]
}
```

---

## ⚠️ Notas Importantes

1. **No necesitas reiniciar el bot** para ninguna de estas operaciones
2. **Las sesiones se actualizan en tiempo real** en la configuración (DB o archivo)
3. **El QR se genera automáticamente** cuando reseteas o creas una sesión
4. **La autenticación se guarda permanentemente** después de escanear el QR una vez
5. **Usa `/reset`** cuando quieras cambiar el WhatsApp de una sesión existente

---

## 🛠️ Desde el Menú Interactivo

También puedes gestionar sesiones desde el menú interactivo cuando inicias el bot:

```bash
npm start
# Elige "⚙️ Gestionar sesiones primero"
```

Pero los endpoints HTTP te permiten hacerlo **mientras el bot está corriendo**, sin necesidad de acceder al menú.

