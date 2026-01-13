// Processor para validación asíncrona de números de teléfono en el flujo de trial
// Responsabilidad única: Manejar la validación asíncrona de números de WhatsApp

import { logSession } from '../../../../utils/logger/index.js';
import { TrialStep } from '../../../trialFlow/constants.js';

/**
 * Procesa la validación asíncrona de un número de teléfono
 * @param {Object} trialResult - Resultado del paso de trial que indica que necesita validación
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {Object} trialSession - Sesión de trial actual
 * @param {Object} sessionManager - Instancia del SessionManager
 * @returns {Promise<void>}
 */
export async function processPhoneValidation(trialResult, msg, sessionId, chatId, trialSession, sessionManager) {
  logSession(sessionId, `🔍 Validando número de WhatsApp: ${trialResult.phoneToValidate}`);
  
  // Validar el número de forma asíncrona
  (async () => {
    try {
      const { validateWhatsAppNumber } = await import('../../../trialFlow/phoneValidator.js');
      const validationResult = await validateWhatsAppNumber(trialResult.phoneToValidate, sessionId);
      
      if (validationResult.isValid) {
        // Número válido, guardarlo y continuar con el flujo
        const { trialSessions } = await import('../../../trialFlow/constants.js');
        const currentTrialSession = trialSessions.get(chatId);
        if (currentTrialSession && currentTrialSession.data.qrPhoneNumberPending) {
          currentTrialSession.data.qrPhoneNumber = currentTrialSession.data.qrPhoneNumberPending;
          delete currentTrialSession.data.qrPhoneNumberPending;
          currentTrialSession.data.isProcessing = true;
          logSession(sessionId, `✅ Número validado y guardado: ${currentTrialSession.data.qrPhoneNumber}`);
          
          // Continuar con el flujo completo usando el processor de completación
          const { processFlowCompletion } = await import('./flowCompletionProcessor.js');
          await processFlowCompletion(msg, sessionId, chatId, currentTrialSession, sessionManager);
          
          // También enviar el mensaje completo si hay resultado
          // Esto se maneja dentro de processFlowCompletion
        }
      } else {
        // Número no válido, pedir otro número
        logSession(sessionId, `❌ Número no válido: ${validationResult.error}`);
        const errorMessage = validationResult.error === 'Número no registrado en WhatsApp'
          ? '❌ *Número no registrado en WhatsApp*\n\nEste número no está registrado en WhatsApp. Por favor, verifica el número e intenta nuevamente.\n\n💡 *Ejemplo:* 5491169956253 (sin espacios ni guiones)\n💡 O escribe "aquí" para recibirlo en este mismo número\n\n💡 Escribe "cancelar" si quieres salir.'
          : '❌ *Error al validar el número*\n\nNo se pudo verificar si el número está registrado en WhatsApp. Por favor, intenta nuevamente.\n\n💡 *Ejemplo:* 5491169956253 (sin espacios ni guiones)\n💡 O escribe "aquí" para recibirlo en este mismo número\n\n💡 Escribe "cancelar" si quieres salir.';
        
        // Limpiar el número pendiente
        const { trialSessions } = await import('../../../trialFlow/constants.js');
        const currentTrialSession = trialSessions.get(chatId);
        if (currentTrialSession && currentTrialSession.data.qrPhoneNumberPending) {
          delete currentTrialSession.data.qrPhoneNumberPending;
        }
        
        const { sendBotMessage } = await import('../../humanManager.js');
        await sendBotMessage(msg, sessionId, chatId, errorMessage);
      }
    } catch (validationError) {
      logSession(sessionId, `❌ Error validando número: ${validationError?.message || validationError}`);
      // En caso de error, pedir otro número
      const errorMessage = '❌ *Error al validar el número*\n\nHubo un problema al verificar el número. Por favor, intenta nuevamente.\n\n💡 *Ejemplo:* 5491169956253 (sin espacios ni guiones)\n💡 O escribe "aquí" para recibirlo en este mismo número\n\n💡 Escribe "cancelar" si quieres salir.';
      
      // Limpiar el número pendiente
      const { trialSessions } = await import('../../../../trialFlow/constants.js');
      const currentTrialSession = trialSessions.get(chatId);
      if (currentTrialSession && currentTrialSession.data.qrPhoneNumberPending) {
        delete currentTrialSession.data.qrPhoneNumberPending;
      }
      
      const { sendBotMessage } = await import('../../humanManager.js');
      await sendBotMessage(msg, sessionId, chatId, errorMessage);
    }
  })();
}
