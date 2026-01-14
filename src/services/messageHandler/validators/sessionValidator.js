// Validador de sesión y estado del cliente
import { logSession } from '../../../utils/logger/index.js';

/**
 * Valida que la sesión esté disponible y el cliente esté conectado
 * @param {string} sessionId - ID de la sesión
 * @param {boolean} allowUnconnected - Si es true, permite mensajes incluso si la sesión no está conectada (para mensajes propios del cliente)
 * @returns {Promise<{valid: boolean, sessionData: Object|null, error: string|null}>}
 */
export async function validateSession(sessionId, allowUnconnected = false) {
  try {
    const { getGlobalSessionManager } = await import('../../sessionManager/global.js');
    const sessionManager = getGlobalSessionManager();
    
    if (!sessionManager) {
      return { valid: false, sessionData: null, error: 'SessionManager no disponible' };
    }
    
    const sessionData = sessionManager.getSession(sessionId);
    if (!sessionData || !sessionData.client) {
      logSession(sessionId, '⚠️ Sesión no disponible, ignorando mensaje');
      return { valid: false, sessionData: null, error: 'Sesión no disponible' };
    }
    
    // Validar que el cliente esté conectado
    // EXCEPCIÓN: Si allowUnconnected es true, permitir mensajes incluso si no está conectada
    // Esto permite que los clientes accedan al menú para ver el link de pago cuando su sesión está suspendida
    try {
      const state = await sessionData.client.getState();
      if (state !== 'CONNECTED') {
        if (allowUnconnected) {
          logSession(sessionId, `⚠️ Cliente no conectado (estado: ${state}), pero permitiendo mensaje (allowUnconnected=true)`);
          return { valid: true, sessionData, error: null }; // Permitir mensaje aunque no esté conectada
        }
        logSession(sessionId, `⚠️ Cliente no conectado (estado: ${state}), ignorando mensaje`);
        return { valid: false, sessionData: null, error: `Cliente no conectado (estado: ${state})` };
      }
    } catch (stateError) {
      if (allowUnconnected) {
        logSession(sessionId, `⚠️ Error verificando estado: ${stateError?.message || stateError}, pero permitiendo mensaje (allowUnconnected=true)`);
        return { valid: true, sessionData, error: null }; // Permitir mensaje aunque haya error
      }
      logSession(sessionId, `⚠️ Error verificando estado: ${stateError?.message || stateError}`);
      return { valid: false, sessionData: null, error: `Error verificando estado: ${stateError?.message || stateError}` };
    }
    
    return { valid: true, sessionData, error: null };
  } catch (error) {
    logSession(sessionId, `⚠️ Error en validación de sesión: ${error?.message || error}`);
    return { valid: false, sessionData: null, error: error?.message || 'Error desconocido' };
  }
}

