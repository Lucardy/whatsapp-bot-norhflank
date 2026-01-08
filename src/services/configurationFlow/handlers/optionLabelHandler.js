// Handler para la edición del label de una opción
import { ConfigStep } from '../constants.js';
import { ValidationError } from '../../../utils/errors.js';
import { getSession, updateSession } from '../sessionManager.js';
import { updateOption, getCurrentOption } from '../utils/dataManager.js';
import { buildResponse } from '../utils/responseBuilder.js';

/**
 * Maneja la edición del label de una opción
 * @param {number} clientId - ID del cliente
 * @param {string} message - Mensaje del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta
 */
export async function handleOptionLabelEdit(clientId, message, sessionId) {
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
  
  // Guardar label
  updateOption(configSession.data, configSession.currentOption, message.trim(), true);
  
  // Avanzar a editar la respuesta
  updateSession(clientId, { step: ConfigStep.OPTION_RESPONSE });
  const currentResponse = getCurrentOption(configSession.data, configSession.currentOption) || 'No configurado';
  
  return buildResponse(clientId, `✅ Pregunta guardada.\n\n📝 *Ahora envía la respuesta para la Pregunta N°${configSession.currentOption}*

Envía el mensaje que quieres que aparezca cuando un usuario escriba "${configSession.currentOption}".

💡 *Comandos disponibles:*
• 'saltar' - Mantener respuesta actual
• 'cancelar' - Volver al menú
• 'ver' - Ver vista previa

📏 *Requisitos:* Mínimo 3 caracteres, máximo 2000 caracteres

*Respuesta actual:* ${currentResponse !== 'No configurado' ? `"${currentResponse.substring(0, 80)}${currentResponse.length > 80 ? '...' : ''}"` : 'No configurado'}`, false, false);
}

