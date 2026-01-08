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
  logSession(sessionId, `📨 Primer contacto detectado - Enviando mensaje de bienvenida`);
  
  try {
    // Verificar si es una sesión de cliente para enviar mensaje especial
    const { getSessionType } = await import('../../../services/database/sessionService.js');
    const sessionType = await getSessionType(sessionId);
    
    if (sessionType === 'client') {
      // Es una sesión de cliente - enviar mensaje de bienvenida especial
      const { getSessionByName } = await import('../../../services/database/sessionService.js');
      const session = await getSessionByName(sessionId);
      
      if (session?.client) {
        const { buildWelcomeMessage } = await import('../../../services/sessionManager/welcomeMessage.js');
        const clientWelcomeMessage = buildWelcomeMessage(session.client.name);
        
        // Marcar ANTES de enviar para evitar que se detecte como acción humana
        const { sendBotMessage } = await import('../humanManager.js');
        await sendBotMessage(msg, sessionId, chatId, clientWelcomeMessage);
        logSession(sessionId, `✅ Mensaje de bienvenida especial enviado al cliente ${session.client.name}`);
        
        // Marcar que ya se envió el mensaje de bienvenida
        markWelcomeSent(sessionId, chatId);
        return;
      }
    }
    
    // Para sesiones master o si no se encontró el cliente, usar el flujo estándar
    logSession(sessionId, `📨 Enviando mensaje de bienvenida estándar en 2 partes`);
    
    // Parte 1: Saludo e información
    const { sendBotMessage } = await import('../humanManager.js');
    const welcomePart1 = responses.welcome_part1 || responses.default;
    await sendBotMessage(msg, sessionId, chatId, welcomePart1);
    logSession(sessionId, '✅ Parte 1 del mensaje de bienvenida enviada');
    
    // Esperar antes de enviar la parte 2 (para que se vea como 2 mensajes separados)
    await new Promise(resolve => setTimeout(resolve, WELCOME_MESSAGE_DELAY));
    
    // Parte 2: Opciones
    const welcomePart2 = responses.welcome_part2 || '';
    if (welcomePart2) {
      await sendBotMessage(msg, sessionId, chatId, welcomePart2);
      logSession(sessionId, '✅ Parte 2 del mensaje de bienvenida enviada');
    }
    
    // Marcar que ya se envió el mensaje de bienvenida
    markWelcomeSent(sessionId, chatId);
  } catch (replyError) {
    logSession(sessionId, `❌ Error al enviar mensaje de bienvenida:`, replyError?.message || replyError, replyError?.stack);
  }
}

