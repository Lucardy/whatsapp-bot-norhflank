# 📱 Diagrama de Flujo - Número Master (Usuarios Nuevos)

## 🎯 Escenario: Usuario Nuevo se Comunica con el Número Master

Cuando un usuario que **NO es cliente conocido** escribe al número master, el bot responde con el siguiente flujo:

---

## 📨 Mensaje de Bienvenida (En 2 Partes)

### Parte 1: Saludo e Información

```
👋 ¡Hola! 👋

Bienvenido a *Unikuo*, servicio de creación de páginas web.

En *Unikuo* ofrecemos:
• 🖥️ Páginas web profesionales
• 📱 Marketing digital
• 🤖 Bots de WhatsApp

Estoy aquí para ayudarte.
```

### Parte 2: Opciones (se envía inmediatamente después)

```
¿Qué te gustaría saber?

1️⃣ Consultar precios
2️⃣ Información de nuestros trabajos
3️⃣ Ver nuestra página web
4️⃣ Hablar con un agente personal

Escribe el número de la opción que te interesa.
```

---

## 🔄 Flujo de Opciones

### Opción 1: "1" o "Consultar precios"

**Respuesta:**
```
💰 *Nuestros Planes de Páginas Web*

Ofrecemos planes mensuales que incluyen:
• Diseño profesional
• Hosting y dominio
• Mantenimiento continuo
• Soporte técnico

📋 *Planes disponibles:*

• *Landing Page*: $24.000/mes
• *Catálogo Online*: $41.000/mes
• *Business Web*: $58.000/mes

💬 Para más detalles o consultas personalizadas, elige la opción 4 para hablar con un agente.
```

**Después de esta respuesta:**
- El usuario puede escribir otra opción (1, 2, 3, 4)
- O cualquier otro texto → se muestra el mensaje de "opción inválida"

---

### Opción 2: "2" o "Información de trabajos"

**Respuesta:**
```
🎨 *Nuestros Trabajos*

Creamos páginas web profesionales y modernas para tu negocio. Nuestros servicios incluyen:

✨ *Lo que ofrecemos:*
• Diseño responsive (se adapta a móviles)
• Optimización para buscadores (SEO)
• Integración con redes sociales
• Formularios de contacto
• Panel de administración
• Actualizaciones de contenido

🚀 *Tecnologías que utilizamos:*
• Diseño moderno y profesional
• Velocidad optimizada
• Seguridad implementada

💡 Todos nuestros sitios incluyen mantenimiento continuo y soporte técnico.
```

**Después de esta respuesta:**
- El usuario puede escribir otra opción (1, 2, 3, 4)
- O cualquier otro texto → se muestra el mensaje de "opción inválida"

---

### Opción 3: "3" o "Ver página web"

**Respuesta:**
```
🌐 *Nuestra Página Web*

Visita nuestro sitio para conocer más sobre nuestros servicios:

🔗 https://unikuoweb.com/

Allí encontrarás:
• Portafolio de trabajos
• Información detallada de servicios
• Casos de éxito
• Formulario de contacto

💬 ¿Tienes alguna pregunta? Elige la opción 4 para hablar con un agente.
```

**Después de esta respuesta:**
- El usuario puede escribir otra opción (1, 2, 3, 4)
- O cualquier otro texto → se muestra el mensaje de "opción inválida"

---

### Opción 4: "4" o "Hablar con un agente"

**Respuesta:**
```
👤 *Hablar con un Agente*

¡Perfecto! Un agente de Unikuo se comunicará contigo en la brevedad.

⏰ Te responderemos pronto por este mismo WhatsApp.

Mientras tanto, puedes revisar nuestras opciones anteriores si tienes alguna otra consulta.
```

**Después de esta respuesta:**
- El usuario puede escribir otra opción (1, 2, 3, 4)
- O cualquier otro texto → se muestra el mensaje de "opción inválida"

---

## 🔄 Flujo Visual

