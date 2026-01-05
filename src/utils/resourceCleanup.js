// Utilidades para limpieza de recursos (event listeners, timeouts, intervals)
import { log, logSession } from './logger/index.js';

/**
 * Mapa de timeouts activos por sesión
 */
const activeTimeouts = new Map();

/**
 * Mapa de intervals activos por sesión
 */
const activeIntervals = new Map();

/**
 * Mapa de event listeners activos por sesión
 */
const activeListeners = new Map();

/**
 * Registra un timeout para limpieza posterior
 * @param {string} sessionId - ID de la sesión
 * @param {number} timeoutId - ID del timeout
 */
export function registerTimeout(sessionId, timeoutId) {
  if (!activeTimeouts.has(sessionId)) {
    activeTimeouts.set(sessionId, []);
  }
  activeTimeouts.get(sessionId).push(timeoutId);
}

/**
 * Registra un interval para limpieza posterior
 * @param {string} sessionId - ID de la sesión
 * @param {number} intervalId - ID del interval
 */
export function registerInterval(sessionId, intervalId) {
  if (!activeIntervals.has(sessionId)) {
    activeIntervals.set(sessionId, []);
  }
  activeIntervals.get(sessionId).push(intervalId);
}

/**
 * Registra un event listener para limpieza posterior
 * @param {string} sessionId - ID de la sesión
 * @param {Object} listenerInfo - Información del listener { event, handler, target }
 */
export function registerListener(sessionId, listenerInfo) {
  if (!activeListeners.has(sessionId)) {
    activeListeners.set(sessionId, []);
  }
  activeListeners.get(sessionId).push(listenerInfo);
}

/**
 * Limpia todos los recursos de una sesión
 * @param {string} sessionId - ID de la sesión
 */
export function cleanupSessionResources(sessionId) {
  // Limpiar timeouts
  const timeouts = activeTimeouts.get(sessionId);
  if (timeouts) {
    timeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    activeTimeouts.delete(sessionId);
    logSession(sessionId, `🧹 Limpiados ${timeouts.length} timeouts`);
  }
  
  // Limpiar intervals
  const intervals = activeIntervals.get(sessionId);
  if (intervals) {
    intervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    activeIntervals.delete(sessionId);
    logSession(sessionId, `🧹 Limpiados ${intervals.length} intervals`);
  }
  
  // Limpiar event listeners
  const listeners = activeListeners.get(sessionId);
  if (listeners) {
    listeners.forEach(({ event, handler, target }) => {
      try {
        if (target && typeof target.off === 'function') {
          target.off(event, handler);
        } else if (target && typeof target.removeListener === 'function') {
          target.removeListener(event, handler);
        } else if (target && typeof target.removeEventListener === 'function') {
          target.removeEventListener(event, handler);
        }
      } catch (error) {
        logSession(sessionId, `⚠️ Error removiendo listener ${event}: ${error?.message || error}`);
      }
    });
    activeListeners.delete(sessionId);
    logSession(sessionId, `🧹 Limpiados ${listeners.length} event listeners`);
  }
}

/**
 * Limpia todos los recursos de todas las sesiones
 */
export function cleanupAllResources() {
  const allSessions = new Set([
    ...activeTimeouts.keys(),
    ...activeIntervals.keys(),
    ...activeListeners.keys()
  ]);
  
  allSessions.forEach(sessionId => {
    cleanupSessionResources(sessionId);
  });
  
  log(`🧹 Limpiados recursos de ${allSessions.size} sesiones`);
}

/**
 * Obtiene estadísticas de recursos activos
 * @returns {Object} Estadísticas
 */
export function getResourceStats() {
  return {
    sessionsWithTimeouts: activeTimeouts.size,
    sessionsWithIntervals: activeIntervals.size,
    sessionsWithListeners: activeListeners.size,
    totalTimeouts: Array.from(activeTimeouts.values()).reduce((sum, arr) => sum + arr.length, 0),
    totalIntervals: Array.from(activeIntervals.values()).reduce((sum, arr) => sum + arr.length, 0),
    totalListeners: Array.from(activeListeners.values()).reduce((sum, arr) => sum + arr.length, 0)
  };
}

