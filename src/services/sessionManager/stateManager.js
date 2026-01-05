// Gestión de estados de sesiones
import { logSession } from '../../utils/logger/index.js';

/**
 * Estados válidos de una sesión
 */
export const SessionState = {
  PENDING: 'qr_pending',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

/**
 * Actualiza el estado de una sesión
 * @param {Object} sessionData - Datos de la sesión
 * @param {string} sessionId - ID de la sesión
 * @param {string} newState - Nuevo estado
 */
export function updateSessionState(sessionData, sessionId, newState) {
  const oldState = sessionData.state || SessionState.PENDING;
  sessionData.state = newState;
  
  if (oldState !== newState) {
    logSession(sessionId, `🔄 Estado cambiado: ${oldState} → ${newState}`);
  }
}

/**
 * Verifica si una sesión está lista
 * @param {Object} sessionData - Datos de la sesión
 * @returns {boolean} true si está lista
 */
export function isSessionReady(sessionData) {
  return sessionData.isReady === true && sessionData.state === SessionState.CONNECTED;
}

/**
 * Marca una sesión como lista
 * @param {Object} sessionData - Datos de la sesión
 * @param {string} sessionId - ID de la sesión
 * @param {number} readyTime - Timestamp cuando se conectó
 */
export function markSessionReady(sessionData, sessionId, readyTime) {
  sessionData.isReady = true;
  sessionData.readyTime = readyTime;
  updateSessionState(sessionData, sessionId, SessionState.CONNECTED);
  logSession(sessionId, `✅ Sesión marcada como lista a las ${new Date(readyTime).toISOString()}`);
}

/**
 * Marca una sesión como desconectada
 * @param {Object} sessionData - Datos de la sesión
 * @param {string} sessionId - ID de la sesión
 */
export function markSessionDisconnected(sessionData, sessionId) {
  sessionData.isReady = false;
  updateSessionState(sessionData, sessionId, SessionState.DISCONNECTED);
  logSession(sessionId, `⚠️ Sesión marcada como desconectada`);
}

