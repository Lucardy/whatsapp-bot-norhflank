// Processor para envío y reenvío de QR en el flujo de trial
// Responsabilidad única: Manejar el envío de QR (nuevo, reenvío, manejo de errores)

import { logSession } from '../../../../utils/logger/index.js';
import { sendQRImage } from '../qrImageHandler.js';
import { TrialStep } from '../../../trialFlow/constants.js';

/**
 * Procesa el envío de QR (nuevo o reenvío)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} qrDataURL - Data URL del QR
 * @param {string|null} targetPhoneNumber - Número destino del QR (null = mismo número)
 * @param {string|null} sessionName - Nombre de la sesión (para guardar mensaje original)
 * @param {Object} trialSession - Sesión de trial (para obtener mensaje original)
 * @returns {Promise<void>}
 */
export async function processQRDelivery(msg, sessionId, chatId, qrDataURL, targetPhoneNumber, sessionName, trialSession) {
  if (targetPhoneNumber) {
    logSession(sessionId, `📱 Enviando QR a número especificado: ${targetPhoneNumber}`);
  } else {
    logSession(sessionId, `📱 Enviando QR al mismo número desde el que está hablando: ${chatId}`);
  }
  
  // Guardar el número destino del QR en sessionData para poder reenviarlo después
  if (sessionName) {
    const { getGlobalSessionManager } = await import('../../../sessionManager/global.js');
    const sessionManager = getGlobalSessionManager();
    if (sessionManager) {
      const sessionData = sessionManager.getSession(sessionName);
      if (sessionData) {
        sessionData.qrTargetPhone = targetPhoneNumber;
        logSession(sessionId, `💾 Número destino del QR guardado en sessionData: ${targetPhoneNumber || 'null (mismo número)'}`);
      }
    }
    
    // Guardar el mensaje original del cliente para poder responder cuando se conecte
    const { storePendingConfirmationMessage } = await import('../../../sessionManager/connectionConfirmation.js');
    const originalMsg = trialSession?.originalMessage || msg;
    storePendingConfirmationMessage(sessionName, originalMsg);
    logSession(sessionId, `💾 Mensaje original guardado para confirmación cuando se conecte: ${sessionName}`);
  }
  
  try {
    await sendQRImage(msg, sessionId, chatId, qrDataURL, targetPhoneNumber);
    logSession(sessionId, `✅ QR enviado exitosamente`);
  } catch (qrSendError) {
    logSession(sessionId, `❌ Error enviando QR: ${qrSendError?.message || qrSendError}`);
    // Si falla el envío del QR, NO eliminar la sesión, permitir reintentar
      const { trialSessions } = await import('../../../trialFlow/constants.js');
    const retryTrialSession = trialSessions.get(chatId);
    if (retryTrialSession) {
      delete retryTrialSession.data.qrPhoneNumberPending;
      delete retryTrialSession.data.isProcessing;
      retryTrialSession.step = TrialStep.QR_PHONE;
      logSession(sessionId, `🔄 Sesión de trial mantenida para permitir reintentar`);
      
      // Enviar mensaje de error con opciones para reintentar
      const { sendBotMessage } = await import('../../humanManager.js');
      await sendBotMessage(msg, sessionId, chatId, `❌ *Error al enviar el código QR*

No se pudo enviar el QR al número especificado.

💡 *Puedes intentar nuevamente:*
• Escribe otro número de teléfono
• O escribe "aquí" para recibirlo en este mismo número

💡 O escribe "cancelar" si quieres salir del proceso.`);
    }
  }
}
