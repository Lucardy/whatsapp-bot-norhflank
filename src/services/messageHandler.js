// Procesador de mensajes de WhatsApp
import { logSession } from '../utils/logger.js';

// Cooldown global para evitar spam
const cooldown = new Map();

// Respuestas del bot (por ahora iguales para todas las sesiones)
const responses = {
  '1': `💰 *Nuestros Planes de Páginas Web*

Ofrecemos planes mensuales que incluyen:
• Diseño profesional
• Hosting y dominio
• Mantenimiento continuo
• Soporte técnico

📋 *Planes disponibles:*

• *Landing Page*: $24.000/mes
• *Catálogo Online*: $41.000/mes
• *Business Web*: $58.000/mes

💬 Para más detalles o consultas personalizadas, elige la opción 4 para hablar con un agente.`,

  '2': `🎨 *Nuestros Trabajos*

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

💡 Todos nuestros sitios incluyen mantenimiento continuo y soporte técnico.`,

  '3': `🌐 *Nuestra Página Web*

Visita nuestro sitio para conocer más sobre nuestros servicios:

🔗 https://unikuoweb.com/

Allí encontrarás:
• Portafolio de trabajos
• Información detallada de servicios
• Casos de éxito
• Formulario de contacto

💬 ¿Tienes alguna pregunta? Elige la opción 4 para hablar con un agente.`,

  '4': `👤 *Hablar con un Agente*

¡Perfecto! Un agente de Unikuo se comunicará contigo en la brevedad.

⏰ Te responderemos pronto por este mismo WhatsApp.

Mientras tanto, puedes revisar nuestras opciones anteriores si tienes alguna otra consulta.`,

  default: `👋 ¡Hola! 👋

Bienvenido a *Unikuo*, servicio de creación de páginas web. Estoy aquí para ayudarte.

¿Qué te gustaría saber?

1️⃣ Consultar precios
2️⃣ Información de nuestros trabajos
3️⃣ Ver nuestra página web
4️⃣ Hablar con un agente personal

Escribe el número de la opción que te interesa.`
};

/**
 * Procesa un mensaje entrante y envía la respuesta correspondiente
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión que recibió el mensaje
 */
export async function handleMessage(msg, sessionId) {
  const msgId = msg.id?._serialized || msg.id || 'unknown';
  logSession(sessionId, '📨 ========== MENSAJE RECIBIDO ==========');
  logSession(sessionId, '📨 ID:', msgId);
  logSession(sessionId, '📨 From:', msg.from);
  logSession(sessionId, '📨 Body:', (msg.body || '').substring(0, 100));
  logSession(sessionId, '📨 FromMe:', msg.fromMe);
  logSession(sessionId, '📨 IsGroup:', msg.from?.endsWith('@g.us'));
  
  try {
    // Filtrar mensajes propios, de grupos y de estado
    if (msg.fromMe) {
      logSession(sessionId, '⏭️ Ignorado: mensaje propio');
      return;
    }
    if (msg.from === 'status@broadcast') {
      logSession(sessionId, '⏭️ Ignorado: status broadcast');
      return;
    }
    if (msg.from.endsWith('@g.us')) {
      logSession(sessionId, '⏭️ Ignorado: mensaje de grupo');
      return;
    }

    // Cooldown para evitar spam
    try {
      const now = Date.now();
      const last = cooldown.get(msg.from) || 0;
      if (now - last < 1500) {
        logSession(sessionId, '⏭️ Ignorado: cooldown activo (último:', last, 'ahora:', now, 'diff:', now - last);
        return;
      }
      cooldown.set(msg.from, now);
      logSession(sessionId, '✅ Cooldown actualizado');
    } catch (err) {
      logSession(sessionId, '⚠️ Error en cooldown:', err?.message || err);
    }

    const texto = (msg.body || '').trim().toLowerCase();
    const telefono = (msg.from || '').split('@')[0] || '';
    
    logSession(sessionId, '✅ Procesando mensaje - texto:', texto, 'teléfono:', telefono);

    // Determinar respuesta según el texto
    const responseText = responses[texto] || responses.default;
    const optionName = texto === '1' ? 'precios' : 
                      texto === '2' ? 'trabajos' : 
                      texto === '3' ? 'página web' : 
                      texto === '4' ? 'agente' : 
                      'menú inicial';

    logSession(sessionId, `💬 Respondiendo: opción ${texto || 'default'} (${optionName})`);
    
    try {
      const result = await msg.reply(responseText);
      logSession(sessionId, '✅ Respuesta enviada exitosamente. ID:', result?.id?._serialized || result?.id);
    } catch (replyError) {
      logSession(sessionId, `❌ Error al enviar respuesta (opción ${texto || 'default'}):`, replyError?.message || replyError, replyError?.stack);
    }

    logSession(sessionId, '📨 ========== FIN PROCESAMIENTO MENSAJE ==========');
  } catch (error) {
    logSession(sessionId, '❌ Error procesando mensaje:', error?.message || error);
    logSession(sessionId, '❌ Stack:', error?.stack);
    logSession(sessionId, '📨 ========== ERROR EN MENSAJE ==========');
  }
}

