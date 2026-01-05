// Gestión del estado de conversación por chat
import { logSession } from '../../utils/logger/index.js';
import { CONVERSATION_TIMEOUT } from '../../config/constants.js';

// Mapa de estado de conversación por chat
// Estructura: Map<sessionId, Map<chatId, { welcomeSent: boolean, lastMessageTime: number }>>
const conversationStates = new Map();

/**
 * Obtiene o crea el estado de conversación para un chat
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat (número de teléfono)
 * @returns {Object} Estado de conversación
 */
function getConversationState(sessionId, chatId) {
  if (!conversationStates.has(sessionId)) {
    conversationStates.set(sessionId, new Map());
  }
  
  const sessionChats = conversationStates.get(sessionId);
  
  if (!sessionChats.has(chatId)) {
    sessionChats.set(chatId, {
      welcomeSent: false,
      lastMessageTime: Date.now()
    });
  }
  
  const state = sessionChats.get(chatId);
  
  // Actualizar tiempo del último mensaje SIEMPRE (para mantener el estado activo)
  const now = Date.now();
  const timeSinceLastMessage = now - state.lastMessageTime;
  
  // Resetear solo si pasó mucho tiempo desde el último mensaje
  if (timeSinceLastMessage > CONVERSATION_TIMEOUT) {
    const hoursSinceLastMessage = timeSinceLastMessage / (60 * 60 * 1000);
    logSession(sessionId, `🔄 Reseteando estado de conversación para chat ${chatId} (inactividad > ${(CONVERSATION_TIMEOUT / (60 * 60 * 1000)).toFixed(0)} horas, pasaron ${hoursSinceLastMessage.toFixed(1)} horas)`);
    state.welcomeSent = false;
    state.lastMessageTime = now;
  } else {
    // Actualizar tiempo del último mensaje (mantener el estado activo)
    state.lastMessageTime = now;
  }
  
  return state;
}

/**
 * Marca que el mensaje de bienvenida ya fue enviado en un chat
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 */
export function markWelcomeSent(sessionId, chatId) {
  const state = getConversationState(sessionId, chatId);
  state.welcomeSent = true;
  logSession(sessionId, `✅ Mensaje de bienvenida marcado como enviado para chat ${chatId}`);
}

/**
 * Verifica si el mensaje de bienvenida ya fue enviado en un chat
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @returns {boolean} true si ya se envió el mensaje de bienvenida
 */
export function hasWelcomeBeenSent(sessionId, chatId) {
  const state = getConversationState(sessionId, chatId);
  return state.welcomeSent;
}

/**
 * Resetea el estado de conversación para un chat (útil para reiniciar conversación)
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 */
export function resetConversationState(sessionId, chatId) {
  if (conversationStates.has(sessionId)) {
    const sessionChats = conversationStates.get(sessionId);
    if (sessionChats.has(chatId)) {
      sessionChats.delete(chatId);
      logSession(sessionId, `🔄 Estado de conversación reseteado para chat ${chatId}`);
    } else {
      logSession(sessionId, `🔄 No había estado previo para chat ${chatId}, se creará nuevo estado`);
    }
  } else {
    logSession(sessionId, `🔄 No había estado previo para sesión ${sessionId}, se creará nuevo estado`);
  }
}

/**
 * Verifica si un mensaje es una opción válida (1, 2, 3, 4, configurar, etc.)
 * @param {string} message - Mensaje del usuario
 * @returns {boolean} true si es una opción válida
 */
export function isValidOption(message) {
  const messageLower = message.toLowerCase().trim();
  const validOptions = ['1', '2', '3', '4', '5', '6', 'prueba gratuita', 'prueba', 'configurar', 'config', '⚙️', 'test imagen', 'testimagen'];
  return validOptions.includes(messageLower) || messageLower.includes('⚙️') || messageLower.includes('prueba') || messageLower.includes('test imagen');
}

