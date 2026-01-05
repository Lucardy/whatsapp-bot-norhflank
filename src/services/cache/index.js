// Gestor de cache mejorado con TTL y estrategias
import { TTLCache, LRUCache } from './strategies.js';

// Cache de configuraciones con TTL (5 minutos)
const configCache = new TTLCache(5 * 60 * 1000);

// Cache de cooldown (sin TTL, se limpia manualmente)
const cooldownCache = new Map();

// Limpiar cache expirado cada 10 minutos
const cacheCleanupInterval = setInterval(() => {
  const cleaned = configCache.cleanup();
  if (cleaned > 0) {
    // Log opcional si se limpia algo
  }
  
  // Limpiar cooldown cache antiguo (más de 1 hora)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [key, timestamp] of cooldownCache.entries()) {
    if (timestamp < oneHourAgo) {
      cooldownCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

// Registrar interval para limpieza (async)
(async () => {
  try {
    const { registerInterval } = await import('../../utils/resourceCleanup.js');
    registerInterval('cache', cacheCleanupInterval);
  } catch (err) {
    // Continuar si no está disponible
  }
})();

/**
 * Obtiene una configuración del cache
 * @param {string} sessionId - ID de la sesión
 * @returns {Object|null} Configuración cacheada o null
 */
export function getCachedConfig(sessionId) {
  return configCache.get(sessionId);
}

/**
 * Guarda una configuración en el cache
 * @param {string} sessionId - ID de la sesión
 * @param {Object} config - Configuración a cachear
 * @param {number} ttl - TTL en milisegundos (opcional)
 */
export function setCachedConfig(sessionId, config, ttl = null) {
  configCache.set(sessionId, config, ttl);
}

/**
 * Limpia el cache de configuraciones
 * @param {string} sessionId - ID de la sesión (opcional, si no se pasa limpia todo)
 */
export function clearConfigCache(sessionId = null) {
  if (sessionId) {
    configCache.delete(sessionId);
  } else {
    configCache.clear();
  }
}

/**
 * Verifica el cooldown para un remitente
 * @param {string} from - ID del remitente
 * @param {number} cooldownMs - Tiempo de cooldown en milisegundos
 * @returns {boolean} true si está en cooldown, false si puede enviar
 */
export function checkCooldown(from, cooldownMs = 1500) {
  const now = Date.now();
  const last = cooldownCache.get(from) || 0;
  
  if (now - last < cooldownMs) {
    return true; // Está en cooldown
  }
  
  cooldownCache.set(from, now);
  return false; // No está en cooldown
}

/**
 * Obtiene el tiempo del último mensaje de un remitente
 * @param {string} from - ID del remitente
 * @returns {number} Timestamp del último mensaje o 0
 */
export function getLastMessageTime(from) {
  return cooldownCache.get(from) || 0;
}

/**
 * Limpia el cache de cooldown (útil para testing o reset)
 */
export function clearCooldownCache() {
  cooldownCache.clear();
}

/**
 * Obtiene estadísticas del cache
 * @returns {Object} Estadísticas
 */
export function getCacheStats() {
  return {
    configCacheSize: configCache.size(),
    cooldownCacheSize: cooldownCache.size
  };
}

