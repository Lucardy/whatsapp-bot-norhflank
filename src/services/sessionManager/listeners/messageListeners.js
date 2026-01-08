// Listeners para eventos de mensajes de WhatsApp
import { logSession } from '../../../utils/logger/index.js';
import { handleMessage, markChatAsHumanManaged } from '../../messageHandler/index.js';

/**
 * Configura los listeners para eventos de mensajes
 * @param {Object} client - Cliente de WhatsApp
 * @param {string} sessionId - ID de la sesión
 */
export function setupMessageListeners(client, sessionId) {
  // Listener: message_create (mensajes entrantes nuevos)
  logSession(sessionId, '📝 Registrando listener de mensajes...');
  logSession(sessionId, '🔔 Listener "message_create" será activado cuando el cliente esté ready');
  
  client.on('message_create', (msg) => handleMessage(msg, sessionId));
  
  // Listener: message (para detectar cuando el dueño envía mensajes)
  // Usar 'message' aquí porque necesitamos detectar TODOS los mensajes enviados, incluso los propios
  client.on('message', (msg) => {
    if (msg.fromMe) {
      // El dueño envió un mensaje, obtener el chat de destino
      // Cuando fromMe es true, msg.to contiene el destinatario (número del chat)
      // También puede estar en msg.from si es un mensaje de respuesta
      let chatId = '';
      if (msg.to) {
        chatId = msg.to.split('@')[0];
      } else if (msg.from && !msg.from.endsWith('@g.us') && msg.from !== 'status@broadcast') {
        // Si no hay msg.to, intentar con msg.from (puede ser el caso en algunos mensajes)
        chatId = msg.from.split('@')[0];
      }
      
      if (chatId && chatId.length > 0) {
        // markChatAsHumanManaged ahora verifica internamente si es un mensaje reciente del bot
        // y si está en modo administración (no pausa el bot en modo admin)
        markChatAsHumanManaged(sessionId, chatId).catch(err => {
          logSession(sessionId, `⚠️ Error marcando chat como manejado por humano: ${err?.message || err}`);
        });
      }
    }
  });
  
  // NO usar 'message' para procesar mensajes entrantes porque incluye mensajes antiguos sincronizados
  logSession(sessionId, '✅ Listener registrado en "message_create" (solo mensajes nuevos)');
  logSession(sessionId, '✅ Listener registrado en "message" para detectar mensajes del dueño');
}

