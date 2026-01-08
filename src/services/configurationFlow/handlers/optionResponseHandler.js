// Handler para la edición de la respuesta de una opción
import { ValidationError } from '../../../utils/errors.js';
import { getSession, updateSession } from '../sessionManager.js';
import { updateOption } from '../utils/dataManager.js';
import { buildResponse } from '../utils/responseBuilder.js';
import { returnToSelectionMenu } from '../navigation.js';
import { logSession } from '../../../utils/logger/index.js';

/**
 * Maneja la edición de la respuesta de una opción
 * @param {number} clientId - ID del cliente
 * @param {string} message - Mensaje del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta
 */
export async function handleOptionResponseEdit(clientId, message, sessionId) {
  const configSession = getSession(clientId);
  if (!configSession) {
    return buildResponse(clientId, null, false, false);
  }
  
  // Validar mensaje
  try {
    const { validateBotMessage } = await import('../../../utils/validation/messageValidator.js');
    validateBotMessage(message, { maxLength: 2000 });
  } catch (validationError) {
    if (validationError instanceof ValidationError) {
      return buildResponse(clientId, `❌ ${validationError.message}\n\nPor favor, envía un mensaje válido (mínimo 3 caracteres, máximo 2000 caracteres).`, false, false);
    }
  }
  
  // Guardar respuesta
  const optionNumber = configSession.currentOption;
  updateOption(configSession.data, optionNumber, message.trim(), false);
  logSession(sessionId, `✅ Opción ${optionNumber} guardada para cliente ${clientId}`);
  
  updateSession(clientId, { currentOption: undefined });
  return await returnToSelectionMenu(clientId, sessionId, `✅ Pregunta y Respuesta N°${optionNumber} guardada.\n\n`);
}

