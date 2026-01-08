// Procesador de flujos conversacionales (trial, configuración)
import { logSession } from '../../../utils/logger/index.js';
import { handleTrialFlow } from '../handlers/trialFlowHandler.js';
import { handleConfigurationFlow } from '../handlers/configurationFlowHandler.js';
import { handleQRResend } from '../handlers/qrResendHandler.js';

/**
 * Procesa flujos conversacionales (trial, configuración)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {number} clientId - ID del cliente
 * @param {string} texto - Texto del mensaje
 * @returns {Promise<boolean>} true si el mensaje fue procesado por algún flujo
 */
export async function processFlows(msg, sessionId, chatId, clientId, texto) {
  // PRIORIDAD: Manejar solicitud de reenvío de QR (debe ser antes del flujo de trial)
  // Esto funciona tanto para clientes en flujo de trial como para clientes que ya tienen bot
  const qrResendHandled = await handleQRResend(msg, sessionId, chatId, texto);
  if (qrResendHandled) {
    return true; // Mensaje procesado por el handler de reenvío de QR
  }
  
  // Manejar flujo de trial
  const trialHandled = await handleTrialFlow(msg, sessionId, chatId, texto);
  if (trialHandled) {
    return true; // Mensaje procesado por el flujo de trial
  }
  
  // Manejar flujo de configuración
  const configHandled = await handleConfigurationFlow(msg, sessionId, chatId, clientId, texto);
  if (configHandled) {
    return true; // Mensaje procesado por el flujo de configuración
  }
  
  return false; // No procesado por ningún flujo
}

