// Manejo de edición parcial de opciones
import { ConfigStep } from '../index.js';
import { getCurrentOption } from '../data/configDataManager.js';

/**
 * Inicia la edición parcial de una opción específica
 * @param {number} clientId - ID del cliente
 * @param {string} optionKey - Clave de la opción ('1', '2', '3', '4')
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta para editar
 */
export async function startPartialEdit(clientId, optionKey, sessionId) {
  // Importar dinámicamente para evitar dependencias circulares
  const { getConfigurationSession } = await import('../index.js');
  const configSession = getConfigurationSession(clientId);
  
  if (!configSession) {
    return { response: null, completed: false, cancelled: false };
  }
  
  const currentMessage = getCurrentOption(configSession.data, optionKey);
  
  // Guardar el paso anterior para volver después
  configSession.previousStep = configSession.step;
  configSession.editingOption = optionKey;
  
  // Cambiar al paso correspondiente
  const stepMap = {
    '1': ConfigStep.OPTION_1,
    '2': ConfigStep.OPTION_2,
    '3': ConfigStep.OPTION_3,
    '4': ConfigStep.OPTION_4
  };
  
  configSession.step = stepMap[optionKey];
  
  return {
    response: `✏️ *Editando Opción ${optionKey}*\n\nEnvía el nuevo mensaje para la opción ${optionKey}.\n\n💡 *Comandos:*\n• 'saltar' - Mantener mensaje actual\n• 'cancelar' - Volver sin cambios\n\n*Mensaje actual:* ${currentMessage ? `"${currentMessage.substring(0, 80)}${currentMessage.length > 80 ? '...' : ''}"` : 'No configurado'}`,
    completed: false,
    cancelled: false
  };
}

