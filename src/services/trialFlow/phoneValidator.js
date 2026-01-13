// Validador de números de WhatsApp usando whatsapp-web.js
import { logSession } from '../../utils/logger/index.js';
import { getGlobalSessionManager } from '../sessionManager/global.js';

/**
 * Verifica si un número de teléfono está registrado en WhatsApp
 * @param {string} phoneNumber - Número de teléfono a verificar (formato: 5491169956253)
 * @param {string} masterSessionId - ID de la sesión master (para usar su cliente de WhatsApp)
 * @returns {Promise<{isValid: boolean, error: string|null}>}
 */
export async function validateWhatsAppNumber(phoneNumber, masterSessionId) {
  try {
    logSession(masterSessionId, `🔍 Validando número de WhatsApp: ${phoneNumber}`);
    
    // Obtener el SessionManager
    const sessionManager = getGlobalSessionManager();
    if (!sessionManager) {
      logSession(masterSessionId, `⚠️ SessionManager no disponible para validar número`);
      return { isValid: false, error: 'SessionManager no disponible' };
    }
    
    // Obtener la sesión master
    const masterSessionData = sessionManager.getSession(masterSessionId);
    if (!masterSessionData || !masterSessionData.client) {
      logSession(masterSessionId, `⚠️ Sesión master no disponible para validar número`);
      return { isValid: false, error: 'Sesión master no disponible' };
    }
    
    const client = masterSessionData.client;
    
    // Verificar que el cliente esté conectado
    try {
      const state = await client.getState();
      if (state !== 'CONNECTED') {
        logSession(masterSessionId, `⚠️ Cliente master no conectado (estado: ${state})`);
        return { isValid: false, error: `Cliente no conectado (estado: ${state})` };
      }
    } catch (stateError) {
      logSession(masterSessionId, `⚠️ Error verificando estado del cliente: ${stateError?.message || stateError}`);
      return { isValid: false, error: 'Error verificando estado del cliente' };
    }
    
    // Formatear el número para WhatsApp (agregar @c.us si no lo tiene)
    const phoneFormatted = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
    
    // Intentar obtener el ID del número usando getNumberId
    // Si el número no existe en WhatsApp, esto lanzará un error
    try {
      logSession(masterSessionId, `📱 Intentando obtener ID del número: ${phoneFormatted}`);
      const numberId = await client.getNumberId(phoneFormatted);
      
      if (numberId) {
        logSession(masterSessionId, `✅ Número válido: ${phoneNumber} (ID: ${numberId._serialized || numberId})`);
        return { isValid: true, error: null };
      } else {
        logSession(masterSessionId, `❌ Número no válido: ${phoneNumber} (getNumberId retornó null)`);
        return { isValid: false, error: 'Número no registrado en WhatsApp' };
      }
    } catch (getNumberIdError) {
      // Si getNumberId lanza un error, el número probablemente no existe
      const errorMessage = getNumberIdError?.message || String(getNumberIdError);
      logSession(masterSessionId, `❌ Error obteniendo ID del número: ${errorMessage}`);
      
      // Verificar si el error indica que el número no existe
      if (errorMessage.includes('not registered') || 
          errorMessage.includes('not found') || 
          errorMessage.includes('invalid') ||
          errorMessage.includes('404')) {
        return { isValid: false, error: 'Número no registrado en WhatsApp' };
      }
      
      // Si es otro tipo de error, retornar el error genérico
      return { isValid: false, error: 'Error al validar el número' };
    }
  } catch (error) {
    logSession(masterSessionId, `❌ Error inesperado validando número: ${error?.message || error}`);
    return { isValid: false, error: 'Error inesperado al validar el número' };
  }
}

