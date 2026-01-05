// Handler para el mensaje de bienvenida
import { logSession } from '../../../utils/logger/index.js';
import { markBotSentMessage } from '../humanManager.js';
import { markWelcomeSent } from '../conversationState.js';
import { WELCOME_MESSAGE_DELAY, BOT_MESSAGE_REGISTER_DELAY } from '../../../config/constants.js';

/**
 * Envía el mensaje de bienvenida en 2 partes
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {Object} responses - Objeto con las respuestas disponibles
 */
export async function sendWelcomeMessage(msg, sessionId, chatId, responses) {
  logSession(sessionId, `📨 Primer contacto detectado - Enviando mensaje de bienvenida en 2 partes`);
  
  try {
    // Parte 1: Saludo e información
    // Marcar ANTES de enviar para evitar que se detecte como acción humana
    markBotSentMessage(sessionId, chatId);
    // Pequeño delay para asegurar que el registro se procese antes del listener
    await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
    const welcomePart1 = responses.welcome_part1 || responses.default;
    await msg.reply(welcomePart1);
    logSession(sessionId, '✅ Parte 1 del mensaje de bienvenida enviada');
    
    // Esperar antes de enviar la parte 2 (para que se vea como 2 mensajes separados)
    await new Promise(resolve => setTimeout(resolve, WELCOME_MESSAGE_DELAY));
    
    // Parte 2: Opciones
    // Marcar ANTES de enviar para evitar que se detecte como acción humana
    markBotSentMessage(sessionId, chatId);
    // Pequeño delay para asegurar que el registro se procese antes del listener
    await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
    const welcomePart2 = responses.welcome_part2 || '';
    if (welcomePart2) {
      await msg.reply(welcomePart2);
      logSession(sessionId, '✅ Parte 2 del mensaje de bienvenida enviada');
    }
    
    // Marcar que ya se envió el mensaje de bienvenida
    markWelcomeSent(sessionId, chatId);
  } catch (replyError) {
    logSession(sessionId, `❌ Error al enviar mensaje de bienvenida:`, replyError?.message || replyError, replyError?.stack);
  }
}

