// Handler para la edición del mensaje de bienvenida
import { ValidationError } from '../../../utils/errors.js';
import { getSession } from '../sessionManager.js';
import { buildResponse } from '../utils/responseBuilder.js';
import { returnToSelectionMenu } from '../navigation.js';
import { logSession } from '../../../utils/logger/index.js';

/**
 * Maneja la edición del mensaje de bienvenida
 * @param {number} clientId - ID del cliente
 * @param {string} message - Mensaje del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta
 */
export async function handleWelcomeEdit(clientId, message, sessionId) {
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
  
  configSession.data.welcome_message = message.trim();
  logSession(sessionId, `✅ Mensaje de bienvenida actualizado para cliente ${clientId}`);
  
  return await returnToSelectionMenu(clientId, sessionId, '✅ Mensaje de bienvenida guardado.\n\n');
}

