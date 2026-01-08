// Handler para confirmaciones (guardar, cancelar)
import { getSession, deleteSession } from '../sessionManager.js';
import { buildResponse } from '../utils/responseBuilder.js';
import { completeConfiguration } from '../persistence/configSaver.js';

/**
 * Maneja la confirmación para guardar la configuración
 * @param {number} clientId - ID del cliente
 * @param {string} message - Mensaje del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Resultado de la confirmación
 */
export async function handleConfirmation(clientId, message, sessionId) {
  const configSession = getSession(clientId);
  
  if (!configSession || !configSession.waitingConfirmation) {
    return buildResponse(clientId, null, false, false);
  }
  
  const messageLower = message.toLowerCase().trim();
  
  if (messageLower === 'guardar' || messageLower === 'si' || messageLower === 'sí' || messageLower === 'yes') {
    return await completeConfiguration(clientId, sessionId);
  }
  
  if (messageLower === 'cancelar' || messageLower === 'cancel' || messageLower === 'no') {
    deleteSession(clientId);
    return buildResponse(clientId, '❌ Configuración cancelada. No se guardaron cambios.', false, true);
  }
  
  return buildResponse(clientId, '❓ No entendí. Escribe "guardar" o "si" para confirmar, o "cancelar" para salir sin guardar.', false, false);
}