```
┌─────────────────────────────────────────┐
│  Usuario Nuevo escribe al Master        │
│  (Cualquier mensaje: "Hola", "Info", etc)│
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Bot detecta: NO es cliente conocido    │
│  → Usa mensaje de bienvenida por defecto │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  📨 MENSAJE DE BIENVENIDA (Parte 1)      │
│  "👋 ¡Hola! 👋                            │
│   Bienvenido a *Unikuo*...               │
│   • 🖥️ Páginas web                       │
│   • 📱 Marketing digital                 │
│   • 🤖 Bots de WhatsApp"                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  📨 MENSAJE DE BIENVENIDA (Parte 2)      │
│  "1️⃣ Consultar precios                  │
│   2️⃣ Información de trabajos            │
│   3️⃣ Ver nuestra página web             │
│   4️⃣ Hablar con un agente personal"     │
└──────────────┬──────────────────────────┘
               │
               ▼
    ┌──────────┴──────────┐
    │ Usuario escribe:    │
    │                     │
    ▼                     ▼                     ▼                     ▼
┌─────────┐         ┌─────────┐         ┌─────────┐         ┌─────────┐
│   "1"   │         │   "2"   │         │   "3"   │         │   "4"   │
└────┬────┘         └────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │                   │
     ▼                   ▼                   ▼                   ▼
┌─────────┐         ┌─────────┐         ┌─────────┐         ┌─────────┐
│💰 Precios│         │🎨 Trabajos│         │🌐 Web   │         │👤 Agente│
│$24k-$58k│         │Servicios │         │unikuoweb│         │Espera   │
│         │         │          │         │.com     │         │respuesta│
└────┬────┘         └────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │                   │
     └───────────────────┴───────────────────┴───────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Usuario escribe      │
              │ cualquier otra cosa  │
              │ (después de bienvenida)│
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ ❓ MENSAJE DE         │
              │    OPCIÓN INVÁLIDA    │
              │    "Por favor elige  │
              │     una opción..."   │
              └──────────────────────┘
```

---

## 📋 Resumen de Opciones

| Opción | Comando | Respuesta |
|--------|---------|-----------|
| **1** | `1` o `"1"` | 💰 Precios de planes ($24k, $41k, $58k) |
| **2** | `2` o `"2"` | 🎨 Información de trabajos y servicios |
| **3** | `3` o `"3"` | 🌐 Link a https://unikuoweb.com/ |
| **4** | `4` o `"4"` | 👤 Mensaje de que un agente responderá |
| **Invalid** | Cualquier otro texto (después de bienvenida) | ❓ Mensaje de "opción inválida" |
| **Ignorado** | Cualquier otro texto (antes de bienvenida) | ⏭️ Se ignora silenciosamente |

---

## 🔍 Detalles Técnicos

### Detección de Usuario Nuevo

1. El bot recibe un mensaje en el número master
2. Extrae el número de teléfono del remitente
3. Busca en la base de datos si ese número pertenece a un cliente conocido
4. Si **NO** encuentra el número → Es usuario nuevo
5. Usa el mensaje de bienvenida por defecto (sin personalización)

### Lógica de Respuestas

- **Primer contacto** → Envía mensaje de bienvenida en 2 partes (saludo + opciones)
- **Si el usuario escribe "1", "2", "3" o "4"** → Responde con la opción correspondiente
- **Si el usuario escribe cualquier otra cosa DESPUÉS de la bienvenida** → Muestra mensaje de "opción inválida"
- **Si el usuario escribe mensajes intermedios ANTES de la bienvenida** (ej: "hola", "como estas?") → Se ignoran silenciosamente
- **El bot es inteligente** → No responde a cada mensaje, solo a opciones válidas o en el primer contacto

### Cooldown

- Hay un cooldown de 1.5 segundos entre mensajes para evitar spam
- Si el usuario envía mensajes muy rápido, algunos se ignoran

---

## 💡 Nota Importante

**Si el usuario ES un cliente conocido:**
- El mensaje de bienvenida se personaliza: `"👋 ¡Hola [Nombre Cliente]! 👋"`
- Se agrega una opción extra: `⚙️ Configurar respuestas del bot`
- El resto del flujo es igual

---

## 📝 Ubicación del Código

- **Mensaje de bienvenida**: `src/services/messageHandler/responseBuilder.js` (líneas 49-124)
- **Configuración en DB**: `prisma/seed.js` (líneas 59-70)
- **Lógica de detección**: `src/services/messageHandler/clientDetector.js`
- **Procesamiento**: `src/services/messageHandler/index.js`

---

**Última actualización**: 2026-01-XX

