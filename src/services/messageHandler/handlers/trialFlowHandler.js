// Handler para el flujo de prueba gratuita
import { logSession } from '../../../utils/logger/index.js';
import { sendQRImage } from './qrImageHandler.js';

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
  
  if (!isInTrialFlow(chatId)) {
    return false;
  }
  
  logSession(sessionId, `🎁 Usuario ${chatId} en modo prueba gratuita`);
  
  // Obtener el sessionManager global
  const { getGlobalSessionManager } = await import('../../sessionManager/global.js');
  const sessionManager = getGlobalSessionManager();
  
  // Guardar el mensaje original en la sesión de trial para poder responder cuando se conecte
  // Esto garantiza que la confirmación llegue al número correcto del cliente
  const { trialSessions } = await import('../../trialFlow/constants.js');
  const trialSession = trialSessions.get(chatId);
  if (trialSession && !trialSession.originalMessage) {
    trialSession.originalMessage = msg;
    logSession(sessionId, `💾 Mensaje original guardado en trialSession para confirmación futura`);
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
      
      // Si se está procesando (después de ingresar el número de teléfono), continuar con el flujo completo
      if (trialResult.isProcessing) {
        logSession(sessionId, '⏳ Continuando con procesamiento completo del flujo...');
        
        // Ejecutar el flujo completo de forma asíncrona
        (async () => {
          try {
            const { completeTrialFlow } = await import('../../trialFlow/completeFlow.js');
            const completeResult = await completeTrialFlow(chatId, sessionId, sessionManager);
            
            // Enviar el mensaje completo
            if (completeResult.response) {
              await sendBotMessage(msg, sessionId, chatId, completeResult.response);
              logSession(sessionId, '✅ Mensaje completo de bot casi listo enviado');
              
              // Si se completó y tenemos el QR, enviarlo como imagen
              if (completeResult.completed && completeResult.qrDataURL && !completeResult.isSessionReady) {
                const targetPhoneNumber = completeResult.qrPhoneNumber || null;
                if (targetPhoneNumber) {
                  logSession(sessionId, `📱 Enviando QR a número especificado: ${targetPhoneNumber}`);
                } else {
                  logSession(sessionId, `📱 Enviando QR al mismo número desde el que está hablando: ${chatId}`);
                }
                
                // Guardar el número destino del QR en sessionData para poder reenviarlo después
                if (completeResult.sessionName && sessionManager) {
                  const sessionData = sessionManager.getSession(completeResult.sessionName);
                  if (sessionData) {
                    sessionData.qrTargetPhone = targetPhoneNumber;
                    logSession(sessionId, `💾 Número destino del QR guardado en sessionData: ${targetPhoneNumber || 'null (mismo número)'}`);
                  }
                }
                
                // Guardar el mensaje original del cliente para poder responder cuando se conecte
                if (completeResult.sessionName) {
                  const { storePendingConfirmationMessage } = await import('../../sessionManager/connectionConfirmation.js');
                  const originalMsg = trialSession?.originalMessage || msg;
                  storePendingConfirmationMessage(completeResult.sessionName, originalMsg);
                  logSession(sessionId, `💾 Mensaje original guardado para confirmación cuando se conecte: ${completeResult.sessionName}`);
                }
                
                await sendQRImage(msg, sessionId, chatId, completeResult.qrDataURL, targetPhoneNumber);
              }
            }
          } catch (processError) {
            logSession(sessionId, `❌ Error procesando flujo completo: ${processError?.message || processError}`);
            // Enviar mensaje de error al cliente
            try {
              await sendBotMessage(msg, sessionId, chatId, '❌ Hubo un error al procesar tu solicitud. Por favor, intenta nuevamente o contacta con soporte.');
            } catch (err) {
              logSession(sessionId, `❌ Error enviando mensaje de error: ${err?.message || err}`);
            }
          }
        })();
        
        // Retornar inmediatamente después de enviar el mensaje de procesamiento
        return true;
      }
      
      // Si se completó y tenemos el QR, enviarlo como imagen
      if (trialResult.completed && trialResult.qrDataURL && !trialResult.isSessionReady) {
        // Si qrPhoneNumber es null, significa que se debe enviar al mismo número (chatId)
        // Si qrPhoneNumber tiene un valor, enviar a ese número específico
        const targetPhoneNumber = trialResult.qrPhoneNumber || null;
        logSession(sessionId, `🔍 DEBUG - trialResult.qrPhoneNumber: ${trialResult.qrPhoneNumber || 'null/undefined'}`);
        logSession(sessionId, `🔍 DEBUG - targetPhoneNumber: ${targetPhoneNumber || 'null'}`);
        
        if (targetPhoneNumber) {
          logSession(sessionId, `📱 Enviando QR a número especificado: ${targetPhoneNumber}`);
        } else {
          logSession(sessionId, `📱 Enviando QR al mismo número desde el que está hablando: ${chatId}`);
        }
        
        // Guardar el mensaje original del cliente para poder responder cuando se conecte
        // Usar el mensaje guardado en trialSession (cuando completó el nombre) o el mensaje actual
        if (trialResult.sessionName) {
          const { storePendingConfirmationMessage } = await import('../../sessionManager/connectionConfirmation.js');
          // Usar el mensaje original guardado en trialSession si existe, sino usar el mensaje actual
          const originalMsg = trialSession?.originalMessage || msg;
          storePendingConfirmationMessage(trialResult.sessionName, originalMsg);
          logSession(sessionId, `💾 Mensaje original guardado para confirmación cuando se conecte: ${trialResult.sessionName}`);
        }
        
        await sendQRImage(msg, sessionId, chatId, trialResult.qrDataURL, targetPhoneNumber);
      }
    } catch (err) {
      logSession(sessionId, `❌ Error enviando respuesta de prueba gratuita: ${err?.message || err}`);
    }
  } else {
    // Si no hay respuesta pero el usuario está en el flujo, enviar mensaje de ayuda genérico
    logSession(sessionId, `⚠️ Usuario en flujo trial pero no se devolvió respuesta - Enviando ayuda genérica`);
    try {
      const { getTrialStep } = await import('../../trialFlow/index.js');
      const currentStep = getTrialStep(chatId);
      let helpMessage = '🎁 *Prueba Gratuita*\n\n';
      
      if (currentStep === 'collecting_name') {
        helpMessage += '📝 Necesito tu nombre para continuar.\n\n💡 Escribe "cancelar" si quieres salir.';
      } else if (currentStep === 'collecting_email') {
        helpMessage += '📧 Tu email (opcional):\nPuedes saltar este paso escribiendo "saltar".\n\n💡 Escribe "cancelar" si quieres salir.';
      } else if (currentStep === 'collecting_qr_phone') {
        helpMessage += '📱 ¿A qué número quieres que te enviemos el código QR?\n\nPuede ser el número de un amigo, familiar, o cualquier otro teléfono donde puedas escanear el QR.\n\n💡 Ejemplo: 5491169956253 (sin espacios ni guiones)\n💡 O escribe *"aquí"* para recibirlo en este mismo número\n\n💡 Escribe "cancelar" si quieres salir.';
      } else {
        helpMessage += 'Por favor, envía la información solicitada o escribe "cancelar" para salir del proceso.';
      }
      
      await sendBotMessage(msg, sessionId, chatId, helpMessage);
      logSession(sessionId, '✅ Mensaje de ayuda genérico enviado');
    } catch (err) {
      logSession(sessionId, `❌ Error enviando mensaje de ayuda: ${err?.message || err}`);
    }
  }
  
  // IMPORTANTE: Si el usuario está en el flujo de trial, SIEMPRE retornar true
  // para evitar que el mensaje se procese como un mensaje normal
  return true; // El usuario está en el flujo de trial, el mensaje ya fue procesado
}

