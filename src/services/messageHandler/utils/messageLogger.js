// Utilidad para logging de mensajes
import { logSession } from '../../../utils/logger/index.js';

/**
 * Registra información inicial de un mensaje recibido
 * @param {string} sessionId - ID de la sesión
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {Object} messageData - Datos extraídos del mensaje (chatId, texto, timestamp, messageId)
 */
export function logIncomingMessage(sessionId, msg, messageData) {
  const { messageId, texto, timestamp } = messageData;
  
  logSession(sessionId, `📨 ========== MENSAJE RECIBIDO ==========`);
  logSession(sessionId, `📨 ID: ${messageId}`);
  logSession(sessionId, `📨 From: ${msg.from || 'unknown'}`);
  logSession(sessionId, `📨 Body: ${texto.substring(0, 100)}${texto.length > 100 ? '...' : ''}`);
  logSession(sessionId, `📨 FromMe: ${msg.fromMe}`);
  logSession(sessionId, `📨 IsGroup: ${msg.isGroup || false}`);
  logSession(sessionId, `📨 Timestamp: ${timestamp ? new Date(timestamp).toISOString() : 'unknown'}`);
}

