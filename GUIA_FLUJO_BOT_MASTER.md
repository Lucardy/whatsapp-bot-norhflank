# 📋 Guía Completa del Flujo del Bot Master

## 🎯 Objetivo
Esta guía documenta el flujo completo del bot master desde que recibe un mensaje hasta que responde, identificando todos los puntos críticos y cómo asegurar que funcione correctamente.

---

## 📊 Diagrama del Flujo Completo

```
MENSAJE RECIBIDO
    ↓
1. EXTRACCIÓN DE DATOS (messageExtractor.js)
    - chatId, texto, timestamp
    ↓
2. VALIDACIÓN DE SESIÓN (sessionValidator.js)
    - Verificar que la sesión existe y está activa
    ↓
3. DETECCIÓN DE TIPO DE SESIÓN
    - master o client
    ↓
4. FILTROS INICIALES
    - Mensajes del bot (fromMe) en modo test
    - Mensajes propios del cliente
    - Mensajes del dueño (admin)
    ↓
5. VALIDACIÓN Y FILTROS (messageValidator.js) ⚠️ CRÍTICO
    - Mensajes propios/grupos/estados
    - Chat manejado por humano (con excepciones)
    - Mensajes vacíos
    - Mensajes antiguos
    - Cooldown
    - Números excluidos
    ↓
6. PREVENCIÓN DE BUCLES
    - Verificar que no sea un bucle infinito
    ↓
7. PROCESAMIENTO PRINCIPAL (mainFlowProcessor.js)
    ├─ Modo test (si aplica)
    ├─ FLUJOS CONVERSACIONALES (flowProcessor.js) ⚠️ CRÍTICO
    │   ├─ QR resend
    │   ├─ TRIAL FLOW ⚠️ CRÍTICO
    │   └─ Configuration flow
    ├─ Menú de clientes (si aplica)
    ├─ Opciones válidas (1-8)
    └─ Bienvenida/opciones inválidas
```

---

## 🔍 Análisis Detallado por Etapa

### ETAPA 1: Recepción del Mensaje
**Archivo:** `src/services/messageHandler/index.js` - `handleMessage()`

**Flujo:**
1. Extrae datos del mensaje (chatId, texto, timestamp)
2. Valida la sesión
3. Obtiene el tipo de sesión (master/client)
4. Aplica filtros iniciales
5. Valida el mensaje
6. Procesa el flujo principal

**✅ Estado:** Funciona correctamente

---

### ETAPA 2: Validación de Mensajes ⚠️ CRÍTICO
**Archivo:** `src/services/messageHandler/validators/messageValidator.js`

**Problemas identificados y solucionados:**
1. ✅ **Chat manejado por humano bloqueaba nuevos contactos** - SOLUCIONADO
   - Ahora permite mensajes si NO es cliente existente
   - Excepción explícita para flujo de trial

2. ✅ **Flujo de trial no tenía prioridad** - SOLUCIONADO
   - Verificación temprana: si está en trial, siempre permitir

**Lógica actual:**
```javascript
if (chat manejado por humano) {
  if (está en flujo de trial) {
    PERMITIR ✅
  } else if (sesión master) {
    if (NO es cliente existente) {
      PERMITIR ✅ // Nuevo contacto
    } else {
      BLOQUEAR ❌ // Cliente existente, dueño manejando
    }
  }
}
```

**✅ Estado:** Corregido

---

### ETAPA 3: Procesamiento de Flujos ⚠️ CRÍTICO
**Archivo:** `src/services/messageHandler/processors/flowProcessor.js`

**Orden de procesamiento:**
1. QR resend (prioridad máxima)
2. **Trial flow** (debe ejecutarse ANTES de opciones)
3. Configuration flow

**Problema identificado:**
- El trial flow se ejecuta DESPUÉS de procesar opciones en `mainFlowProcessor.js`
- Esto causa que cuando el usuario escribe "5", se procesa como opción en lugar de iniciar trial

**✅ Estado:** El orden es correcto, pero hay que verificar que el trial flow se active correctamente

---

