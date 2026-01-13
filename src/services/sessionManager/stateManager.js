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

/**
 * Marca una sesión como lista (ready) - Función consolidada que ejecuta toda la lógica necesaria
 * Esta función consolida el patrón repetido de marcar una sesión como ready en múltiples lugares
 * @param {Object} client - Cliente de WhatsApp
 * @param {Object} sessionData - Datos de la sesión
 * @param {string} sessionId - ID de la sesión
 * @param {number} readyTime - Timestamp cuando se conectó (opcional, se genera si no se proporciona)
 * @param {Object} options - Opciones adicionales
 * @param {boolean} options.clearQR - Si se debe limpiar el QR (default: true)
 * @param {string} options.context - Contexto para logging (default: 'ready')
 * @returns {Promise<void>}
 */
export async function markSessionAsReady(client, sessionData, sessionId, readyTime = null, options = {}) {
  const { clearQR = true, context = 'ready' } = options;
  const actualReadyTime = readyTime || Date.now();
  
  // Importar dependencias necesarias
  const { setSessionReadyTime } = await import('../../services/messageHandler/index.js');
  const { captureAndSavePhoneNumber } = await import('./phoneCapture.js');
  
  // Marcar sesión como ready
  markSessionReady(sessionData, sessionId, actualReadyTime);
  setSessionReadyTime(sessionId, actualReadyTime);
  
  // Actualizar el status de la sesión a 'connected' en la base de datos
  try {
    const { updateSessionStatus } = await import('../../services/database/sessionService.js');
    await updateSessionStatus(sessionId, 'connected');
    logSession(sessionId, `✅ Status actualizado a 'connected' en la base de datos`);
  } catch (statusError) {
    logSession(sessionId, `⚠️ Error actualizando status: ${statusError?.message || statusError}`);
  }
  
  // Capturar número de teléfono del WhatsApp conectado
  await captureAndSavePhoneNumber(client, sessionId, sessionData);
  
  // Marcar como ready y limpiar QR si es necesario
  sessionData.isReady = true;
  if (clearQR) {
    sessionData.lastQRDataURL = null;
  }
  
  logSession(sessionId, `✅ BOT IS READY (${context})`);
  logSession(sessionId, '🎯 Listener de mensajes registrado y activo');
  logSession(sessionId, '📬 El bot está listo para recibir mensajes');
}

