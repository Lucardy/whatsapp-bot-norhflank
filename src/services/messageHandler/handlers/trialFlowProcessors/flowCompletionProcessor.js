// Processor para completación del flujo de trial
// Responsabilidad única: Manejar la completación del flujo (cliente nuevo vs existente)

import { logSession } from '../../../../utils/logger/index.js';
import { TrialStep } from '../../../trialFlow/constants.js';
import { processQRDelivery } from './qrDeliveryProcessor.js';

/**
 * Procesa la completación del flujo de trial
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {Object} trialSession - Sesión de trial actual
 * @param {Object} sessionManager - Instancia del SessionManager
 * @returns {Promise<void>}
 */
export async function processFlowCompletion(msg, sessionId, chatId, trialSession, sessionManager) {
  logSession(sessionId, '⏳ Continuando con procesamiento completo del flujo...');
  
  // Verificar si es cliente existente para usar la función correcta
  const isExistingClient = trialSession?.data?.isExistingClient || false;
  
  // Ejecutar el flujo completo de forma asíncrona
  (async () => {
    try {
      let completeResult;
      if (isExistingClient) {
        // Cliente existente: solo obtener QR y enviarlo
        const { completeExistingClientFlow } = await import('../../../trialFlow/completeExistingClientFlow.js');
        completeResult = await completeExistingClientFlow(chatId, sessionId, sessionManager);
      } else {
        // Cliente nuevo: crear cliente y obtener QR
        const { completeTrialFlow } = await import('../../../trialFlow/completeFlow.js');
        completeResult = await completeTrialFlow(chatId, sessionId, sessionManager);
      }
      
      // Enviar el mensaje completo
      if (completeResult.response) {
        const { sendBotMessage } = await import('../../humanManager.js');
        await sendBotMessage(msg, sessionId, chatId, completeResult.response);
        logSession(sessionId, '✅ Mensaje completo de bot casi listo enviado');
        
        // Si se completó y tenemos el QR, enviarlo como imagen
        if (completeResult.completed && completeResult.qrDataURL && !completeResult.isSessionReady) {
          await processQRDelivery(
            msg,
            sessionId,
            chatId,
            completeResult.qrDataURL,
            completeResult.qrPhoneNumber,
            completeResult.sessionName,
            trialSession
          );
        } else if (!completeResult.completed && completeResult.response) {
          // Si no se completó pero hay respuesta (error), ya se envió el mensaje
          // La sesión ya fue manejada en completeExistingClientFlow o completeTrialFlow
          logSession(sessionId, `⚠️ Flujo no completado, pero mensaje de error enviado`);
        }
      }
    } catch (processError) {
      logSession(sessionId, `❌ Error procesando flujo completo: ${processError?.message || processError}`);
      
      // NO eliminar la sesión de trial para permitir reintentar
      const { trialSessions } = await import('../../../trialFlow/constants.js');
      const retryTrialSession = trialSessions.get(chatId);
      if (retryTrialSession) {
        delete retryTrialSession.data.qrPhoneNumberPending;
        delete retryTrialSession.data.isProcessing;
        retryTrialSession.step = TrialStep.QR_PHONE;
        logSession(sessionId, `🔄 Sesión de trial mantenida para permitir reintentar`);
      }
      
      // Enviar mensaje de error al cliente con opciones para reintentar
      try {
        const { sendBotMessage } = await import('../../humanManager.js');
        await sendBotMessage(msg, sessionId, chatId, `❌ *Error al procesar tu solicitud*

Hubo un problema al generar o enviar el código QR.

💡 *Puedes intentar nuevamente:*
• Escribe otro número de teléfono
• O escribe "aquí" para recibirlo en este mismo número

💡 O escribe "cancelar" si quieres salir del proceso.`);
      } catch (err) {
        logSession(sessionId, `❌ Error enviando mensaje de error: ${err?.message || err}`);
      }
    }
  })();
}