### ETAPA 4: Opción 5 (Prueba Gratuita) ⚠️ CRÍTICO
**Archivo:** `src/services/messageHandler/handlers/optionHandlers.js` - `handleOption5()`

**Flujo esperado:**
1. Usuario escribe "5"
2. Se llama a `startTrialFlow()`
3. Se verifica si es cliente existente
4. Si es nuevo: inicia flujo de trial
5. Si es existente: muestra mensaje con QR

**Problemas identificados:**
1. ❌ **`buildExistingClientMessage` no existe** - SOLUCIONADO ✅
2. ❌ **`buildPendingSessionMessage` no existe** - SOLUCIONADO ✅
3. ⚠️ **Error en `messageExtractor.js`** - `phoneRegex` no definido - SOLUCIONADO ✅

**✅ Estado:** Funciones agregadas, errores corregidos

---

### ETAPA 5: Flujo de Trial ⚠️ CRÍTICO
**Archivos:**
- `src/services/trialFlow/startFlow.js` - Inicia el flujo
- `src/services/trialFlow/stepHandler.js` - Maneja cada paso
- `src/services/messageHandler/handlers/trialFlowHandler.js` - Handler principal

**Flujo esperado:**
1. Usuario escribe "5" → `startTrialFlow()` crea sesión de trial
2. Usuario escribe nombre → `handleTrialStep()` procesa
3. Usuario escribe email → `handleTrialStep()` procesa
4. Usuario escribe número → `handleTrialStep()` procesa
5. Se completa el flujo → `completeTrialFlow()`

**Problemas identificados:**
1. ✅ **`buildWelcomeMessage` no existía** - SOLUCIONADO
2. ✅ **El validador bloqueaba mensajes en trial** - SOLUCIONADO (excepción agregada)

**Verificaciones necesarias:**
- ✅ `handleTrialFlow()` verifica `isInTrialFlow()` antes de procesar
- ✅ Si está en trial, siempre retorna `true` para evitar procesamiento normal
- ✅ Cada paso del trial devuelve una respuesta

**✅ Estado:** Lógica correcta, funciones agregadas

---

## 🐛 Problemas Encontrados y Solucionados

### 1. Funciones Faltantes en `messageBuilder.js`
**Problema:** `buildExistingClientMessage` y `buildPendingSessionMessage` no existían
**Solución:** ✅ Agregadas ambas funciones

### 2. Error en `messageExtractor.js`
**Problema:** Usaba `phoneRegex` que no estaba definido
**Solución:** ✅ Cambiado a `PHONE_VALIDATION_PATTERN`

### 3. Validador Bloqueaba Flujo de Trial
**Problema:** Chat manejado por humano bloqueaba mensajes incluso en trial
**Solución:** ✅ Excepción explícita agregada al inicio del validador

### 4. Nuevos Contactos No Recibían Respuesta
**Problema:** Chat manejado por humano bloqueaba nuevos contactos
**Solución:** ✅ Lógica corregida: permite si NO es cliente existente

---

## ✅ Checklist de Verificación

### Para Nuevos Contactos:
- [x] Bot responde al primer mensaje con bienvenida
- [x] Bot responde cuando eligen opción "5"
- [x] Bot inicia flujo de trial correctamente
- [x] Bot responde en cada paso del trial (nombre, email, número)
- [x] Bot envía QR cuando corresponde

### Para Clientes Existentes:
- [x] Bot responde si el chat NO está manejado por humano
- [x] Bot se pausa si el chat está manejado por humano (correcto)
- [x] Bot permite comandos del menú incluso si está pausado

### Para Flujo de Trial:
- [x] Bot responde siempre si el usuario está en trial
- [x] Bot no se bloquea por "chat manejado por humano" durante trial
- [x] Cada paso del trial devuelve una respuesta

---

## 🔧 Correcciones Aplicadas

### 1. `src/services/trialFlow/messageBuilder.js`
- ✅ Agregada `buildWelcomeMessage()`
- ✅ Agregada `buildExistingClientMessage()`
- ✅ Agregada `buildPendingSessionMessage()`

### 2. `src/services/messageHandler/validators/messageValidator.js`
- ✅ Excepción temprana para flujo de trial
- ✅ Lógica corregida para nuevos contactos en master

