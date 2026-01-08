// Filtros para detectar y evitar procesar mensajes del bot
import { BOT_MESSAGE_PATTERNS, BOT_MESSAGE_MAX_LENGTH, MIN_RESPONSE_DELAY } from '../constants.js';
import { getLastResponseTime } from '../sessionManager.js';
import { logSession } from '../../../utils/logger/index.js';

// Mensajes cortos que son claramente del usuario (números, comandos simples)
const USER_MESSAGE_PATTERNS = /^[\d\s]+$|^(guardar|save|cancelar|cancel|saltar|skip|ver|preview|resetear|reset|bienvenida|welcome)$/i;

/**
 * Verifica si un mensaje parece ser una respuesta del bot
 * @param {string} message - Mensaje a verificar
 * @returns {boolean} true si parece ser del bot
 */
export function isBotMessage(message) {
  // Verificar longitud
  if (message.length > BOT_MESSAGE_MAX_LENGTH) {
    return true;
  }
  
  // Verificar patrones
  return BOT_MESSAGE_PATTERNS.some(pattern => message.includes(pattern));
}

/**
 * Verifica si un mensaje es muy reciente después de una respuesta del bot
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {boolean} true si es muy reciente
 */
export function isTooRecentAfterResponse(clientId, sessionId) {
  const lastResponseTime = getLastResponseTime(clientId);
  
  if (!lastResponseTime) {
    return false;
  }
  
  const timeSinceLastResponse = Date.now() - lastResponseTime;
  
  if (timeSinceLastResponse < MIN_RESPONSE_DELAY) {
    logSession(sessionId, `⏭️ Ignorando mensaje en modo configuración - Muy reciente después de respuesta (${timeSinceLastResponse}ms)`);
    return true;
  }
  
  return false;
}

/**
 * Filtra mensajes que no deben ser procesados
 * @param {number} clientId - ID del cliente
 * @param {string} message - Mensaje a filtrar
 * @param {string} sessionId - ID de la sesión
 * @returns {boolean} true si el mensaje debe ser ignorado
 */
export function shouldIgnoreMessage(clientId, message, sessionId) {
  // Si es un mensaje corto que claramente es del usuario (números, comandos), NO ignorarlo
  if (USER_MESSAGE_PATTERNS.test(message.trim())) {
    return false;
  }
  
  // Verificar si es mensaje del bot
  if (isBotMessage(message)) {
    logSession(sessionId, `⏭️ Ignorando mensaje en modo configuración - Parece ser respuesta del bot (longitud: ${message.length})`);
    return true;
  }
  
  // Verificar si es muy reciente (solo para mensajes largos, no para comandos simples)
  if (message.length > 50 && isTooRecentAfterResponse(clientId, sessionId)) {
    return true;
  }
  
  return false;
}

