# 📱 Plan: Configuración de Flujos desde WhatsApp

## 🎯 Objetivo
Permitir que los clientes configuren sus flujos de respuestas del bot directamente desde WhatsApp, comunicándose con el número "master".

## 📋 Flujo Propuesto

### 1. Detección de Cliente
- Cliente conocido envía mensaje al número master
- Bot detecta que es cliente conocido (ya implementado)
- Bot ofrece opción especial: "⚙️ Configurar respuestas del bot"

### 2. Modo Configuración
Cuando el cliente elige configurar, el bot entra en "modo configuración" para ese chat:
- Estado guardado en base de datos o memoria
- El bot guía paso a paso al cliente

### 3. Flujo de Configuración Paso a Paso

```
Cliente: "configurar" o "config"
Bot: "⚙️ Modo Configuración Activado

Vamos a configurar las respuestas de tu bot paso a paso.

1️⃣ Primero, envía el MENSAJE DE BIENVENIDA que quieres que aparezca cuando alguien escriba por primera vez.

(Escribe 'saltar' para usar el actual o 'cancelar' para salir)"
```

```
Cliente: [envía mensaje de bienvenida]
Bot: "✅ Mensaje de bienvenida guardado.

2️⃣ Ahora envía el MENSAJE PARA LA OPCIÓN 1 (cuando el usuario escriba '1')

(Escribe 'saltar' para usar el actual o 'cancelar' para salir)"
```

```
Cliente: [envía mensaje opción 1]
Bot: "✅ Opción 1 guardada.

3️⃣ Envía el MENSAJE PARA LA OPCIÓN 2..."
```

Y así sucesivamente para todas las opciones.

### 4. Finalización
```
Bot: "✅ ¡Configuración completada!

Resumen:
- Mensaje de bienvenida: ✅
- Opción 1: ✅
- Opción 2: ✅
- Opción 3: ✅
- Opción 4: ✅

Los cambios se aplicarán inmediatamente. ¿Quieres probar enviando un mensaje de prueba?"
```

## 🗄️ Estructura de Base de Datos

La tabla `ClientConfig` ya tiene:
- `welcome_message` (String) ✅
- `menu_options` (JSON) ✅

Estructura JSON de `menu_options`:
```json
{
  "options": [
    {
      "key": "1",
      "label": "Consultar precios",
      "response": "Mensaje para opción 1..."
    },
    {
      "key": "2",
      "label": "Información de trabajos",
      "response": "Mensaje para opción 2..."
    }
  ],
  "default_response": "Mensaje por defecto..."
}
```

## 🔧 Implementación Técnica

### 1. Nuevo Modelo: `ConfigurationSession`
Para rastrear qué cliente está en modo configuración:

```prisma
model ConfigurationSession {
  id          Int      @id @default(autoincrement())
  client_id   Int      @unique
  phone_number String
  step        String   // "welcome", "option_1", "option_2", etc.
  data        Json?    // Datos temporales de configuración
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  
  client      Client   @relation(fields: [client_id], references: [id], onDelete: Cascade)
  
  @@map("configuration_sessions")
}
```

### 2. Nuevo Servicio: `configurationFlow.js`
Maneja el flujo conversacional de configuración:
- `startConfiguration(clientId, phoneNumber)` - Inicia modo configuración
- `handleConfigurationStep(clientId, message)` - Procesa cada paso
- `saveConfiguration(clientId, configData)` - Guarda la configuración
- `cancelConfiguration(clientId)` - Cancela el modo configuración
- `isInConfigurationMode(clientId)` - Verifica si está en modo configuración

### 3. Modificar `messageHandler/index.js`
- Detectar si el remitente es cliente conocido
- Si está en modo configuración, procesar como configuración
- Si no, ofrecer opción de configurar si es cliente conocido

### 4. Modificar `responseBuilder.js`
- Agregar opción especial "⚙️ Configurar respuestas" para clientes conocidos
- Esta opción solo aparece cuando el cliente escribe al número master

## 📝 Pasos de Implementación

### Fase 1: Base de Datos
1. ✅ Verificar estructura actual de `ClientConfig`
2. ⬜ Crear modelo `ConfigurationSession` (si es necesario)
3. ⬜ Crear migración

### Fase 2: Servicio de Configuración
1. ⬜ Crear `src/services/configurationFlow.js`
2. ⬜ Implementar funciones de flujo conversacional
3. ⬜ Integrar con `configService.js`

### Fase 3: Integración con MessageHandler
1. ⬜ Modificar detección de clientes conocidos
2. ⬜ Agregar lógica de modo configuración
3. ⬜ Modificar `responseBuilder.js` para ofrecer opción de configurar

### Fase 4: Testing
1. ⬜ Probar flujo completo con cliente de prueba
2. ⬜ Verificar que los cambios se guardan correctamente
3. ⬜ Verificar que los cambios se aplican inmediatamente

## 🎨 Ejemplo de Conversación Completa

```
[Cliente conocido escribe al master]
Cliente: "Hola"

Bot: "👋 ¡Hola [Nombre Cliente]! 👋

¿En qué puedo ayudarte?

1️⃣ Consultar precios
2️⃣ Información de trabajos
3️⃣ Ver página web
4️⃣ Hablar con un agente
⚙️ Configurar respuestas del bot

Escribe el número o emoji de la opción."
```

```
Cliente: "⚙️" o "configurar"

Bot: "⚙️ Modo Configuración Activado

Vamos a configurar las respuestas de tu bot paso a paso.

📝 PASO 1: Mensaje de Bienvenida
Envía el mensaje que quieres que aparezca cuando alguien escriba por primera vez a tu bot.

(Escribe 'saltar' para mantener el actual, 'cancelar' para salir)"
```

```
Cliente: "👋 ¡Hola! Bienvenido a mi negocio. ¿En qué puedo ayudarte?"

Bot: "✅ Mensaje de bienvenida guardado.

📝 PASO 2: Opción 1
Envía el mensaje que quieres que aparezca cuando un usuario escriba '1'.

(Escribe 'saltar' para mantener el actual, 'cancelar' para salir)"
```

```
Cliente: "Aquí están nuestros precios: ..."

Bot: "✅ Opción 1 guardada.

📝 PASO 3: Opción 2
Envía el mensaje para cuando escriban '2'..."
```

Y así sucesivamente hasta completar todas las opciones.

## 🔄 Estados del Flujo

1. **idle** - No está en configuración
2. **configuring_welcome** - Configurando mensaje de bienvenida
3. **configuring_option_1** - Configurando opción 1
4. **configuring_option_2** - Configurando opción 2
5. **configuring_option_3** - Configurando opción 3
6. **configuring_option_4** - Configurando opción 4
7. **completed** - Configuración completada

## 💾 Persistencia

- Opción 1: Guardar en memoria (Map) - Simple pero se pierde al reiniciar
- Opción 2: Guardar en base de datos (tabla `ConfigurationSession`) - Persistente
- Opción 3: Híbrido - Memoria + DB como backup

**Recomendación**: Opción 2 (Base de datos) para persistencia y poder recuperar estado si el bot se reinicia.

## 🚀 Próximos Pasos

1. Crear migración para `ConfigurationSession` (si decidimos usarla)
2. Crear servicio `configurationFlow.js`
3. Modificar `messageHandler` para detectar modo configuración
4. Probar flujo completo