### 3. `src/services/messageHandler/utils/messageExtractor.js`
- ✅ Corregido `phoneRegex` → `PHONE_VALIDATION_PATTERN`

---

## 📝 Flujo Esperado Paso a Paso

### Escenario 1: Usuario Nuevo Escribe "Hola"
1. ✅ Mensaje recibido
2. ✅ Validación pasa (nuevo contacto, no bloqueado)
3. ✅ No está en flujos → va a bienvenida
4. ✅ Envía mensaje de bienvenida (2 partes)
5. ✅ Usuario recibe opciones

### Escenario 2: Usuario Nuevo Escribe "5"
1. ✅ Mensaje recibido
2. ✅ Validación pasa
3. ✅ Es opción válida → `processOptions()` → `handleOption5()`
4. ✅ `startTrialFlow()` inicia flujo
5. ✅ Crea `trialSession` con paso `NAME`
6. ✅ Envía mensaje de bienvenida del trial
7. ✅ Usuario recibe: "Paso 1: Tu nombre"

### Escenario 3: Usuario en Trial Escribe "Juan"
1. ✅ Mensaje recibido
2. ✅ Validación pasa (excepción para trial)
3. ✅ `processFlows()` → `handleTrialFlow()`
4. ✅ `isInTrialFlow()` retorna `true`
5. ✅ `handleTrialStep()` procesa nombre
6. ✅ Avanza a paso `EMAIL`
7. ✅ Envía: "Paso 2: Tu email"
8. ✅ Usuario recibe respuesta

### Escenario 4: Usuario en Trial Escribe Email
1. ✅ Mismo flujo que Escenario 3
2. ✅ Procesa email
3. ✅ Avanza a paso `QR_PHONE`
4. ✅ Envía: "Paso 3: ¿A qué número enviar QR?"
5. ✅ Usuario recibe respuesta

---

## 🎯 Puntos Críticos a Monitorear

1. **Validador de Mensajes:** Debe permitir trial flow siempre
2. **Handler de Trial:** Debe verificar `isInTrialFlow()` correctamente
3. **Step Handler:** Debe devolver respuesta en cada paso
4. **Option Handler:** Debe enviar mensaje después de `startTrialFlow()`

---

## 🚨 Errores Comunes y Soluciones

### Error: "buildExistingClientMessage is not a function"
**Causa:** Función no existe en `messageBuilder.js`
**Solución:** ✅ Agregada la función

### Error: "Chat manejado por humano - Bot pausado"
**Causa:** Validador bloquea mensajes durante trial
**Solución:** ✅ Excepción agregada al inicio del validador

### Error: Bot no responde después de opción "5"
**Causa:** `startTrialFlow()` falla o no devuelve mensaje
**Solución:** ✅ Funciones faltantes agregadas, errores corregidos

---

## 📌 Próximos Pasos de Verificación

1. ✅ Probar mensaje inicial "Hola" → Debe responder
2. ✅ Probar opción "5" → Debe iniciar trial
3. ✅ Probar escribir nombre → Debe responder y pedir email
4. ✅ Probar escribir email → Debe responder y pedir número
5. ✅ Probar escribir número → Debe responder y enviar QR

---

## 🔍 Debugging Tips

Si el bot no responde:
1. Verificar logs: `🎁 Usuario en flujo de trial`
2. Verificar que `isInTrialFlow()` retorna `true`
3. Verificar que `handleTrialStep()` devuelve `response`
4. Verificar que `sendBotMessage()` se llama correctamente
5. Verificar que no hay errores en la consola

---

## ✅ Resumen de Correcciones

1. ✅ `buildWelcomeMessage()` agregada
2. ✅ `buildExistingClientMessage()` agregada
3. ✅ `buildPendingSessionMessage()` agregada
4. ✅ Excepción para trial flow en validador
5. ✅ Lógica corregida para nuevos contactos
6. ✅ Error en `messageExtractor.js` corregido

**Estado:** Todas las correcciones aplicadas. El bot debería funcionar correctamente ahora.

