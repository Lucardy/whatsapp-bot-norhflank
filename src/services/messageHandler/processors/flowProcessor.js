// Procesador de flujos conversacionales (trial, configuración)
import { logSession } from '../../../utils/logger/index.js';
import { handleTrialFlow } from '../handlers/trialFlowHandler.js';
import { handleConfigurationFlow } from '../handlers/configurationFlowHandler.js';
import { handleQRResend } from '../handlers/qrResendHandler.js';
import { registerHandler, executeHandler } from '../handlers/handlerFactory.js';

// Registrar handlers al cargar el módulo
registerHandler('qr_resend', handleQRResend);
registerHandler('trial', handleTrialFlow);
registerHandler('configuration', (msg, sessionId, chatId, clientId, texto) => 
  handleConfigurationFlow(msg, sessionId, chatId, clientId, texto)
);

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
  const qrResendHandled = await executeHandler('qr_resend', msg, sessionId, chatId, texto);
  if (qrResendHandled) {
    return true;
  }
  
  // Manejar flujo de trial
  const trialHandled = await executeHandler('trial', msg, sessionId, chatId, texto);
  if (trialHandled) {
    return true;
  }
  
  // Manejar flujo de configuración
  const configHandled = await executeHandler('configuration', msg, sessionId, chatId, clientId, texto);
  if (configHandled) {
    return true;
  }
  
  return false; // No procesado por ningún flujo
}

