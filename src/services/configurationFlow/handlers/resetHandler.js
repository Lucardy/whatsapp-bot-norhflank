// Handler para el reset de configuración
import { ConfigStep } from '../constants.js';
import { getSession, updateSession } from '../sessionManager.js';
import { resetConfigData } from '../utils/dataManager.js';
import { buildResponse } from '../utils/responseBuilder.js';
import { returnToSelectionMenu } from '../navigation.js';
import { logSession } from '../../../utils/logger/index.js';

/**
 * Maneja la confirmación de reset
 * @param {number} clientId - ID del cliente
 * @param {string} message - Mensaje del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta
 */
export async function handleResetConfirmation(clientId, message, sessionId) {
  const configSession = getSession(clientId);
  if (!configSession) {
    return buildResponse(clientId, null, false, false);
  }
  
  const messageLower = message.toLowerCase().trim();
  
  if (messageLower === 'eliminar' || messageLower === 'delete' || messageLower === 'confirmar') {
    // Resetear configuración
    resetConfigData(configSession.data);
    updateSession(clientId, { step: ConfigStep.SELECTING_OPTION });
    
    logSession(sessionId, `🔄 Configuración reseteada para cliente ${clientId}`);
    
    return await returnToSelectionMenu(clientId, sessionId, '✅ *Configuración reseteada*\n\nTodos los mensajes y opciones han sido eliminados. Puedes empezar a configurar desde cero.\n\n');
  }
  
  if (messageLower === 'cancelar' || messageLower === 'cancel' || messageLower === 'no') {
    updateSession(clientId, { step: ConfigStep.SELECTING_OPTION });
    return await returnToSelectionMenu(clientId, sessionId, '❌ Reset cancelado.\n\n');
  }
  
  return buildResponse(clientId, '❓ No entendí. Escribe "eliminar" para confirmar el reset, o "cancelar" para cancelar.', false, false);
}

