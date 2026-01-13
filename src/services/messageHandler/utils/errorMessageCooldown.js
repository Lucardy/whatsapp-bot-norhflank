// Sistema de cooldown para mensajes de error "no se entendió"
// Evita enviar el mismo mensaje de error repetidamente mientras el usuario está en el mismo paso del flujo
import { ERROR_MESSAGE_COOLDOWN, CLEANUP_INTERVAL_ERROR_COOLDOWN, MS_PER_MINUTE } from '../../../config/constants.js';

// Mapa para rastrear el último momento en que se envió un mensaje de error
// Estructura: { "sessionId:chatId:flowType:step": timestamp }
const errorMessageTimestamps = new Map();

/**
 * Genera una clave única para identificar el contexto del error
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} flowType - Tipo de flujo ('main', 'trial', 'configuration', 'client_menu')
 * @param {string} step - Paso actual del flujo (opcional, para trial flow: 'NAME', 'EMAIL', 'QR_PHONE', etc.)
 * @returns {string} Clave única
 */
function generateCooldownKey(sessionId, chatId, flowType, step = null) {
  const stepPart = step ? `:${step}` : '';
  return `${sessionId}:${chatId}:${flowType}${stepPart}`;
}

/**
 * Verifica si se puede enviar un mensaje de error (no está en cooldown)
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} flowType - Tipo de flujo ('main', 'trial', 'configuration', 'client_menu')
 * @param {string} step - Paso actual del flujo (opcional)
 * @returns {boolean} true si se puede enviar el mensaje, false si está en cooldown
 */
export function canSendErrorMessage(sessionId, chatId, flowType, step = null) {
  const key = generateCooldownKey(sessionId, chatId, flowType, step);
  const lastSent = errorMessageTimestamps.get(key);
  
  if (!lastSent) {
    return true; // Nunca se ha enviado, se puede enviar
  }
  
  const timeSinceLastSent = Date.now() - lastSent;
  return timeSinceLastSent >= ERROR_MESSAGE_COOLDOWN;
}

/**
 * Registra que se envió un mensaje de error
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} flowType - Tipo de flujo ('main', 'trial', 'configuration', 'client_menu')
 * @param {string} step - Paso actual del flujo (opcional)
 */
export function recordErrorMessageSent(sessionId, chatId, flowType, step = null) {
  const key = generateCooldownKey(sessionId, chatId, flowType, step);
  errorMessageTimestamps.set(key, Date.now());
}

/**
 * Resetea el cooldown para un contexto específico
 * Útil cuando el usuario avanza a otro paso del flujo o escribe una opción válida
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} flowType - Tipo de flujo ('main', 'trial', 'configuration', 'client_menu')
 * @param {string} step - Paso actual del flujo (opcional, si no se especifica, resetea todos los pasos del flujo)
 */
export function resetErrorCooldown(sessionId, chatId, flowType, step = null) {
  if (step) {
    // Resetear solo el paso específico
    const key = generateCooldownKey(sessionId, chatId, flowType, step);
    errorMessageTimestamps.delete(key);
  } else {
    // Resetear todos los pasos del flujo (eliminar todas las claves que empiecen con el prefijo)
    const prefix = `${sessionId}:${chatId}:${flowType}:`;
    for (const key of errorMessageTimestamps.keys()) {
      if (key.startsWith(prefix)) {
        errorMessageTimestamps.delete(key);
      }
    }
  }
}

/**
 * Limpia entradas antiguas del mapa (más de 1 hora)
 * Se puede llamar periódicamente para evitar que el mapa crezca indefinidamente
 */
export function cleanupOldEntries() {
  const oneHourAgo = Date.now() - (60 * MS_PER_MINUTE);
  for (const [key, timestamp] of errorMessageTimestamps.entries()) {
    if (timestamp < oneHourAgo) {
      errorMessageTimestamps.delete(key);
    }
  }
}

// Limpiar entradas antiguas periódicamente
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldEntries, CLEANUP_INTERVAL_ERROR_COOLDOWN);
}

