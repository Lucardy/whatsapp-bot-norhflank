// Validador de mensajes - Filtrado y validación
import { logSession } from '../../../utils/logger/index.js';
import { shouldIgnoreMessage, shouldIgnoreEmptyMessage, shouldIgnoreOldMessage } from '../filters.js';
import { checkCooldown, getLastMessageTime } from '../cache.js';
import { isChatHumanManaged, markChatAsHumanManaged } from '../humanManager.js';

/**
 * Valida y filtra mensajes según múltiples criterios
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} texto - Texto del mensaje
 * @param {string} sessionType - Tipo de sesión ('master' o 'client')
 * @returns {Promise<{shouldIgnore: boolean, reason: string|null}>}
 */
export async function validateMessage(msg, sessionId, chatId, texto, sessionType) {
  // Filtrar mensajes propios, de grupos y de estado
  if (shouldIgnoreMessage(msg, sessionId)) {
    // Si el dueño envía un mensaje, marcar el chat como manejado por humano
    if (msg.fromMe) {
      if (chatId) {
        await markChatAsHumanManaged(sessionId, chatId);
      }
    }
    return { shouldIgnore: true, reason: 'Mensaje propio, grupo o estado' };
  }

  // Verificar si este chat está siendo manejado por humano
  // PERO para sesiones de cliente, NO pausar si el cliente está escribiendo comandos del menú
  const textoLower = texto.toLowerCase().trim();
  const isMenuCommand = ['menú', 'menu', 'configurar', 'config', 'ayuda', 'help', 'probar', 'test', 'activar'].includes(textoLower);
  
  if (chatId && isChatHumanManaged(sessionId, chatId)) {
    // Si es una sesión de cliente y el mensaje es un comando del menú, NO ignorarlo
    if (sessionType === 'client' && isMenuCommand) {
      logSession(sessionId, `🔓 Comando del menú detectado en chat manejado por humano - Procesando de todas formas`);
      // Continuar procesando
    } else {
      logSession(sessionId, `⏭️ Ignorado: chat ${chatId} está siendo manejado por humano - Bot pausado`);
      return { shouldIgnore: true, reason: 'Chat manejado por humano' };
    }
  }

  // Filtrar mensajes sin contenido
  if (shouldIgnoreEmptyMessage(msg, sessionId)) {
    return { shouldIgnore: true, reason: 'Mensaje sin contenido' };
  }

  // Filtrar mensajes antiguos
  if (shouldIgnoreOldMessage(msg, sessionId)) {
    return { shouldIgnore: true, reason: 'Mensaje antiguo' };
  }

  // Cooldown para evitar spam
  try {
    const { MESSAGE_COOLDOWN } = await import('../../../config/constants.js');
    if (checkCooldown(msg.from, MESSAGE_COOLDOWN)) {
      const last = getLastMessageTime(msg.from);
      const now = Date.now();
      logSession(sessionId, `⏭️ Ignorado: cooldown activo (último: ${last}, ahora: ${now}, diff: ${now - last})`);
      return { shouldIgnore: true, reason: 'Cooldown activo' };
    }
    logSession(sessionId, '✅ Cooldown actualizado');
  } catch (err) {
    logSession(sessionId, `⚠️ Error en cooldown: ${err?.message || err}`);
  }

  return { shouldIgnore: false, reason: null };
}

