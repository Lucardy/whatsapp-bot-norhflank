// Filtros de mensajes de WhatsApp
import { logSession } from '../../utils/logger/index.js';
import { getSessionReadyTime } from './index.js';
import { MAX_MESSAGE_AGE_MS } from '../../config/constants.js';

// Timestamp de cuando el bot inició (para ignorar mensajes antiguos)
let botStartTime = Date.now();

/**
 * Establece el tiempo de inicio del bot
 */
export function setBotStartTime() {
  botStartTime = Date.now();
}

/**
 * Filtra mensajes propios, de grupos y de estado
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @returns {boolean} true si el mensaje debe ser ignorado
 */
export function shouldIgnoreMessage(msg, sessionId) {
  // Filtrar mensajes propios
  if (msg.fromMe) {
    return true;
  }
  
  // Filtrar estados
  if (msg.from === 'status@broadcast') {
    return true;
  }
  
  // Filtrar grupos
  if (msg.from?.endsWith('@g.us')) {
    return true;
  }
  
  return false;
}

/**
 * Filtra mensajes sin contenido
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @returns {boolean} true si el mensaje debe ser ignorado
 */
export function shouldIgnoreEmptyMessage(msg, sessionId) {
  const texto = (msg.body || '').trim();
  if (!texto || texto.length === 0) {
    logSession(sessionId, '⏭️ Ignorado: mensaje sin contenido (body vacío)');
    return true;
  }
  return false;
}

/**
 * Filtra mensajes antiguos (sincronizados al conectar)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @returns {boolean} true si el mensaje debe ser ignorado
 */
export function shouldIgnoreOldMessage(msg, sessionId) {
  const messageTimestamp = msg.timestamp ? msg.timestamp * 1000 : null; // timestamp viene en segundos
  const sessionReadyTime = getSessionReadyTime(sessionId);
  
  // Si la sesión tiene un tiempo de conexión registrado, usar ese como referencia
  if (sessionReadyTime) {
    // Si el mensaje tiene timestamp y es anterior a cuando la sesión se conectó, ignorarlo
    if (messageTimestamp && messageTimestamp < sessionReadyTime) {
      const ageBeforeConnect = (sessionReadyTime - messageTimestamp) / 1000;
      logSession(sessionId, `⏭️ Ignorado: mensaje anterior a cuando la sesión se conectó (${Math.round(ageBeforeConnect)}s antes)`);
      return true;
    }
    
    // Si no tiene timestamp, solo procesar si la sesión lleva conectada más de 5 segundos
    // Esto previene procesar mensajes sincronizados inmediatamente después de conectar
    if (!messageTimestamp) {
      const sessionUptime = Date.now() - sessionReadyTime;
      if (sessionUptime < 5000) { // 5 segundos
        logSession(sessionId, `⏭️ Ignorado: mensaje sin timestamp recibido muy pronto después de conectar (${Math.round(sessionUptime / 1000)}s)`);
        return true;
      }
    }
  } else {
    // Si no hay tiempo de sesión registrado, usar el tiempo global del bot
    if (messageTimestamp) {
      const messageAge = Date.now() - messageTimestamp;
      
      if (messageAge > MAX_MESSAGE_AGE_MS) {
        logSession(sessionId, `⏭️ Ignorado: mensaje muy antiguo (${Math.round(messageAge / 1000)}s de antigüedad)`);
        return true;
      }
      
      if (messageTimestamp < botStartTime) {
        logSession(sessionId, '⏭️ Ignorado: mensaje anterior al inicio del bot');
        return true;
      }
    }
  }
  
  return false;
}

