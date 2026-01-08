// Utilidad para extraer datos de un mensaje de WhatsApp
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
 * Intenta obtener el número real del contacto, no solo el chatId que puede ser un identificador largo
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión para logging (opcional)
 * @returns {Promise<string|null>} Número de teléfono real o null si no se puede obtener
 */
export async function extractRealPhoneNumber(msg, sessionId = null) {
  const { logSession } = await import('../../../utils/logger/index.js');
  const logger = sessionId ? (msg) => logSession(sessionId, msg) : () => {};
  
  try {
    // Primero intentar obtener el número desde msg.from (puede ser un número real o un identificador largo)
    const chatId = msg.fromMe 
      ? ((msg.to || msg.from || '').split('@')[0] || '')
      : ((msg.from || '').split('@')[0] || '');
    
    // Verificar si el chatId parece ser un número de teléfono válido
    // Un número de teléfono válido tiene entre 8 y 15 dígitos y solo contiene números
    const phoneRegex = /^[0-9]{8,15}$/;
    
    if (phoneRegex.test(chatId)) {
      logger(`📱 chatId parece ser un número válido: ${chatId}`);
      return chatId;
    }
    
    logger(`⚠️ chatId no parece ser un número válido (${chatId}), intentando obtener contacto...`);
    
    // Si el chatId no es un número válido, intentar obtener el contacto
    if (msg.getContact && typeof msg.getContact === 'function') {
      try {
        const contact = await msg.getContact();
        if (contact && contact.number) {
          const phoneNumber = contact.number.replace(/[^0-9]/g, ''); // Remover caracteres no numéricos
          if (phoneRegex.test(phoneNumber)) {
            logger(`✅ Número real obtenido del contacto: ${phoneNumber}`);
            return phoneNumber;
          }
        }
        
        // También intentar con contact.id
        if (contact && contact.id) {
          const contactId = contact.id.user || contact.id._serialized?.split('@')[0] || '';
          if (phoneRegex.test(contactId)) {
            logger(`✅ Número real obtenido del contact.id: ${contactId}`);
            return contactId;
          }
        }
      } catch (contactError) {
        logger(`⚠️ Error obteniendo contacto: ${contactError?.message || contactError}`);
      }
    }
    
    // Si no se pudo obtener el número real, retornar null
    logger(`⚠️ No se pudo obtener número real del contacto, usando chatId: ${chatId}`);
    return null;
  } catch (error) {
    logger(`❌ Error extrayendo número real: ${error?.message || error}`);
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

