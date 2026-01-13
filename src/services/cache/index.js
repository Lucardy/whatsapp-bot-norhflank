// Caché centralizado para el sistema
export {
  getCachedConfig,
  setCachedConfig,
  clearCachedConfig,
  clearAllCachedConfigs,
  getCacheMetrics
} from './configCache.js';

// Caché de cooldown y mensajes
const cooldownCache = new Map(); // chatId -> timestamp
const lastMessageTimes = new Map(); // chatId -> timestamp

/**
 * Verifica si un chat está en cooldown
 * @param {string} chatId - ID del chat
 * @param {number} cooldownMs - Tiempo de cooldown en milisegundos
 * @returns {boolean} true si está en cooldown
 */
export function checkCooldown(chatId, cooldownMs) {
  const lastTime = cooldownCache.get(chatId);
  if (!lastTime) {
    return false;
  }
  
  const now = Date.now();
  if (now - lastTime < cooldownMs) {
    return true; // En cooldown
  }
  
  // Cooldown expirado, actualizar
  cooldownCache.set(chatId, now);
  return false;
}

/**
 * Obtiene el tiempo del último mensaje
 * @param {string} chatId - ID del chat
 * @returns {number|null} Timestamp del último mensaje o null
 */
export function getLastMessageTime(chatId) {
  return lastMessageTimes.get(chatId) || null;
}

/**
 * Actualiza el tiempo del último mensaje
 * @param {string} chatId - ID del chat
 */
export function updateLastMessageTime(chatId) {
  const now = Date.now();
  lastMessageTimes.set(chatId, now);
  cooldownCache.set(chatId, now);
}
