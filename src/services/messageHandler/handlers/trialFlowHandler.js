// Handler para el flujo de prueba gratuita
// Responsabilidad única: Orquestar el flujo de trial y delegar a processors especializados
import { logSession } from '../../../utils/logger/index.js';
import { processPhoneValidation } from './trialFlowProcessors/phoneValidationProcessor.js';
import { processFlowCompletion } from './trialFlowProcessors/flowCompletionProcessor.js';
import { processQRDelivery } from './trialFlowProcessors/qrDeliveryProcessor.js';
import { processGenericHelp } from './trialFlowProcessors/helpProcessor.js';

/**
 * Maneja el flujo de prueba gratuita
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} texto - Texto del mensaje
 * @returns {Promise<boolean>} true si el mensaje fue procesado por el flujo
 */
export async function handleTrialFlow(msg, sessionId, chatId, texto) {
  const { isInTrialFlow, handleTrialStep } = await import('../../trialFlow/index.js');
  
  // Logging para debug
  const inTrial = isInTrialFlow(chatId);
  logSession(sessionId, `🔍 [TRIAL] Verificando si ${chatId} está en trial flow: ${inTrial}`);
  
  if (!inTrial) {
    // Verificar si hay alguna sesión de trial con diferentes claves
    const { trialSessions } = await import('../../trialFlow/constants.js');
    const allKeys = Array.from(trialSessions.keys());
    logSession(sessionId, `🔍 [TRIAL] Claves de trialSessions disponibles: ${allKeys.join(', ')}`);
    return false;
  }
  
  logSession(sessionId, `🎁 Usuario ${chatId} en modo prueba gratuita`);
  
  // Obtener el sessionManager global
  const { getGlobalSessionManager } = await import('../../sessionManager/global.js');
  const sessionManager = getGlobalSessionManager();
  
  // Guardar el mensaje original en la sesión de trial para poder responder cuando se conecte
  // Esto garantiza que la confirmación llegue al número correcto del cliente
  // También se usa para obtener el teléfono desde chat.name cuando se recopila el nombre
  const { trialSessions } = await import('../../trialFlow/constants.js');
  const trialSession = trialSessions.get(chatId);
  if (trialSession) {
    // Guardar en ambos lugares por compatibilidad
    if (!trialSession.data.originalMessage) {
      trialSession.data.originalMessage = msg;
    }
    if (!trialSession.originalMessage) {
      trialSession.originalMessage = msg;
    }
    logSession(sessionId, `💾 Mensaje original guardado en trialSession para confirmación futura y extracción de teléfono`);
  }
  
  const trialResult = await handleTrialStep(chatId, texto, sessionId, sessionManager);
  
  // Si el usuario está en un flujo activo, siempre debería haber una respuesta
  // Si no hay respuesta pero el usuario está en el flujo, es un error
  if (trialResult.response) {
    try {
      // Marcar ANTES de enviar para evitar que se detecte como acción humana
      const { sendBotMessage } = await import('../humanManager.js');
      await sendBotMessage(msg, sessionId, chatId, trialResult.response);
      logSession(sessionId, '✅ Respuesta de prueba gratuita enviada');
      
      // Si necesita validación del número de teléfono
      if (trialResult.needsValidation && trialResult.phoneToValidate) {
        logSession(sessionId, `🔍 Validando número de WhatsApp: ${trialResult.phoneToValidate}`);
        await processPhoneValidation(trialResult, msg, sessionId, chatId, trialSession, sessionManager);
        return true;
      }
      
      // Si se está procesando (después de ingresar el número de teléfono), continuar con el flujo completo
      if (trialResult.isProcessing) {
        await processFlowCompletion(msg, sessionId, chatId, trialSession, sessionManager);
        return true;
      }
      
      // Si necesita reenviar el QR (estado QR_SENT)
      if (trialResult.needsQRResend && trialResult.qrDataURL) {
        const targetPhoneNumber = trialResult.qrPhoneNumber || null;
        logSession(sessionId, `🔄 Reenviando QR a ${targetPhoneNumber || chatId}`);
        
        try {
          await processQRDelivery(
            msg,
            sessionId,
            chatId,
            trialResult.qrDataURL,
            targetPhoneNumber,
            trialResult.sessionName,
            trialSession
          );
        } catch (qrSendError) {
          logSession(sessionId, `❌ Error reenviando QR: ${qrSendError?.message || qrSendError}`);
          const { sendBotMessage } = await import('../humanManager.js');
          await sendBotMessage(msg, sessionId, chatId, '⚠️ *Error al reenviar el QR*\n\nPor favor, intenta nuevamente o contacta con soporte.');
        }
      }
      
      // Si se completó y tenemos el QR, enviarlo como imagen
      if (trialResult.completed && trialResult.qrDataURL && !trialResult.isSessionReady) {
        const targetPhoneNumber = trialResult.qrPhoneNumber || null;
        logSession(sessionId, `🔍 DEBUG - trialResult.qrPhoneNumber: ${trialResult.qrPhoneNumber || 'null/undefined'}`);
        logSession(sessionId, `🔍 DEBUG - targetPhoneNumber: ${targetPhoneNumber || 'null'}`);
        
        await processQRDelivery(
          msg,
          sessionId,
          chatId,
          trialResult.qrDataURL,
          targetPhoneNumber,
          trialResult.sessionName,
          trialSession
        );
      }
    } catch (err) {
      logSession(sessionId, `❌ Error enviando respuesta de prueba gratuita: ${err?.message || err}`);
    }
  } else {
    // Si no hay respuesta pero el usuario está en el flujo, enviar mensaje de ayuda genérico
    await processGenericHelp(msg, sessionId, chatId);
  }
  
  // IMPORTANTE: Si el usuario está en el flujo de trial, SIEMPRE retornar true
  // para evitar que el mensaje se procese como un mensaje normal
  return true; // El usuario está en el flujo de trial, el mensaje ya fue procesado
}

