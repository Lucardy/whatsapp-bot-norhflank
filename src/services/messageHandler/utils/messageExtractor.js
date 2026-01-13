// Utilidad para extraer datos de un mensaje de WhatsApp
import { PHONE_VALIDATION_PATTERN } from '../../../config/constants.js';

/**
 * Extrae el chatId de un mensaje
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @returns {string} ID del chat
 */
export function extractChatId(msg) {
  // Para mensajes propios (fromMe), usar msg.to para obtener el chatId correcto
  // Para mensajes recibidos, usar msg.from
  return msg.fromMe 
    ? ((msg.to || msg.from || '').split('@')[0] || '')
    : ((msg.from || '').split('@')[0] || '');
}

/**
 * Extrae el número real de teléfono del contacto desde el mensaje
 * FORMA CORRECTA: Usa chat.name que contiene el número formateado (ej: "+54 9 2665 28-5510")
 * Este es el método que funciona correctamente, igual que phoneCapture.js
 * 
 * IMPORTANTE: chat.name contiene el número real del cliente cuando envía un mensaje
 * 
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión para logging (opcional)
 * @returns {Promise<string|null>} Número de teléfono real o null si no se puede obtener
 */
export async function extractRealPhoneNumber(msg, sessionId = null) {
  const { logSession } = await import('../../../utils/logger/index.js');
  const logger = sessionId ? (msg) => logSession(sessionId, msg) : () => {};
  
  try {
    // MÉTODO CORRECTO: Obtener el número desde chat.name (igual que phoneCapture.js)
    if (!msg.getChat || typeof msg.getChat !== 'function') {
      logger(`⚠️ msg.getChat no está disponible`);
      return null;
    }

    const chat = await msg.getChat();
    if (!chat || !chat.name) {
      logger(`⚠️ No se pudo obtener chat o chat.name desde el mensaje`);
      return null;
    }

    // Extraer el número real desde chat.name (ej: "+54 9 2665 28-5510" -> "5492665285510")
    const phoneNumber = chat.name.replace(/\D/g, ''); // Remover todo lo que no sea dígito
    
    // Validar que sea un número válido (8-15 dígitos)
    if (PHONE_VALIDATION_PATTERN.test(phoneNumber)) {
      logger(`✅ Número real obtenido desde chat.name: ${phoneNumber} (chat.name: ${chat.name})`);
      return phoneNumber;
    }

    // Si no es válido, chat.name no contiene un número válido
    logger(`⚠️ chat.name no contiene un número válido: ${chat.name}`);
    return null;
  } catch (error) {
    logger(`❌ Error extrayendo número real desde chat.name: ${error?.message || error}`);
    return null;
  }
}

/**
 * Extrae el texto del mensaje
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @returns {string} Texto del mensaje (trimmed)
 */
export function extractText(msg) {
  return (msg.body || '').trim();
}

/**
 * Extrae el timestamp del mensaje
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @returns {number|null} Timestamp en milisegundos o null
 */
export function extractTimestamp(msg) {
  return msg.timestamp ? msg.timestamp * 1000 : null;
}

/**
 * Extrae el ID del mensaje
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @returns {string} ID del mensaje
 */
export function extractMessageId(msg) {
  return msg.id?._serialized || msg.id || 'unknown';
}

/**
 * Extrae todos los datos relevantes de un mensaje
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @returns {Object} Objeto con chatId, texto, timestamp, messageId
 */
export function extractMessageData(msg) {
  return {
    chatId: extractChatId(msg),
    texto: extractText(msg),
    timestamp: extractTimestamp(msg),
    messageId: extractMessageId(msg)
  };
}

