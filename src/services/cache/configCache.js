// Caché centralizado para configuración de clientes
import { logSession } from '../../utils/logger/index.js';
import { CONFIG_CACHE_TTL, CLEANUP_INTERVAL_CONFIG_CACHE } from '../../config/constants.js';

// Caché en memoria: sessionId -> { config, timestamp, ttl }
const configCache = new Map();

// TTL por defecto desde constantes
const DEFAULT_TTL = CONFIG_CACHE_TTL;

// Métricas de caché
const cacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0
};

/**
 * Obtiene la configuración del caché
 * @param {string} sessionId - ID de la sesión
 * @returns {Object|null} Configuración en caché o null
 */
export function getCachedConfig(sessionId) {
  const cached = configCache.get(sessionId);
  
  if (!cached) {
    cacheMetrics.misses++;
    return null;
  }
  
  // Verificar si expiró
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    configCache.delete(sessionId);
    cacheMetrics.misses++;
    return null;
  }
  
  cacheMetrics.hits++;
  return cached.config;
}

/**
 * Guarda la configuración en el caché
 * @param {string} sessionId - ID de la sesión
 * @param {Object} config - Configuración a guardar
 * @param {number} ttl - Tiempo de vida en milisegundos (opcional, default: 5 minutos)
 */
export function setCachedConfig(sessionId, config, ttl = DEFAULT_TTL) {
  configCache.set(sessionId, {
    config,
    timestamp: Date.now(),
    ttl
  });
  cacheMetrics.sets++;
}

/**
 * Limpia el caché de una sesión específica
 * @param {string} sessionId - ID de la sesión
 */
export function clearCachedConfig(sessionId) {
  if (configCache.has(sessionId)) {
    configCache.delete(sessionId);
    cacheMetrics.invalidations++;
    logSession(sessionId, '🗑️ Caché de configuración limpiado');
  }
}

/**
 * Limpia todo el caché de configuración
 */
export function clearAllCachedConfigs() {
  const count = configCache.size;
  configCache.clear();
  cacheMetrics.invalidations += count;
  logSession('system', `🗑️ Todo el caché de configuración limpiado (${count} entradas)`);
}

/**
 * Obtiene métricas del caché
 * @returns {Object} Métricas del caché
 */
export function getCacheMetrics() {
  const total = cacheMetrics.hits + cacheMetrics.misses;
  const hitRate = total > 0 ? (cacheMetrics.hits / total * 100).toFixed(2) : 0;
  
  return {
    ...cacheMetrics,
    total,
    hitRate: `${hitRate}%`,
    size: configCache.size
  };
}

/**
 * Limpia entradas expiradas del caché
 */
export function cleanupExpiredEntries() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [sessionId, cached] of configCache.entries()) {
    if (now - cached.timestamp > cached.ttl) {
      configCache.delete(sessionId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logSession('system', `🧹 Limpiadas ${cleaned} entradas expiradas del caché`);
  }
}

// Limpiar entradas expiradas periódicamente
setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_CONFIG_CACHE);

