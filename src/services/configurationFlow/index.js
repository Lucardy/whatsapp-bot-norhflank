// Punto de entrada principal del flujo de configuración
import { ConfigStep } from './constants.js';
import { logSession } from '../../utils/logger/index.js';
import { getClientConfig } from '../database/configService.js';
import { createSession, getSession, deleteSession, hasSession, getStep } from './sessionManager.js';
import { generateSelectionMenu } from './menuGenerator.js';
import { shouldIgnoreMessage } from './utils/messageFilter.js';
import { handleSelection } from './handlers/selectionHandler.js';
import { handleWelcomeEdit } from './handlers/welcomeHandler.js';
import { handleOptionLabelEdit } from './handlers/optionLabelHandler.js';
import { handleOptionResponseEdit } from './handlers/optionResponseHandler.js';
import { handleResetConfirmation } from './handlers/resetHandler.js';
import { handleConfirmation } from './handlers/confirmationHandler.js';
import { returnToSelectionMenu } from './navigation.js';
import { showPreview } from './preview/previewManager.js';
import { buildResponse } from './utils/responseBuilder.js';

// Re-exportar constantes
export { ConfigStep } from './constants.js';

/**
 * Inicia el modo configuración para un cliente
 * @param {number} clientId - ID del cliente
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @param {string} sessionId - ID de la sesión (master)
 * @returns {Promise<string>} Mensaje de inicio
 */
export async function startConfiguration(clientId, phoneNumber, sessionId) {
  logSession(sessionId, `⚙️ Iniciando modo configuración para cliente ${clientId}`);
  
  // Obtener configuración actual
  const currentConfig = await getClientConfig(sessionId);
  
  // Crear sesión de configuración
  createSession(clientId, {
    phoneNumber,
    welcome_message: currentConfig?.welcome_message || null,
    options: currentConfig?.menu_options?.options || []
  });
  
  const session = getSession(clientId);
  const menu = generateSelectionMenu(session.data, sessionId);
  
  return `⚙️ *Modo Configuración Activado*

${menu}`;
}

/**
 * Procesa un paso del flujo de configuración
 * @param {number} clientId - ID del cliente
 * @param {string} message - Mensaje del cliente
 * @param {string} sessionId - ID de la sesión (master)
 * @returns {Promise<Object>} { response: string, completed: boolean, cancelled: boolean }
 */
export async function handleConfigurationStep(clientId, message, sessionId) {
  const configSession = getSession(clientId);
  
  if (!configSession) {
    return buildResponse(clientId, null, false, false);
  }
  
  // Filtrar mensajes que no deben ser procesados
  if (shouldIgnoreMessage(clientId, message, sessionId)) {
    return buildResponse(clientId, null, false, false);
  }
  
  const messageLower = message.toLowerCase().trim();
  
  // Comando cancelar (siempre disponible)
  if (messageLower === 'cancelar' || messageLower === 'cancel') {
    deleteSession(clientId);
    logSession(sessionId, `❌ Configuración cancelada por cliente ${clientId}`);
    return buildResponse(clientId, '❌ *Configuración cancelada*\n\nNo se guardaron cambios. Puedes volver a configurar cuando quieras escribiendo "configurar" o "menú".', false, true);
  }

  // Si está esperando confirmación de reset, manejar confirmación
  if (configSession.step === ConfigStep.RESETTING) {
    return await handleResetConfirmation(clientId, message, sessionId);
  }
  
  // Si está esperando confirmación de guardar, manejar confirmación
  if (configSession.waitingConfirmation) {
    return await handleConfirmation(clientId, message, sessionId);
  }
  
  // Si está editando una opción (label o response), manejar la edición
  if (configSession.editingOption) {
    // Este caso se maneja en el switch principal
  }
  
  // Comando saltar
  if (messageLower === 'saltar' || messageLower === 'skip') {
    return await returnToSelectionMenu(clientId, sessionId);
  }
  
  // Comando ver vista previa
  if (messageLower === 'ver' || messageLower === 'preview' || messageLower === 'vista previa') {
    return await showPreview(clientId, sessionId);
  }
  
  // Procesar según el paso actual
  let result;
  switch (configSession.step) {
    case ConfigStep.SELECTING_OPTION:
      result = await handleSelection(clientId, message, sessionId);
      break;
      
    case ConfigStep.WELCOME:
      result = await handleWelcomeEdit(clientId, message, sessionId);
      break;
      
    case ConfigStep.OPTION_LABEL:
      result = await handleOptionLabelEdit(clientId, message, sessionId);
      break;
      
    case ConfigStep.OPTION_RESPONSE:
      result = await handleOptionResponseEdit(clientId, message, sessionId);
      break;
      
    default:
      result = buildResponse(clientId, '❓ No entendí. Escribe "cancelar" para salir o "ver" para ver la vista previa.', false, false);
  }
  
  return result;
}

/**
 * Verifica si un cliente está en modo configuración
 * @param {number} clientId - ID del cliente
 * @returns {boolean} true si está en modo configuración
 */
export function isInConfigurationMode(clientId) {
  return hasSession(clientId);
}

/**
 * Obtiene el paso actual de configuración
 * @param {number} clientId - ID del cliente
 * @returns {string|null} Paso actual o null
 */
export function getConfigurationStep(clientId) {
  return getStep(clientId);
}

/**
 * Cancela el modo configuración para un cliente
 * @param {number} clientId - ID del cliente
 */
export function cancelConfiguration(clientId) {
  deleteSession(clientId);
}

/**
 * Re-exportar handleConfirmation para compatibilidad
 */
export { handleConfirmation };
