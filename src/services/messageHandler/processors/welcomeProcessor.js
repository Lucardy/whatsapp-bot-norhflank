// Procesador de mensajes de bienvenida
import { logSession } from '../../../utils/logger/index.js';
import { markWelcomeSent } from '../conversationState.js';
import { sendWelcomeMessage } from '../handlers/welcomeHandler.js';
import { markBotSentMessage } from '../humanManager.js';
import { BOT_MESSAGE_REGISTER_DELAY } from '../../../config/constants.js';

/**
 * Procesa mensajes de bienvenida y opciones inválidas
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} texto - Texto del mensaje
 * @param {string} sessionType - Tipo de sesión ('master' o 'client')
 * @param {number} clientId - ID del cliente
 * @param {string} clientName - Nombre del cliente
 * @param {Object} responses - Objeto con las respuestas disponibles
 * @param {boolean} isOptionValid - Si el mensaje es una opción válida
 * @param {boolean} welcomeSent - Si ya se envió el mensaje de bienvenida
 * @param {boolean} shouldResetState - Si se debe resetear el estado
 * @returns {Promise<boolean>} true si el mensaje fue procesado
 */
export async function processWelcomeAndInvalid(
  msg,
  sessionId,
  chatId,
  texto,
  sessionType,
  clientId,
  clientName,
  responses,
  isOptionValid,
  welcomeSent,
  shouldResetState
) {
  // Si NO es una opción válida y ya se envió el mensaje de bienvenida, mostrar mensaje de opción inválida
  if (!isOptionValid && welcomeSent) {
    // Verificar cooldown antes de enviar el mensaje de error
    const { canSendErrorMessage, recordErrorMessageSent } = await import('../utils/errorMessageCooldown.js');
    const canSend = canSendErrorMessage(sessionId, chatId, 'main');
    
    if (!canSend) {
      logSession(sessionId, `⏳ Mensaje no reconocido: "${texto}" - Cooldown activo, no se envía mensaje de error`);
      return true; // Procesado (pero no se envía mensaje)
    }
    
    logSession(sessionId, `⚠️ Mensaje no reconocido: "${texto}" - Enviando mensaje de opción inválida`);
    try {
      const { sendBotMessage } = await import('../humanManager.js');
      const invalidMessage = responses.invalid_option || responses.default;
      await sendBotMessage(msg, sessionId, chatId, invalidMessage);
      recordErrorMessageSent(sessionId, chatId, 'main');
      logSession(sessionId, '✅ Mensaje de opción inválida enviado');
    } catch (replyError) {
      logSession(sessionId, `❌ Error al enviar mensaje de opción inválida: ${replyError?.message || replyError}`);
    }
    return true; // Procesado
  }

  // Si NO es una opción válida y NO se ha enviado el mensaje de bienvenida
  if (!isOptionValid && !welcomeSent) {
    if (shouldResetState) {
      // El estado fue reseteado, así que este es un nuevo contacto - continuar con el flujo de bienvenida
      logSession(sessionId, `📨 Estado reseteado detectado - Continuando con envío de bienvenida`);
      // Continuar con el flujo de bienvenida más abajo (no hacer return aquí)
    } else {
      // No se reseteó el estado, pero el usuario escribió algo inválido
      // Mostrar mensaje de ayuda con las opciones disponibles
      logSession(sessionId, `💡 Usuario escribió algo inválido sin haber recibido bienvenida - Mostrando opciones disponibles`);
      try {
        await sendWelcomeMessage(msg, sessionId, chatId, responses);
        logSession(sessionId, '✅ Mensaje de bienvenida enviado como ayuda');
      } catch (replyError) {
        logSession(sessionId, `❌ Error al enviar mensaje de ayuda: ${replyError?.message || replyError}`);
      }
      return true; // Procesado
    }
  }

  // Si NO se ha enviado el mensaje de bienvenida y es el primer contacto, enviar bienvenida
  if (!welcomeSent) {
    // Si es una sesión master y el remitente es un cliente conocido, enviar mensaje especial
    if (sessionType === 'master' && clientId && clientName) {
      try {
        const { sendWelcomeMessageFromMaster } = await import('../../../services/sessionManager/welcomeMessage.js');
        const clientPhoneNumber = chatId;
        const sent = await sendWelcomeMessageFromMaster(msg, sessionId, clientPhoneNumber, clientId, clientName);
        if (sent) {
          markWelcomeSent(sessionId, chatId);
          logSession(sessionId, `✅ Mensaje de bienvenida especial enviado a cliente ${clientName}`);
          return true; // Procesado
        }
      } catch (welcomeError) {
        logSession(sessionId, `⚠️ Error enviando bienvenida especial: ${welcomeError?.message || welcomeError}`);
        // Continuar con el flujo normal de bienvenida
      }
    }
    
    // Flujo normal de bienvenida (para usuarios nuevos o si falló el especial)
    await sendWelcomeMessage(msg, sessionId, chatId, responses);
    return true; // Procesado
  }

  return false; // No procesado
}

