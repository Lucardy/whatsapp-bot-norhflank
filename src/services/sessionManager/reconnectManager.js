// Lógica de reconexión automática
import { logSession } from '../../utils/logger/index.js';

// Configuración de reconexión
const RECONNECT_DELAY = 3000; // 3 segundos
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Intenta reconectar una sesión después de un delay
 * @param {Function} ensureInit - Función para inicializar la sesión
 * @param {string} sessionId - ID de la sesión
 * @param {number} attempt - Número de intento actual
 */
export function scheduleReconnect(ensureInit, sessionId, attempt = 1) {
  if (attempt > MAX_RECONNECT_ATTEMPTS) {
    logSession(sessionId, `❌ Máximo de intentos de reconexión alcanzado (${MAX_RECONNECT_ATTEMPTS})`);
    return;
  }
  
  logSession(sessionId, `🔄 Programando reconexión en ${RECONNECT_DELAY}ms (intento ${attempt}/${MAX_RECONNECT_ATTEMPTS})`);
  
  setTimeout(async () => {
    try {
      logSession(sessionId, `🔄 Intentando reconectar... (intento ${attempt})`);
      await ensureInit();
    } catch (err) {
      logSession(sessionId, `⚠️ Error en intento de reconexión ${attempt}: ${err?.message || err}`);
      // Intentar de nuevo
      scheduleReconnect(ensureInit, sessionId, attempt + 1);
    }
  }, RECONNECT_DELAY);
}

/**
 * Maneja la desconexión de una sesión
 * @param {Object} sessionData - Datos de la sesión
 * @param {string} sessionId - ID de la sesión
 * @param {string} reason - Razón de la desconexión
 * @param {Function} ensureInit - Función para inicializar la sesión
 * @param {Function} markDisconnected - Función para marcar como desconectada
 */
export function handleDisconnection(sessionData, sessionId, reason, ensureInit, markDisconnected) {
  logSession(sessionId, `⚠️ Desconectado, motivo: ${reason}`);
  
  if (reason === 'LOGOUT') {
    logSession(sessionId, '🔄 Necesita re-escaneo de QR (logout desde el celular o conflicto de sesión)');
  }
  
  markDisconnected(sessionData, sessionId);
  
  // Intentar destruir el cliente
  if (sessionData.client) {
    try {
      sessionData.client.destroy().catch(() => {});
    } catch (err) {
      // Ignorar errores al destruir
    }
    sessionData.client = null;
  }
  
  // Programar reconexión solo si no fue un logout
  if (reason !== 'LOGOUT') {
    scheduleReconnect(ensureInit, sessionId);
  }
}

