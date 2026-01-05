// Gestión de chats manejados manualmente por humanos
import { logSession } from '../../utils/logger/index.js';
import { HUMAN_INACTIVITY_TIMEOUT, BOT_MESSAGE_WINDOW } from '../../config/constants.js';

// Chats manejados manualmente por humanos (para pausar el bot)
// Estructura: Map<sessionId, Map<chatId, { timestamp: number, timeout: NodeJS.Timeout }>>
const humanManagedChats = new Map();

// Rastrear mensajes enviados por el bot para no marcarlos como acción humana
// Estructura: Map<sessionId, Map<chatId, timestamp>>
const botSentMessages = new Map();

/**
 * Marca un mensaje como enviado por el bot (para evitar detectarlo como acción humana)
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat (número de teléfono)
 */
export function markBotSentMessage(sessionId, chatId) {
  if (!botSentMessages.has(sessionId)) {
    botSentMessages.set(sessionId, new Map());
  }
  
  const sessionChats = botSentMessages.get(sessionId);
  const now = Date.now();
  
  // Actualizar el timestamp (o crear si no existe)
  // Esto extiende la ventana de protección cada vez que el bot envía un mensaje
  sessionChats.set(chatId, now);
  
  logSession(sessionId, `🤖 Mensaje del bot registrado para chat ${chatId} (timestamp: ${now})`);
  
  // Limpiar después de la ventana de tiempo
  // Usar un timeout único por chat para evitar múltiples timeouts
  if (sessionChats.has(`${chatId}_timeout`)) {
    clearTimeout(sessionChats.get(`${chatId}_timeout`));
  }
  
  const timeout = setTimeout(() => {
    if (sessionChats.has(chatId)) {
      sessionChats.delete(chatId);
      sessionChats.delete(`${chatId}_timeout`);
      if (sessionChats.size === 0) {
        botSentMessages.delete(sessionId);
      }
      logSession(sessionId, `🤖 Ventana de protección del bot expirada para chat ${chatId}`);
    }
  }, BOT_MESSAGE_WINDOW);
  
  sessionChats.set(`${chatId}_timeout`, timeout);
}

/**
 * Verifica si un mensaje fue enviado recientemente por el bot
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat (número de teléfono)
 * @returns {boolean} true si el bot envió un mensaje recientemente en este chat
 */
export function isRecentBotMessage(sessionId, chatId) {
  if (!botSentMessages.has(sessionId)) {
    return false;
  }
  
  const sessionChats = botSentMessages.get(sessionId);
  if (!sessionChats.has(chatId)) {
    return false;
  }
  
  const botMessageTime = sessionChats.get(chatId);
  const timeSinceBotMessage = Date.now() - botMessageTime;
  const isRecent = timeSinceBotMessage < BOT_MESSAGE_WINDOW;
  
  if (isRecent) {
    logSession(sessionId, `🤖 Verificando mensaje del bot: chat ${chatId}, tiempo desde último mensaje: ${timeSinceBotMessage}ms, ventana: ${BOT_MESSAGE_WINDOW}ms, es reciente: ${isRecent}`);
  }
  
  return isRecent;
}

/**
 * Marca un chat como manejado por humano (pausa el bot en ese chat)
 * Solo marca si NO fue un mensaje reciente del bot y NO está en modo administración
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat (número de teléfono)
 */
export async function markChatAsHumanManaged(sessionId, chatId) {
  // Si el bot envió un mensaje recientemente en este chat, no marcar como acción humana
  if (isRecentBotMessage(sessionId, chatId)) {
    logSession(sessionId, `🤖 Ignorando detección de acción humana en chat ${chatId} (mensaje reciente del bot)`);
    return;
  }
  
  // EXCEPCIÓN: Si el chat está en modo administración, NO marcar como manejado por humano
  // El bot debe seguir respondiendo a los comandos del menú admin
  try {
    const { isInAdminMode } = await import('../../services/adminFlow.js');
    if (isInAdminMode(chatId)) {
      logSession(sessionId, `🔐 Ignorando detección de acción humana en chat ${chatId} (modo administración activo)`);
      return; // No pausar el bot si está en modo admin
    }
  } catch (err) {
    // Si hay error al verificar modo admin, continuar con el flujo normal
    logSession(sessionId, `⚠️ Error verificando modo admin: ${err?.message || err}`);
  }
  
  logSession(sessionId, `👤 Marcando chat ${chatId} como manejado por humano (no es mensaje del bot)`);
  if (!humanManagedChats.has(sessionId)) {
    humanManagedChats.set(sessionId, new Map());
  }
  
  const sessionChats = humanManagedChats.get(sessionId);
  
  // Si ya está marcado, limpiar el timeout anterior
  if (sessionChats.has(chatId)) {
    clearTimeout(sessionChats.get(chatId).timeout);
  }
  
  // Marcar como manejado por humano y configurar timeout para reactivar
  const timeout = setTimeout(() => {
    sessionChats.delete(chatId);
    if (sessionChats.size === 0) {
      humanManagedChats.delete(sessionId);
    }
    logSession(sessionId, `🤖 Bot reactivado en chat ${chatId} (30 minutos de inactividad del humano)`);
  }, HUMAN_INACTIVITY_TIMEOUT);
  
  sessionChats.set(chatId, {
    timestamp: Date.now(),
    timeout
  });
  
  logSession(sessionId, `👤 Chat ${chatId} marcado como manejado por humano - Bot pausado`);
}

/**
 * Verifica si un chat está siendo manejado por humano
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat (número de teléfono)
 * @returns {boolean} true si el chat está siendo manejado por humano
 */
export function isChatHumanManaged(sessionId, chatId) {
  const sessionChats = humanManagedChats.get(sessionId);
  if (!sessionChats) {
    return false;
  }
  return sessionChats.has(chatId);
}

/**
 * Limpia todos los chats marcados como manejados por humano para una sesión
 * @param {string} sessionId - ID de la sesión
 */
export function clearHumanManagedChats(sessionId) {
  const sessionChats = humanManagedChats.get(sessionId);
  if (sessionChats) {
    // Limpiar todos los timeouts
    sessionChats.forEach(({ timeout }) => clearTimeout(timeout));
    sessionChats.clear();
    humanManagedChats.delete(sessionId);
  }
}

