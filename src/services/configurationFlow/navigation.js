// Navegación entre pasos del flujo
import { ConfigStep } from './constants.js';
import { getSession, updateSession } from './sessionManager.js';
import { generateSelectionMenu } from './menuGenerator.js';
import { buildResponse } from './utils/responseBuilder.js';

/**
 * Vuelve al menú de selección
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @param {string} prefixMessage - Mensaje a mostrar antes del menú
 * @returns {Promise<Object>} Respuesta
 */
export async function returnToSelectionMenu(clientId, sessionId, prefixMessage = '') {
  const configSession = getSession(clientId);
  if (!configSession) {
    return buildResponse(clientId, null, false, false);
  }
  
  updateSession(clientId, {
    step: ConfigStep.SELECTING_OPTION,
    currentOption: undefined
  });
  
  const menu = generateSelectionMenu(configSession.data, sessionId);
  
  return buildResponse(clientId, `${prefixMessage}${menu}\n\n💡 *Escribe "ver" para ver la vista previa completa, o "0" para resetear todo.*`, false, false);
}

